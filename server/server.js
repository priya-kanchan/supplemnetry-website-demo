// Vitalyx store server: serves the website (public/), the admin dashboard (public/admin/)
// and the JSON API used by both.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { connectDb } from "./db.js";
import { loadSiteData, unitPrice, priceOrder } from "./catalog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
try { process.loadEnvFile(path.join(ROOT, ".env")); } catch { /* no .env file — use real env vars */ }

const PROD = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (PROD ? "" : "admin123");
const SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || (PROD ? "" : "dev-only-secret");

if (PROD && (!process.env.MONGODB_URI || !ADMIN_PASSWORD || SECRET.length < 32)) {
  console.error("Missing env vars. In production set MONGODB_URI, ADMIN_PASSWORD and JWT_SECRET (at least 32 characters).");
  process.exit(1);
}

const site = loadSiteData(path.join(PUBLIC, "js", "data.js"));
const CATEGORY_IDS = site.CATEGORIES.map(c => c.id);
const GOAL_IDS = site.GOALS.map(g => g.id);
const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];

const db = await connectDb(ROOT);
if (await db.count("products") === 0) {
  // First run on an empty MongoDB: bring over local data/db.json if there is one, else use the starter catalogue
  const local = await localData();
  if (local) {
    for (const c of ["products", "orders", "images"]) await db.insertMany(c, local[c] || []);
    console.log(`Copied local data to ${db.kind}: ${local.products.length} products, ${(local.orders || []).length} orders, ${(local.images || []).length} images`);
  } else {
    await db.insertMany("products", site.PRODUCTS.map(p => ({ ...p, active: true, image: "", createdAt: new Date().toISOString() })));
    console.log(`Seeded ${site.PRODUCTS.length} starter products`);
  }
}
async function localData() {
  if (!process.env.MONGODB_URI) return null;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "db.json"), "utf8"));
    return d.products?.length ? d : null;
  } catch { return null; }
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
  if (req.path.startsWith("/admin") || req.path.startsWith("/api/admin")) res.set({ "X-Frame-Options": "DENY", "X-Robots-Tag": "noindex" });
  next();
});

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = msg => new HttpError(400, msg);
const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const list = (v, max = 60) => (Array.isArray(v) ? v : String(v ?? "").split(",")).map(x => str(x, max)).filter(Boolean);
const int = (v, min, max, label) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${label} must be a whole number between ${min} and ${max}`);
  return n;
};
const hex = (v, d) => /^#[0-9a-f]{6}$/i.test(v) ? v : d;
const publicProduct = ({ createdAt, updatedAt, ...p }) => p;

function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(), key = req.ip;
    const h = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (h.length >= max) return res.status(429).json({ error: "Too many requests. Please try again later." });
    h.push(now); hits.set(key, h);
    if (hits.size > 5000) hits.clear();
    next();
  };
}

/* ---------- JWT authentication ----------
   Tokens are HS256 JWTs signed with JWT_SECRET, kept in httpOnly cookies (JavaScript can't read them)
   and also accepted as "Authorization: Bearer <token>". Admin and customer tokens use different
   audiences, so one can never be used as the other. Each token carries a fingerprint of the
   password, so changing a password logs out every old session. */
const JWT_OPTS = { algorithm: "HS256", issuer: "vitalyx" };
const AUD_ADMIN = "vitalyx-admin", AUD_CUSTOMER = "vitalyx-store";
const pwFingerprint = v => crypto.createHmac("sha256", SECRET).update("pw:" + v).digest("base64url").slice(0, 16);
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
function readCookie(req, name) {
  const m = (req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
}
function readToken(req, cookieName) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : readCookie(req, cookieName);
}
function verifyJwt(token, audience) {
  if (!token) return null;
  try { return jwt.verify(token, SECRET, { algorithms: ["HS256"], issuer: JWT_OPTS.issuer, audience }); }
  catch { return null; } // expired, tampered or wrong audience
}
const setCookie = (res, name, value, opts, maxAge) => res.append("Set-Cookie", `${name}=${value}; ${opts}; Max-Age=${maxAge}`);

// Admin
const COOKIE = "vx_admin";
const ADMIN_TTL = 24 * 3600; // 1 day
const cookieOpts = `Path=/api/admin; HttpOnly; SameSite=Strict${PROD ? "; Secure" : ""}`;
const makeAdminToken = () => jwt.sign({ role: "admin", pv: pwFingerprint(adminVersion()) }, SECRET, { ...JWT_OPTS, audience: AUD_ADMIN, subject: ADMIN_USER, expiresIn: ADMIN_TTL });
function isAdmin(req) {
  const p = verifyJwt(readToken(req, COOKIE), AUD_ADMIN);
  return !!p && p.role === "admin" && p.sub === ADMIN_USER && p.pv === pwFingerprint(adminVersion());
}

/* The admin password starts as ADMIN_PASSWORD from the environment. Once it is changed in the dashboard
   (or reset with ADMIN_RECOVERY_KEY) its hash is saved in the "settings" collection and used from then on. */
const RECOVERY_KEY = process.env.ADMIN_RECOVERY_KEY || "";
let adminHash = (await db.get("settings", "admin"))?.passwordHash || "";
const adminVersion = () => adminHash || ADMIN_PASSWORD;
const checkAdminPassword = pw => adminHash ? checkPassword(String(pw ?? ""), adminHash) : safeEqual(pw, ADMIN_PASSWORD);
async function setAdminPassword(pw) {
  const doc = { passwordHash: await hashPassword(pw), updatedAt: new Date().toISOString() };
  if (!await db.update("settings", "admin", doc)) await db.insert("settings", { id: "admin", ...doc });
  adminHash = doc.passwordHash;
}
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: "Please log in" });

/* ---------- customer accounts ---------- */
const USER_COOKIE = "vx_user";
const USER_TTL = 30 * 86400; // 30 days
const userCookieOpts = `Path=/; HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;
const makeUserToken = u => jwt.sign({ role: "customer", pv: pwFingerprint(u.passwordHash) }, SECRET, { ...JWT_OPTS, audience: AUD_CUSTOMER, subject: u.id, expiresIn: USER_TTL });
async function currentUser(req) {
  const p = verifyJwt(readToken(req, USER_COOKIE), AUD_CUSTOMER);
  if (!p || p.role !== "customer" || !p.sub) return null;
  const u = await db.get("customers", p.sub);
  return u && p.pv === pwFingerprint(u.passwordHash) ? u : null;
}
const publicUser = u => ({ name: u.name, email: u.email, phone: u.phone, address: u.address || "", mustChangePassword: !!u.mustChangePassword });
const setUserCookie = (res, u) => setCookie(res, USER_COOKIE, makeUserToken(u), userCookieOpts, USER_TTL);

const hashPassword = pw => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString("hex");
  crypto.scrypt(pw, salt, 64, (err, key) => err ? reject(err) : resolve(`${salt}:${key.toString("hex")}`));
});
const checkPassword = (pw, stored) => new Promise(resolve => {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return resolve(false);
  crypto.scrypt(pw, salt, 64, (err, key) => resolve(!err && crypto.timingSafeEqual(key, Buffer.from(hash, "hex"))));
});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const newPassword = (pw, min) => {
  pw = String(pw ?? "");
  if (pw.length < min || pw.length > 100) throw bad(`New password must be at least ${min} characters`);
  return pw;
};
// Easy-to-read temporary password (no 0/O, 1/l/I) that the admin can read out on a call
const TEMP_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const tempPassword = () => Array.from({ length: 10 }, () => TEMP_CHARS[crypto.randomInt(TEMP_CHARS.length)]).join("");

/* ---------- public API ---------- */
const smallJson = express.json({ limit: "20kb" });
const authLimit = rateLimit(20, 15 * 60e3);

app.post("/api/auth/signup", authLimit, smallJson, async (req, res) => {
  const b = req.body || {};
  const u = { name: str(b.name, 80), email: str(b.email, 120).toLowerCase(), phone: str(b.phone, 10) };
  const password = String(b.password ?? "");
  if (u.name.length < 2) throw bad("Please enter your name");
  if (!EMAIL_RE.test(u.email)) throw bad("Please enter a valid email");
  if (!PHONE_RE.test(u.phone)) throw bad("Please enter a valid 10-digit mobile number");
  if (password.length < 6 || password.length > 100) throw bad("Password must be at least 6 characters");
  if (await db.findOne("customers", "email", u.email)) throw bad("An account with this email already exists. Please log in.");
  const now = new Date().toISOString();
  const doc = { id: crypto.randomUUID(), ...u, address: "", passwordHash: await hashPassword(password), createdAt: now, updatedAt: now };
  await db.insert("customers", doc);
  setUserCookie(res, doc);
  res.status(201).json({ user: publicUser(doc) });
});

app.post("/api/auth/login", authLimit, smallJson, async (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase();
  const u = email && await db.findOne("customers", "email", email);
  if (!u || !await checkPassword(String(req.body?.password ?? ""), u.passwordHash)) {
    return res.status(401).json({ error: "Wrong email or password" });
  }
  setUserCookie(res, u);
  res.json({ user: publicUser(u) });
});

app.post("/api/auth/logout", (req, res) => {
  setCookie(res, USER_COOKIE, "", userCookieOpts, 0);
  res.json({ ok: true });
});

/* Forgot password: there is no email service, so the customer asks for a reset with their registered
   email + mobile. The request shows up in the dashboard; the admin confirms it's them on a call/WhatsApp
   and gives them a temporary password. The reply is the same whether or not the details match. */
app.post("/api/auth/forgot", authLimit, smallJson, async (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase(), phone = str(req.body?.phone, 10);
  if (!EMAIL_RE.test(email)) throw bad("Please enter a valid email");
  if (!PHONE_RE.test(phone)) throw bad("Please enter a valid 10-digit mobile number");
  const u = await db.findOne("customers", "email", email);
  if (u && u.phone === phone) await db.update("customers", u.id, { resetRequestedAt: new Date().toISOString() });
  res.json({ ok: true });
});

app.post("/api/auth/password", authLimit, smallJson, async (req, res) => {
  const u = await currentUser(req);
  if (!u) return res.status(401).json({ error: "Please log in again" });
  if (!await checkPassword(String(req.body?.currentPassword ?? ""), u.passwordHash)) throw bad("Your current password is wrong");
  const pw = newPassword(req.body?.newPassword, 6);
  const doc = await db.update("customers", u.id, { passwordHash: await hashPassword(pw), mustChangePassword: false, updatedAt: new Date().toISOString() });
  setUserCookie(res, doc); // the old password's sessions on other devices stop working
  res.json({ user: publicUser(doc) });
});

app.get("/api/auth/me", async (req, res) => {
  const u = await currentUser(req);
  res.set("Cache-Control", "no-store");
  res.json({ user: u ? publicUser(u) : null });
});

// Orders of the logged-in customer (for tracking)
app.get("/api/my/orders", async (req, res) => {
  const u = await currentUser(req);
  if (!u) return res.status(401).json({ error: "Please log in to see your orders" });
  const orders = await db.where("orders", "customerId", u.id);
  res.set("Cache-Control", "no-store");
  res.json(orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ note, customerId, ...o }) => o));
});

app.get("/api/products", async (req, res) => {
  const all = await db.all("products");
  res.set("Cache-Control", "no-cache");
  res.json(all.filter(p => p.active !== false).sort((a, b) => a.id - b.id).map(publicProduct));
});

app.get("/api/images/:id", async (req, res) => {
  const img = await db.get("images", req.params.id);
  if (!img) return res.status(404).end();
  res.set({ "Content-Type": img.type, "Cache-Control": "public, max-age=31536000, immutable" });
  res.send(Buffer.from(img.data, "base64"));
});

// Validate the cart/booking and price it on the server (never trust prices from the browser)
async function buildOrder(req) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "Please log in to place an order");
  const b = req.body || {}, c = b.customer || {};
  const customer = { name: str(c.name, 80), email: user.email, phone: str(c.phone, 10), address: str(c.address, 500) };
  if (customer.name.length < 2) throw bad("Please enter your name");
  if (!PHONE_RE.test(customer.phone)) throw bad("Please enter a valid 10-digit mobile number");
  if (customer.address.length < 10) throw bad("Please enter your full address");
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) throw bad("Your order has no products");

  const products = new Map((await db.all("products")).map(p => [p.id, p]));
  const items = b.items.map(it => {
    const p = products.get(Number(it.id));
    if (!p || p.active === false) throw bad("A product in your order is no longer available");
    const size = p.sizes.includes(it.size) ? it.size : p.sizes[0];
    const flavour = p.flavours.includes(it.flavour) ? it.flavour : p.flavours[0];
    const qty = int(it.qty, 1, 10, "Quantity");
    const price = unitPrice(p, size);
    return { productId: p.id, name: p.name, brand: p.brand, size, flavour, qty, unitPrice: price, lineTotal: price * qty };
  });
  return { user, customer, items, pricing: priceOrder(items, str(b.coupon, 20).toUpperCase()), source: b.source === "cart" ? "cart" : "book" };
}

/* Demo UPI payment. The QR holds plain text (no real UPI ID), so scanning it can never send money anywhere.
   The quote is a short-lived signed JWT tying the payment to this customer and this exact amount. */
const PAYMENT_METHODS = { cod: "Cash on Delivery", upi: "UPI" };
const AUD_PAY = "vitalyx-pay";
const PAY_TTL = 15 * 60;

app.post("/api/orders/quote", rateLimit(60, 60 * 60e3), smallJson, async (req, res) => {
  const { user, pricing } = await buildOrder(req);
  const ref = "PAY" + crypto.randomBytes(5).toString("hex").toUpperCase();
  const payToken = jwt.sign({ total: pricing.total, ref }, SECRET, { ...JWT_OPTS, audience: AUD_PAY, subject: user.id, expiresIn: PAY_TTL });
  const qrText = `DEMO UPI PAYMENT - Vitalyx\nAmount: Rs ${pricing.total}\nRef: ${ref}\nTest QR only - no money will be charged.`;
  const qrSvg = await QRCode.toString(qrText, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1b1f23", light: "#ffffff" } });
  res.json({ ...pricing, ref, payToken, qrSvg, expiresIn: PAY_TTL });
});

app.post("/api/orders", rateLimit(20, 60 * 60e3), smallJson, async (req, res) => {
  const { user, customer, items, pricing, source } = await buildOrder(req);
  const method = req.body.payment?.method;
  if (!PAYMENT_METHODS[method]) throw bad("Please choose a payment method");
  const now = new Date();
  let payment = { method, status: "pending", txnId: "", ref: "", paidAt: "" };
  if (method === "upi") {
    const p = verifyJwt(str(req.body.payment.payToken, 2000), AUD_PAY);
    if (!p || p.sub !== user.id) throw bad("Your payment session expired. Please pay again.");
    if (p.total !== pricing.total) throw bad("Your order total changed. Please pay again.");
    if (await db.findOne("orders", "payRef", p.ref)) throw bad("This payment was already used for an order.");
    payment = { method, status: "paid", txnId: "DEMO" + crypto.randomInt(1e11, 1e12 - 1), ref: p.ref, paidAt: now.toISOString(), demo: true };
  }
  const order = {
    id: crypto.randomUUID(),
    orderNo: "VX" + now.toISOString().slice(2, 10).replace(/-/g, "") + crypto.randomInt(1000, 9999),
    source, customerId: user.id, customer, items,
    ...pricing,
    payment, ...(payment.ref ? { payRef: payment.ref } : {}),
    status: "new", note: "",
    history: [{ status: "new", at: now.toISOString() }],
    createdAt: now.toISOString(), updatedAt: now.toISOString()
  };
  await db.insert("orders", order);
  // Remember the latest delivery address for next time
  await db.update("customers", user.id, { address: customer.address, updatedAt: now.toISOString() });
  res.status(201).json({ orderNo: order.orderNo, total: order.total, payment: { method, status: payment.status, txnId: payment.txnId } });
});

/* ---------- admin API ---------- */
app.post("/api/admin/login", rateLimit(10, 15 * 60e3), smallJson, async (req, res) => {
  const { username, password } = req.body || {};
  const passOk = await checkAdminPassword(password);
  if (!safeEqual(username, ADMIN_USER) || !passOk) {
    return res.status(401).json({ error: "Wrong username or password" });
  }
  setCookie(res, COOKIE, makeAdminToken(), cookieOpts, ADMIN_TTL);
  res.json({ ok: true, user: ADMIN_USER });
});
// Forgot password: reset with the secret ADMIN_RECOVERY_KEY kept in .env / Render environment
app.post("/api/admin/reset-password", rateLimit(5, 15 * 60e3), smallJson, async (req, res) => {
  if (!RECOVERY_KEY) throw bad("Password reset is not set up. Add ADMIN_RECOVERY_KEY to the server environment first.");
  const { username, recoveryKey } = req.body || {};
  if (!safeEqual(username, ADMIN_USER) || !safeEqual(recoveryKey, RECOVERY_KEY)) {
    return res.status(401).json({ error: "Wrong username or recovery key" });
  }
  await setAdminPassword(newPassword(req.body.newPassword, 8));
  res.json({ ok: true });
});
app.post("/api/admin/password", requireAdmin, smallJson, async (req, res) => {
  if (!await checkAdminPassword(req.body?.currentPassword)) throw bad("Your current password is wrong");
  await setAdminPassword(newPassword(req.body?.newPassword, 8));
  setCookie(res, COOKIE, makeAdminToken(), cookieOpts, ADMIN_TTL); // every other admin session is logged out
  res.json({ ok: true });
});
app.post("/api/admin/logout", (req, res) => {
  setCookie(res, COOKIE, "", cookieOpts, 0);
  res.json({ ok: true });
});
app.get("/api/admin/me", requireAdmin, async (req, res) => res.json({ user: ADMIN_USER, storage: db.kind, customers: await db.count("customers") }));

app.use("/api/admin", requireAdmin);

// Orders
app.get("/api/admin/orders", async (req, res) => {
  const orders = await db.all("orders");
  res.json(orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});
app.patch("/api/admin/orders/:id", smallJson, async (req, res) => {
  const patch = { updatedAt: new Date().toISOString() };
  const old = await db.get("orders", req.params.id);
  if (!old) throw new HttpError(404, "Order not found");
  if (req.body.status !== undefined) {
    if (!ORDER_STATUSES.includes(req.body.status)) throw bad("Unknown status");
    patch.status = req.body.status;
    if (old.status !== patch.status) patch.history = [...(old.history || [{ status: old.status, at: old.createdAt }]), { status: patch.status, at: patch.updatedAt }];
  }
  if (req.body.note !== undefined) patch.note = str(req.body.note, 1000);
  if (req.body.paymentStatus !== undefined) {
    if (!["pending", "paid", "refunded"].includes(req.body.paymentStatus)) throw bad("Unknown payment status");
    const pay = old.payment || { method: "cod", txnId: "", ref: "" };
    patch.payment = { ...pay, status: req.body.paymentStatus, paidAt: req.body.paymentStatus === "paid" ? (pay.paidAt || patch.updatedAt) : pay.paidAt || "" };
  }
  const o = await db.update("orders", req.params.id, patch);
  if (!o) throw new HttpError(404, "Order not found");
  res.json(o);
});
app.delete("/api/admin/orders/:id", async (req, res) => {
  if (!await db.remove("orders", req.params.id)) throw new HttpError(404, "Order not found");
  res.json({ ok: true });
});

// Customers
app.get("/api/admin/customers", async (req, res) => {
  const [customers, orders] = await Promise.all([db.all("customers"), db.all("orders")]);
  const count = {};
  for (const o of orders) count[o.customerId] = (count[o.customerId] || 0) + 1;
  res.json(customers.sort((a, b) => (b.resetRequestedAt || "").localeCompare(a.resetRequestedAt || "") || b.createdAt.localeCompare(a.createdAt))
    .map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt, orders: count[u.id] || 0, resetRequestedAt: u.resetRequestedAt || "", mustChangePassword: !!u.mustChangePassword })));
});
app.post("/api/admin/customers/:id/reset-password", async (req, res) => {
  const pw = tempPassword();
  const u = await db.update("customers", req.params.id, { passwordHash: await hashPassword(pw), mustChangePassword: true, resetRequestedAt: "", updatedAt: new Date().toISOString() });
  if (!u) throw new HttpError(404, "Customer not found");
  res.json({ tempPassword: pw });
});

// Products
function cleanProduct(b) {
  const p = {
    name: str(b.name, 120), brand: str(b.brand, 60), category: str(b.category, 30),
    goals: list(b.goals).filter(g => GOAL_IDS.includes(g)),
    price: int(b.price, 1, 1e7, "Price"), mrp: int(b.mrp, 1, 1e7, "MRP"),
    rating: Math.min(5, Math.max(0, Math.round(Number(b.rating) * 10) / 10 || 0)),
    reviews: int(b.reviews || 0, 0, 1e8, "Reviews"),
    color: hex(b.color, "#0b6e4f"), accent: hex(b.accent, "#e6f4ee"), badge: str(b.badge, 30),
    sizes: list(b.sizes), flavours: list(b.flavours),
    protein: str(b.protein, 20) || "—", servings: int(b.servings || 0, 0, 10000, "Servings"),
    desc: str(b.desc, 3000),
    highlights: (Array.isArray(b.highlights) ? b.highlights : String(b.highlights ?? "").split("\n")).map(x => str(x, 150)).filter(Boolean).slice(0, 10),
    image: /^\/api\/images\/[\w-]+$/.test(b.image || "") ? b.image : "",
    active: b.active !== false
  };
  if (!p.name) throw bad("Product name is required");
  if (!p.brand) throw bad("Brand is required");
  if (!CATEGORY_IDS.includes(p.category)) throw bad("Please choose a category");
  if (p.mrp < p.price) throw bad("MRP cannot be lower than the selling price");
  if (!p.sizes.length) throw bad("Add at least one size / weight");
  if (!p.flavours.length) p.flavours = ["—"];
  return p;
}
const dropImage = async url => { if (url?.startsWith("/api/images/")) await db.remove("images", url.split("/").pop()); };

app.get("/api/admin/products", async (req, res) => {
  res.json((await db.all("products")).sort((a, b) => a.id - b.id));
});
app.post("/api/admin/products", smallJson, async (req, res) => {
  const p = cleanProduct(req.body || {});
  const all = await db.all("products");
  const now = new Date().toISOString();
  const doc = { id: all.reduce((m, x) => Math.max(m, x.id), 0) + 1, ...p, createdAt: now, updatedAt: now };
  await db.insert("products", doc);
  res.status(201).json(doc);
});
app.put("/api/admin/products/:id", smallJson, async (req, res) => {
  const id = Number(req.params.id);
  const old = await db.get("products", id);
  if (!old) throw new HttpError(404, "Product not found");
  const p = cleanProduct(req.body || {});
  const doc = await db.update("products", id, { ...p, updatedAt: new Date().toISOString() });
  if (old.image && old.image !== p.image) await dropImage(old.image);
  res.json(doc);
});
app.delete("/api/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const old = await db.get("products", id);
  if (!old || !await db.remove("products", id)) throw new HttpError(404, "Product not found");
  await dropImage(old.image);
  res.json({ ok: true });
});

// Product images (stored in the database so they survive Render restarts)
app.post("/api/admin/images", express.json({ limit: "3mb" }), async (req, res) => {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(req.body?.dataUrl || "");
  if (!m) throw bad("Please upload a JPG, PNG or WebP image");
  if (Buffer.byteLength(m[2], "base64") > 1.5 * 1024 * 1024) throw bad("Image is too large (max 1.5 MB)");
  const id = crypto.randomUUID();
  await db.insert("images", { id, type: m[1], data: m[2], createdAt: new Date().toISOString() });
  res.status(201).json({ url: `/api/images/${id}` });
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

/* ---------- website + dashboard ---------- */
app.use(express.static(PUBLIC, { extensions: ["html"] }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, "index.html")));

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Upload is too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request" });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, () => {
  console.log(`Vitalyx running on http://localhost:${PORT}  (dashboard: /admin)`);
  console.log(`Storage: ${db.kind}`);
  if (!PROD && !process.env.ADMIN_PASSWORD) console.log("Dev admin login: admin / admin123");
});
