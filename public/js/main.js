/* ===== Helpers ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const inr = n => "₹" + Number(n).toLocaleString("en-IN");
const off = p => Math.round((1 - p.price / p.mrp) * 100);
// Bigger packs cost more — same rule the product page uses for its price
const sizeMul = (p, size) => 1 + Math.max(0, p.sizes.indexOf(size)) * 0.85;
const unitPrice = (p, size) => Math.round(p.price * sizeMul(p, size));
const unitMrp = (p, size) => Math.round(p.mrp * sizeMul(p, size));
const catName =id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
const params = new URLSearchParams(location.search);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ===== Product artwork (SVG tub / bottle) ===== */
function productArt(p, size = 220) {
  if (p.image) return `<img src="${API_BASE}${p.image}" width="${size}" height="${size}" alt="${p.name}" loading="lazy" style="object-fit:contain">`;
  const shortName = p.name.split(" ").slice(0, 3).join(" ");
  const isBottle = ["vitamins", "omega", "ayurveda", "weight"].includes(p.category);
  const brand = p.brand.toUpperCase();
  if (isBottle) {
    return `<svg viewBox="0 0 200 220" width="${size}" height="${size}" role="img" aria-label="${p.name}">
      <ellipse cx="100" cy="208" rx="58" ry="7" fill="#000" opacity=".08"/>
      <rect x="70" y="18" width="60" height="26" rx="5" fill="#222"/>
      <rect x="64" y="40" width="72" height="12" rx="4" fill="#333"/>
      <path d="M52 64 Q52 50 66 50 H134 Q148 50 148 64 V196 Q148 206 138 206 H62 Q52 206 52 196 Z" fill="${p.color}"/>
      <rect x="52" y="92" width="96" height="84" fill="${p.accent}"/>
      <text x="100" y="80" text-anchor="middle" font-family="Poppins,sans-serif" font-size="9" font-weight="700" fill="#fff" letter-spacing="1">${brand}</text>
      <text x="100" y="122" text-anchor="middle" font-family="Poppins,sans-serif" font-size="10.5" font-weight="700" fill="${p.color}">${wrap(shortName)[0]}</text>
      <text x="100" y="136" text-anchor="middle" font-family="Poppins,sans-serif" font-size="10.5" font-weight="700" fill="${p.color}">${wrap(shortName)[1] || ""}</text>
      <text x="100" y="162" text-anchor="middle" font-family="Poppins,sans-serif" font-size="8" fill="#333">${p.sizes[0]}</text>
      <path d="M60 60 V196" stroke="#fff" stroke-opacity=".25" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 200 220" width="${size}" height="${size}" role="img" aria-label="${p.name}">
    <ellipse cx="100" cy="210" rx="72" ry="8" fill="#000" opacity=".08"/>
    <rect x="34" y="22" width="132" height="30" rx="8" fill="#1d1d1d"/>
    <rect x="34" y="44" width="132" height="6" fill="#000" opacity=".25"/>
    <path d="M30 56 H170 L164 200 Q163 208 154 208 H46 Q37 208 36 200 Z" fill="${p.color}"/>
    <rect x="34" y="92" width="132" height="76" fill="${p.accent}"/>
    <text x="100" y="78" text-anchor="middle" font-family="Poppins,sans-serif" font-size="11" font-weight="700" fill="#fff" letter-spacing="1.5">${brand}</text>
    <text x="100" y="120" text-anchor="middle" font-family="Poppins,sans-serif" font-size="13" font-weight="800" fill="${p.color}">${wrap(shortName)[0]}</text>
    <text x="100" y="137" text-anchor="middle" font-family="Poppins,sans-serif" font-size="13" font-weight="800" fill="${p.color}">${wrap(shortName)[1] || ""}</text>
    <text x="100" y="157" text-anchor="middle" font-family="Poppins,sans-serif" font-size="9" fill="#333">${p.protein !== "—" ? p.protein + " PROTEIN · " : ""}${p.sizes[0]}</text>
    <text x="100" y="190" text-anchor="middle" font-family="Poppins,sans-serif" font-size="8" fill="#fff" opacity=".85">${(p.flavours[0] || "").toUpperCase()}</text>
    <path d="M44 60 L50 198" stroke="#fff" stroke-opacity=".2" stroke-width="7" stroke-linecap="round"/>
  </svg>`;
}
function wrap(t) {
  const w = t.split(" ");
  if (t.length <= 14 || w.length === 1) return [t];
  let a = "", i = 0;
  while (i < w.length && (a + " " + w[i]).trim().length <= 14) a = (a + " " + w[i++]).trim();
  return [a, w.slice(i).join(" ")];
}

const stars = r => {
  const full = Math.round(r);
  return `<span class="stars" aria-label="${r} out of 5">${"★".repeat(full)}${"☆".repeat(5 - full)}</span>`;
};

/* ===== Product card ===== */
function productCard(p) {
  const wished = getWish().includes(p.id);
  return `<article class="card product-card">
    ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
    <button class="wish ${wished ? "on" : ""}" data-wish="${p.id}" aria-label="Add to wishlist">${wished ? "♥" : "♡"}</button>
    <a href="product.html?id=${p.id}" class="pc-img" style="--tint:${p.accent}">${productArt(p, 170)}</a>
    <div class="pc-body">
      <div class="pc-brand">${p.brand} <span class="verified" title="100% authentic, sourced direct from the brand">✔ Verified</span></div>
      <a href="product.html?id=${p.id}" class="pc-name">${p.name}</a>
      <div class="pc-meta">${p.sizes[0]}${p.flavours[0] !== "—" ? " · " + p.flavours[0] : ""}</div>
      <div class="pc-rating"><b>${p.rating} ★</b> <span>(${p.reviews.toLocaleString("en-IN")})</span></div>
      <div class="pc-price"><b>${inr(p.price)}</b> <s>${inr(p.mrp)}</s> <em>${off(p)}% off</em></div>
      <div class="pc-loyalty">Earn ${inr(Math.round(p.price * 0.05))} VitaCash</div>
      <div class="pc-actions">
        <button class="btn btn-ghost" data-add="${p.id}">Add to Cart</button>
        <button class="btn btn-primary" data-book="${p.id}">Book Now</button>
      </div>
    </div>
  </article>`;
}

/* ===== Cart & wishlist ===== */
const getCart = () => store.get("vx_cart", []);
const setCart = c => { store.set("vx_cart", c); updateCartCount(); };
const getWish = () => store.get("vx_wish", []);

function addToCart(id, qty = 1, size, flavour) {
  const p = PRODUCTS.find(x => x.id === id);
  size = size || p.sizes[0]; flavour = flavour || p.flavours[0];
  const cart = getCart();
  const line = cart.find(l => l.id === id && l.size === size && l.flavour === flavour);
  if (line) line.qty += qty; else cart.push({ id, qty, size, flavour });
  setCart(cart);
  toast(`Added <b>${p.name}</b> to your cart`);
}
function updateCartCount() {
  const n = getCart().reduce((a, l) => a + l.qty, 0);
  $$(".cart-count").forEach(el => { el.textContent = n; el.hidden = n === 0; });
}
function toggleWish(id) {
  let w = getWish();
  w = w.includes(id) ? w.filter(x => x !== id) : [...w, id];
  store.set("vx_wish", w);
  $$(`[data-wish="${id}"]`).forEach(b => { const on = w.includes(id); b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡"; });
  toast(w.includes(id) ? "Saved to wishlist" : "Removed from wishlist");
}

function toast(html) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.innerHTML = html; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ===== Order form: "Book Now" (single product) & cart checkout — sends the order to WhatsApp ===== */
function leadModal() {
  let m = $("#leadModal");
  if (m) return m;
  m = document.createElement("div");
  m.id = "leadModal"; m.className = "modal";
  m.innerHTML = `<div class="modal-box card" role="dialog" aria-modal="true" aria-labelledby="leadTitle">
    <button class="modal-x" data-close aria-label="Close">✕</button>
    <div id="leadStep">
      <h3 id="leadTitle"></h3>
      <p class="modal-sub">Fill in your details and our team will call you to confirm your order.</p>
      <form id="leadForm" class="lead-form">
        <div id="leadItems" class="lead-items"></div>
        <label>Name<input name="name" required autocomplete="name" placeholder="Your full name"></label>
        <label>Email <small class="muted">(from your account)</small><input name="email" type="email" readonly tabindex="-1"></label>
        <label>Mobile Number<input name="phone" type="tel" required autocomplete="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile number" title="Enter a valid 10-digit mobile number"></label>
        <label>Address<textarea name="address" required rows="3" autocomplete="street-address" placeholder="House no, street, city, pincode"></textarea></label>
        <fieldset id="bookFields" class="lead-book">
          <label>Product<select name="product" required>${PRODUCTS.map(x => `<option value="${x.id}">${x.brand} ${x.name} — ${inr(x.price)}</option>`).join("")}</select></label>
          <div class="lead-variant">
            <label>Size / Weight<select name="size" required></select></label>
            <label id="flavourField">Flavour<select name="flavour" required></select></label>
          </div>
          <div class="lead-qty">
            <label>Quantity
              <span class="qty-box"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><input name="qty" type="number" min="1" max="10" value="1" required><button type="button" data-q="1" aria-label="Increase quantity">+</button></span>
            </label>
            <div class="lead-total">Total<b id="leadTotal"></b><small>Free delivery above ₹999</small></div>
          </div>
        </fieldset>
        <fieldset class="pay-methods">
          <legend>Payment method</legend>
          <label class="pay-opt"><input type="radio" name="payMethod" value="cod" checked><span><b>💵 Cash on Delivery</b><small>Pay in cash when your order arrives</small></span></label>
          <label class="pay-opt"><input type="radio" name="payMethod" value="upi"><span><b>📱 UPI — pay now</b><small>Scan a QR with GPay, PhonePe, Paytm or any UPI app</small></span></label>
        </fieldset>
        <p id="leadError" class="lead-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Place Order</button>
      </form>
    </div>
    <div id="payStep" class="pay-step" hidden>
      <h3>Pay with UPI</h3>
      <p class="modal-sub">Scan the QR with any UPI app and pay the amount below.</p>
      <div class="pay-amount">Amount to pay<b id="payAmount"></b><small id="payBreakup"></small></div>
      <div class="pay-qr" id="payQr"></div>
      <div class="pay-apps"><span>GPay</span><span>PhonePe</span><span>Paytm</span><span>BHIM</span></div>
      <p class="pay-demo">🧪 Demo QR — no real money is charged. Tap <b>I have paid</b> to complete the test payment.</p>
      <p class="pay-timer" id="payTimer"></p>
      <p id="payError" class="lead-error" role="alert" hidden></p>
      <button class="btn btn-primary btn-block btn-lg" id="payDone" type="button">✅ I have paid</button>
      <button class="btn btn-ghost btn-block" id="payBack" type="button">← Change payment method</button>
    </div>
    <div id="thanksStep" class="thanks" hidden>
      <div class="thanks-ic">✅</div>
      <h3>Thank you!</h3>
      <p id="thanksOrder" class="thanks-order"></p>
      <p id="thanksPay" class="thanks-pay"></p>
      <p>Your order has been received. Our team will contact you shortly to confirm it.</p>
      <a class="btn btn-ghost" href="account.html#orders" style="margin-bottom:10px">📦 Track your order</a>
      <button class="btn btn-primary" data-close>Continue Shopping</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  const qtyIn = $("[name=qty]", m);
  m.addEventListener("click", e => {
    if (e.target === m || e.target.closest("[data-close]")) return closeLeadForm();
    const b = e.target.closest("[data-q]"); if (!b) return;
    qtyIn.value = Math.min(10, Math.max(1, (+qtyIn.value || 1) + +b.dataset.q)); updateLeadTotal();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLeadForm(); });
  $("[name=product]", m).addEventListener("change", () => fillVariants(m));
  $("#leadForm", m).addEventListener("input", updateLeadTotal);
  const f = $("#leadForm", m), err = $("#leadError", m);
  const payload = () => {
    const d = Object.fromEntries(new FormData(f)), o = m._order;
    const items = o.mode === "book"
      ? [{ id: +d.product, size: d.size, flavour: d.flavour || "—", qty: +d.qty }]
      : o.lines.map(l => ({ id: l.p.id, size: l.size, flavour: l.flavour, qty: l.qty }));
    return { source: o.mode, customer: { name: d.name, phone: d.phone, address: d.address }, items, coupon: o.coupon || "" };
  };
  const post = async (path, body) => {
    let r;
    try { r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) }); }
    catch { throw new Error(`Network problem. Please try again or call ${CONTACT.display}`); }
    const res = await r.json().catch(() => ({}));
    if (r.status === 401) { CURRENT_USER = null; closeLeadForm(); requireLogin(); throw Object.assign(new Error(""), { silent: true }); }
    if (!r.ok) throw new Error(res.error || "Could not place your order");
    return res;
  };
  const showStep = id => ["leadStep", "payStep", "thanksStep"].forEach(k => $("#" + k, m).hidden = k !== id);
  const done = res => {
    clearInterval(m._timer);
    $("#thanksOrder", m).innerHTML = `Order <b>#${esc(res.orderNo)}</b> · Total <b>${inr(res.total)}</b>`;
    $("#thanksPay", m).innerHTML = res.payment.method === "upi"
      ? `✅ Paid by UPI · Txn ID <b>${esc(res.payment.txnId)}</b>`
      : `💵 Please keep <b>${inr(res.total)}</b> ready to pay in cash on delivery.`;
    showStep("thanksStep");
    f.reset();
    m._order.onDone?.();
  };
  const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };

  f.addEventListener("change", e => {
    if (e.target.name === "payMethod") $("[type=submit]", f).textContent = e.target.value === "upi" ? "Continue to Pay" : "Place Order";
  });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("[type=submit]", f), method = f.payMethod.value;
    err.hidden = true;
    busy(btn, true, method === "upi" ? "Preparing payment…" : "Placing order…");
    try {
      if (method === "cod") return done(await post("/api/orders", { ...payload(), payment: { method: "cod" } }));
      // UPI: get the final amount + QR from the server, then show the payment screen
      const q = await post("/api/orders/quote", payload());
      m._pay = { token: q.payToken, body: payload() };
      $("#payAmount", m).textContent = inr(q.total);
      $("#payBreakup", m).textContent = `Items ${inr(q.subtotal)}${q.discount ? ` − coupon ${inr(q.discount)}` : ""} + delivery ${q.shipping ? inr(q.shipping) : "FREE"} · Ref ${q.ref}`;
      $("#payQr", m).innerHTML = q.qrSvg;
      $("#payError", m).hidden = true;
      let left = q.expiresIn;
      const tick = () => {
        $("#payTimer", m).textContent = left > 0 ? `QR valid for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "QR expired — go back and try again";
        $("#payDone", m).disabled = left <= 0;
        left--;
      };
      clearInterval(m._timer); tick(); m._timer = setInterval(tick, 1000);
      showStep("payStep");
    } catch (ex) {
      if (!ex.silent) { err.textContent = ex.message; err.hidden = false; }
    } finally {
      busy(btn, false, method === "upi" ? "Continue to Pay" : "Place Order");
    }
  });
  $("#payBack", m).addEventListener("click", () => { clearInterval(m._timer); showStep("leadStep"); });
  $("#payDone", m).addEventListener("click", async () => {
    const btn = $("#payDone", m), perr = $("#payError", m);
    perr.hidden = true;
    busy(btn, true, "Verifying payment…");
    try {
      await new Promise(r => setTimeout(r, 1200)); // demo: pretend the bank is confirming
      done(await post("/api/orders", { ...m._pay.body, payment: { method: "upi", payToken: m._pay.token } }));
    } catch (ex) {
      if (!ex.silent) { perr.textContent = ex.message; perr.hidden = false; }
    } finally {
      busy(btn, false, "✅ I have paid");
    }
  });
  return m;
}
function showLeadModal(m, order) {
  m._order = order;
  const book = order.mode === "book";
  $("#leadTitle", m).textContent = book ? "Book this product" : "Delivery details";
  $("#bookFields", m).hidden = !book;
  $("#bookFields", m).disabled = !book;
  $("#leadItems", m).hidden = book;
  $("#leadStep", m).hidden = false; $("#payStep", m).hidden = true; $("#thanksStep", m).hidden = true; $("#leadError", m).hidden = true;
  clearInterval(m._timer);
  const f = $("#leadForm", m), u = CURRENT_USER;
  f.email.value = u.email;
  if (!f.name.value) f.name.value = u.name;
  if (!f.phone.value) f.phone.value = u.phone;
  if (!f.address.value) f.address.value = u.address || "";
  m.classList.add("open"); document.body.style.overflow = "hidden";
  setTimeout(() => $("[name=name]", m).focus(), 50);
}
// "Book Now" — order a single product directly
function openLeadForm(id, qty = 1, size, flavour) {
  if (!requireLogin()) return;
  const p = PRODUCTS.find(x => x.id === id);
  const m = leadModal();
  $("[name=product]", m).value = id;
  $("[name=qty]", m).value = qty;
  fillVariants(m, size || p.sizes[0], flavour || p.flavours[0]);
  showLeadModal(m, { mode: "book" });
}
// Fill Size & Flavour options for the product selected in the form
function fillVariants(m, size, flavour) {
  const p = PRODUCTS.find(x => x.id === +$("[name=product]", m).value);
  const sizeSel = $("[name=size]", m), flavSel = $("[name=flavour]", m);
  sizeSel.innerHTML = p.sizes.map(s => `<option value="${s}">${s} — ${inr(unitPrice(p, s))}</option>`).join("");
  sizeSel.value = size || p.sizes[0];
  const hasFlavour = p.flavours[0] !== "—";
  $("#flavourField", m).hidden = !hasFlavour;
  flavSel.disabled = !hasFlavour;
  flavSel.innerHTML = p.flavours.map(f => `<option value="${f}">${f}</option>`).join("");
  flavSel.value = flavour || p.flavours[0];
  updateLeadTotal();
}
// Cart "Proceed to Checkout" — order everything in the cart
function openCheckoutForm(lines, totals, onDone) {
  if (!requireLogin()) return;
  const m = leadModal();
  $("#leadItems", m).innerHTML = `<b>Your order (${lines.reduce((a, l) => a + l.qty, 0)} items)</b>
    ${lines.map(l => `<div><span>${l.p.name} × ${l.qty}<small>${l.size}${l.flavour !== "—" ? " · " + l.flavour : ""}</small></span><span>${inr(unitPrice(l.p, l.size) * l.qty)}</span></div>`).join("")}
    <div class="li-tot"><span>To Pay</span><span>${totals.payable}</span></div>`;
  showLeadModal(m, { mode: "cart", lines, coupon: totals.coupon, onDone });
}
// Orders need an account: send guests to the login page, then bring them back here
function requireLogin() {
  if (CURRENT_USER) return true;
  toast("Please log in or sign up to place your order");
  setTimeout(() => { location.href = `account.html?next=${encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search)}`; }, 900);
  return false;
}
function updateLeadTotal() {
  const m = $("#leadModal"), q = $("[name=qty]", m);
  const p = PRODUCTS.find(x => x.id === +$("[name=product]", m).value);
  const n = Math.min(10, Math.max(1, Math.floor(+q.value) || 1));
  $("#leadTotal", m).textContent = inr(unitPrice(p, $("[name=size]", m).value) * n);
}
function closeLeadForm() {
  const m = $("#leadModal");
  if (m) clearInterval(m._timer);
  if (m && m.classList.contains("open")) { m.classList.remove("open"); document.body.style.overflow = ""; }
}

/* ===== Header & footer ===== */
function renderChrome() {
  const header = `
  <div class="topbar">
    <div class="container topbar-in">
      <span>🚚 Free delivery on orders above ₹999</span>
      <span class="hide-sm">✔ 100% authentic · sourced direct from brands &amp; authorised distributors</span>
      <span class="topbar-contact"><a href="${telLink}">📞 ${CONTACT.display}</a> · <a href="${waLink()}" target="_blank" rel="noopener">💬 WhatsApp</a></span>
    </div>
  </div>
  <header class="site-header">
    <div class="container header-in">
      <button class="menu-btn" aria-label="Menu" id="menuBtn">☰</button>
      <a href="index.html" class="logo"><span class="logo-mark">V</span><span>Vitalyx<small>Verified Nutrition</small></span></a>
      <form class="search" action="products.html">
        <input name="q" placeholder="Search whey protein, creatine, multivitamins…" value="${params.get("q") || ""}" aria-label="Search products">
        <button aria-label="Search">🔍</button>
      </form>
      <nav class="header-actions">
        <a href="account.html" class="ha"><span>👤</span><small>${CURRENT_USER ? esc(CURRENT_USER.name.split(" ")[0]) : "Login"}</small></a>
        <a href="products.html?wish=1" class="ha hide-sm"><span>♡</span><small>Wishlist</small></a>
        <a href="cart.html" class="ha"><span>🛒<i class="cart-count" hidden>0</i></span><small>Cart</small></a>
      </nav>
    </div>
    <nav class="catnav" id="catnav">
      <div class="container catnav-in">
        ${CATEGORIES.map(c => `<a href="products.html?cat=${c.id}">${c.name}</a>`).join("")}
        <a href="products.html?sort=discount" class="hot">🔥 Deals</a>
        <a href="index.html#authentic" class="auth-link">✔ Authenticity</a>
      </div>
    </nav>
  </header>`;

  const footer = `
  <section class="trust-strip">
    <div class="container trust-grid">
      <div><b>✔ 100% Authentic</b><span>Direct from brands</span></div>
      <div><b>🔬 Lab Tested</b><span>Batch-wise reports</span></div>
      <div><b>🚚 Fast Delivery</b><span>Across 19,000+ pincodes</span></div>
      <div><b>↩ Easy Returns</b><span>7-day hassle-free</span></div>
      <div><b>🔒 Secure Payments</b><span>UPI, cards, COD</span></div>
    </div>
  </section>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <a href="index.html" class="logo light"><span class="logo-mark">V</span><span>Vitalyx<small>Verified Nutrition</small></span></a>
        <p>India's home for verified health, fitness and nutrition products. Every product is sourced direct from the brand or an authorised distributor, stored in temperature-controlled warehouses and can be checked by batch code.</p>
        <div class="socials"><a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="YouTube">YT</a><a href="#" aria-label="X">X</a><a href="#" aria-label="Facebook">FB</a></div>
      </div>
      <div><h4>Shop</h4>${CATEGORIES.slice(0, 6).map(c => `<a href="products.html?cat=${c.id}">${c.name}</a>`).join("")}</div>
      <div><h4>Company</h4><a href="#">About Us</a><a href="index.html#authentic">Authenticity Promise</a><a href="#">Careers</a><a href="#">Blog</a><a href="#">Contact</a></div>
      <div><h4>Help</h4><a href="${telLink}">📞 Call ${CONTACT.display}</a><a href="${waLink()}" target="_blank" rel="noopener">💬 Chat on WhatsApp</a><a href="account.html#orders">Track Order</a><a href="#">Returns & Refunds</a><a href="#">Shipping Policy</a><a href="#">FAQs</a><a href="#">Verify Product</a></div>
    </div>
    <div class="container footer-bottom">
      <span>© ${new Date().getFullYear()} Vitalyx Nutrition. A demo storefront — all brands and products are fictional.</span>
      <span>Supplements are not a substitute for a varied diet. Consult your physician before use.</span>
    </div>
  </footer>`;

  const floating = `
  <div class="float-contact">
    <a href="${telLink}" class="fc fc-call" aria-label="Call us at ${CONTACT.display}" title="Call ${CONTACT.display}">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>
    </a>
    <a href="${waLink()}" target="_blank" rel="noopener" class="fc fc-wa" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
      <svg viewBox="0 0 32 32" width="28" height="28" fill="#fff"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.2 1.3 3.4c.2.2 2.3 3.5 5.6 4.9 2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>
      <span class="fc-label">Chat with us</span>
    </a>
  </div>`;

  $("#header").innerHTML = header;
  $("#footer").innerHTML = footer + floating;
  $$("[data-wa]").forEach(a => { a.href = waLink("Hi Vitalyx! I'd like a free dietitian consultation."); a.target = "_blank"; a.rel = "noopener"; });
  $$("[data-call]").forEach(a => a.href = telLink);
  $("#menuBtn").addEventListener("click", () => $("#catnav").classList.toggle("open"));
  const hdr = $(".site-header");
  const onScroll = () => hdr.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  updateCartCount();
}

/* ===== Global click delegation ===== */
document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) { e.preventDefault(); addToCart(+add.dataset.add); }
  const book = e.target.closest("[data-book]");
  if (book) { e.preventDefault(); openLeadForm(+book.dataset.book); }
  const w = e.target.closest("[data-wish]");
  if (w) { e.preventDefault(); toggleWish(+w.dataset.wish); }
});

/* ===== Home page ===== */
function initHome() {
  $$("[data-art]").forEach(el => {
    el.innerHTML = el.dataset.art.split(",").map(id => PRODUCTS.find(p => p.id === +id)).filter(Boolean).map(p => productArt(p, 200)).join("");
  });

  // Hero slider
  const slides = $$(".slide"), dots = $(".dots");
  let i = 0;
  dots.innerHTML = slides.map((_, k) => `<button aria-label="Slide ${k + 1}"></button>`).join("");
  const go = n => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    $$("button", dots).forEach((d, k) => d.classList.toggle("active", k === i));
  };
  $$("button", dots).forEach((d, k) => d.addEventListener("click", () => go(k)));
  $(".hero-prev").addEventListener("click", () => go(i - 1));
  $(".hero-next").addEventListener("click", () => go(i + 1));
  go(0);
  setInterval(() => go(i + 1), 5500);

  $("#catGrid").innerHTML = CATEGORIES.map(c => `
    <a class="cat-tile" href="products.html?cat=${c.id}" style="--c:${c.color}">
      <span class="cat-ico">${c.icon}</span><span>${c.name}</span>
    </a>`).join("");

  $("#goalGrid").innerHTML = GOALS.map(g => `
    <a class="goal" href="products.html?goal=${g.id}">
      <span class="goal-ico">${g.icon}</span><b>${g.name}</b><small>${g.desc}</small><span class="arrow">→</span>
    </a>`).join("");

  // Tabs for featured products
  const tabs = {
    best: PRODUCTS.filter(p => p.badge === "Bestseller"),
    deals: [...PRODUCTS].sort((a, b) => off(b) - off(a)).slice(0, 8),
    top: [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 8)
  };
  const showTab = k => {
    $("#featured").innerHTML = tabs[k].slice(0, 8).map(productCard).join("");
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === k));
  };
  $$(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));
  showTab("best");

  $("#proteinRow").innerHTML = PRODUCTS.filter(p => p.category === "protein" || p.category === "gainer").map(productCard).join("");
  $("#wellnessRow").innerHTML = PRODUCTS.filter(p => ["vitamins", "omega", "ayurveda"].includes(p.category)).map(productCard).join("");

  $("#brandRow").innerHTML = BRANDS.map(b => `
    <a class="brand-tile" href="products.html?brand=${encodeURIComponent(b.name)}">
      <b>${b.name}</b><small>${b.tag}</small><span class="verified">✔ Authorised</span>
    </a>`).join("");

  $("#testimonials").innerHTML = TESTIMONIALS.map(t => `
    <figure class="card testi">${stars(t.rating)}<blockquote>“${t.text}”</blockquote>
      <figcaption><span class="avatar">${t.name[0]}</span><b>${t.name}</b> · ${t.city} <span class="verified">Verified Buyer</span></figcaption>
    </figure>`).join("");

  $("#articles").innerHTML = ARTICLES.map(a => `
    <a href="#" class="card article">
      <div class="article-img" style="background:${a.color}"><span>${a.tag}</span></div>
      <div class="article-body"><b>${a.title}</b><small>${a.read} read</small></div>
    </a>`).join("");

  // Authenticity checker (demo)
  $("#verifyForm").addEventListener("submit", e => {
    e.preventDefault();
    const code = $("#verifyCode").value.trim().toUpperCase();
    const out = $("#verifyResult");
    if (/^VX[A-Z0-9]{6,}$/.test(code)) {
      const p = PRODUCTS[code.charCodeAt(3) % PRODUCTS.length];
      out.className = "verify-result ok";
      out.innerHTML = `✔ <b>Genuine product.</b> Batch ${code} matches <b>${p.brand} – ${p.name}</b>. Lab report: protein &amp; heavy metals <b>PASS</b>.`;
    } else {
      out.className = "verify-result bad";
      out.innerHTML = `✖ We couldn't match this code. Codes start with <b>VX</b> followed by at least 6 letters or numbers (try <code>VX7Q2K9M</code>). If your product came from somewhere else, contact the brand.`;
    }
  });

  $("#newsletter").addEventListener("submit", e => {
    e.preventDefault();
    e.target.innerHTML = `<p class="nl-ok">🎉 You're in! Use code <b>WELCOME10</b> for 10% off your first order.</p>`;
  });
}

/* ===== Listing page ===== */
function initListing() {
  const state = {
    q: (params.get("q") || "").toLowerCase(),
    cats: params.get("cat") ? [params.get("cat")] : [],
    brands: params.get("brand") ? [params.get("brand")] : [],
    goal: params.get("goal") || "",
    max: 6000, rating: 0,
    sort: params.get("sort") || "popular",
    wish: params.get("wish") === "1"
  };

  const title = state.wish ? "Your Wishlist"
    : state.q ? `Results for “${params.get("q")}”`
    : state.cats.length ? catName(state.cats[0])
    : state.goal ? (GOALS.find(g => g.id === state.goal) || {}).name
    : state.brands.length ? state.brands[0] : "All Products";
  $("#listTitle").textContent = title;
  $("#crumb").textContent = title;
  document.title = `${title} | Vitalyx`;

  $("#fCats").innerHTML = CATEGORIES.map(c => `
    <label><input type="checkbox" value="${c.id}" ${state.cats.includes(c.id) ? "checked" : ""}> ${c.name}
    <small>${PRODUCTS.filter(p => p.category === c.id).length}</small></label>`).join("");
  const brandNames = [...new Set([...BRANDS.map(b => b.name), ...PRODUCTS.map(p => p.brand)])].filter(n => PRODUCTS.some(p => p.brand === n));
  $("#fBrands").innerHTML = brandNames.map(name => ({ name })).map(b => `
    <label><input type="checkbox" value="${b.name}" ${state.brands.includes(b.name) ? "checked" : ""}> ${b.name}
    <small>${PRODUCTS.filter(p => p.brand === b.name).length}</small></label>`).join("");
  $("#fGoal").innerHTML = `<option value="">Any goal</option>` + GOALS.map(g => `<option value="${g.id}" ${g.id === state.goal ? "selected" : ""}>${g.name}</option>`).join("");
  $("#sort").value = state.sort;

  const render = () => {
    let list = PRODUCTS.filter(p =>
      (!state.wish || getWish().includes(p.id)) &&
      (!state.q || (p.name + " " + p.brand + " " + catName(p.category)).toLowerCase().includes(state.q)) &&
      (!state.cats.length || state.cats.includes(p.category)) &&
      (!state.brands.length || state.brands.includes(p.brand)) &&
      (!state.goal || p.goals.includes(state.goal)) &&
      p.price <= state.max && p.rating >= state.rating
    );
    const sorters = {
      popular: (a, b) => b.reviews - a.reviews,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      discount: (a, b) => off(b) - off(a)
    };
    list.sort(sorters[state.sort] || sorters.popular);
    $("#count").textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
    $("#grid").innerHTML = list.length ? list.map(productCard).join("")
      : `<div class="empty"><p>😕 No products match these filters.</p><a href="products.html" class="btn btn-primary">Clear all filters</a></div>`;
  };

  $("#fCats").addEventListener("change", () => { state.cats = $$("#fCats input:checked").map(i => i.value); render(); });
  $("#fBrands").addEventListener("change", () => { state.brands = $$("#fBrands input:checked").map(i => i.value); render(); });
  $("#fGoal").addEventListener("change", e => { state.goal = e.target.value; render(); });
  $("#fPrice").addEventListener("input", e => { state.max = +e.target.value; $("#fPriceVal").textContent = inr(state.max); render(); });
  $$("[name=rating]").forEach(r => r.addEventListener("change", e => { state.rating = +e.target.value; render(); }));
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("#filterToggle").addEventListener("click", () => $(".filters").classList.toggle("open"));
  render();
}

/* ===== Product detail page ===== */
function initProduct() {
  const p = PRODUCTS.find(x => x.id === +params.get("id")) || PRODUCTS[0];
  if (!p) { $("#pdp").innerHTML = `<div class="empty card"><h2>Product not found</h2><a class="btn btn-primary" href="products.html">Browse products</a></div>`; return; }
  document.title = `${p.name} | ${p.brand} | Vitalyx`;
  let size = p.sizes[0], flavour = p.flavours[0], qty = 1;
  const batch = "VX" + (p.id * 7919).toString(36).toUpperCase().padStart(6, "Q");

  $("#crumbCat").innerHTML = `<a href="products.html?cat=${p.category}">${catName(p.category)}</a>`;
  $("#crumbName").textContent = p.name;
  $("#pdp").innerHTML = `
    <div class="pdp-gallery">
      <div class="pdp-main" style="--tint:${p.accent}">${p.badge ? `<span class="badge">${p.badge}</span>` : ""}${productArt(p, 340)}</div>
      <div class="pdp-thumbs">${[0, 1, 2, 3].map(k => `<div class="thumb ${k ? "" : "active"}" style="--tint:${p.accent}">${productArt(p, 64)}</div>`).join("")}</div>
      <div class="auth-card">
        <div class="seal">✔</div>
        <div><b>Authenticity guaranteed</b><small>Sourced direct from ${p.brand}. Batch <code>${batch}</code>: scan the label QR code to see the lab report.</small></div>
      </div>
    </div>
    <div class="pdp-info">
      <a class="pc-brand" href="products.html?brand=${encodeURIComponent(p.brand)}">${p.brand} <span class="verified">✔ Authorised Seller</span></a>
      <h1>${p.name}</h1>
      <div class="pdp-rating"><span class="rating-pill">${p.rating} ★</span> ${p.reviews.toLocaleString("en-IN")} ratings · <a href="#reviews">Read reviews</a></div>
      <div class="pdp-price"><b id="pPrice">${inr(p.price)}</b> <s>MRP ${inr(p.mrp)}</s> <em>${off(p)}% OFF</em><small>Inclusive of all taxes</small></div>
      <div class="vitacash">💰 Earn <b>${inr(Math.round(p.price * 0.05))}</b> VitaCash on this order · Members save an extra 5%</div>

      <div class="opt"><span>Size</span><div class="chips" id="sizes">${p.sizes.map((s, k) => `<button class="chip ${k ? "" : "active"}" data-v="${s}">${s}</button>`).join("")}</div></div>
      ${p.flavours[0] !== "—" ? `<div class="opt"><span>Flavour</span><div class="chips" id="flavours">${p.flavours.map((f, k) => `<button class="chip ${k ? "" : "active"}" data-v="${f}">${f}</button>`).join("")}</div></div>` : ""}

      <div class="buy-row">
        <div class="qty"><button id="qMinus" aria-label="Decrease">−</button><span id="qVal">1</span><button id="qPlus" aria-label="Increase">+</button></div>
        <button class="btn btn-primary btn-lg" id="addBtn">Add to Cart</button>
        <button class="btn btn-accent btn-lg" id="buyBtn">Book Now</button>
        <button class="btn btn-ghost btn-lg wish-lg" data-wish="${p.id}" aria-label="Wishlist">${getWish().includes(p.id) ? "♥" : "♡"}</button>
      </div>

      <div class="contact-row">
        <a class="btn btn-wa" href="${waLink(`Hi Vitalyx! I'd like to know more about ${p.brand} ${p.name}.`)}" target="_blank" rel="noopener">💬 Ask on WhatsApp</a>
        <a class="btn btn-ghost" href="${telLink}">📞 Call ${CONTACT.display}</a>
      </div>

      <div class="pin-check">
        <label for="pin">Check delivery</label>
        <div><input id="pin" maxlength="6" placeholder="Enter pincode" inputmode="numeric"><button class="btn btn-ghost" id="pinBtn">Check</button></div>
        <small id="pinOut">Usually delivered in 2–4 days. COD available.</small>
      </div>

      <div class="offers">
        <b>Available offers</b>
        <ul>
          <li><span class="tag">BANK</span> 10% instant discount on selected credit cards, up to ₹500</li>
          <li><span class="tag">UPI</span> Flat ₹50 cashback on UPI orders above ₹1,499</li>
          <li><span class="tag">COMBO</span> Buy with a shaker and save an extra ₹200</li>
        </ul>
      </div>

      <ul class="assure">
        <li>✔ 100% Original</li><li>🔬 Lab Tested</li><li>↩ 7-Day Returns</li><li>🧊 Temp-controlled storage</li>
      </ul>
    </div>`;

  $("#pdpTabs").innerHTML = `
    <div class="tabs-bar">
      <button class="tab active" data-t="desc">Description</button>
      <button class="tab" data-t="nutri">Nutrition Facts</button>
      <button class="tab" data-t="auth">Authenticity</button>
      <button class="tab" data-t="how">How to Use</button>
    </div>
    <div class="tab-panel" data-p="desc"><p>${p.desc}</p><ul class="hl">${p.highlights.map(h => `<li>${h}</li>`).join("")}</ul></div>
    <div class="tab-panel" data-p="nutri" hidden>
      <table class="nutri"><tr><th>Per serving</th><th>Amount</th></tr>
        <tr><td>Servings per pack</td><td>${p.servings}</td></tr>
        <tr><td>Protein</td><td>${p.protein}</td></tr>
        <tr><td>Added sugar</td><td>0 g</td></tr>
        <tr><td>Category</td><td>${catName(p.category)}</td></tr>
        <tr><td>FSSAI Lic. No.</td><td>1002XXXXXXXXXX (demo)</td></tr>
      </table></div>
    <div class="tab-panel" data-p="auth" hidden>
      <ol class="steps">
        <li><b>Direct sourcing.</b> Bought only from ${p.brand} or its authorised importer, with invoices on record.</li>
        <li><b>Batch lab test.</b> An NABL-accredited lab tests a sample from every batch for label claims and contaminants.</li>
        <li><b>Tamper-proof seal.</b> Every pack has a holographic seal with a unique QR code.</li>
        <li><b>Verify yourself.</b> Enter batch code <code>${batch}</code> on our <a href="index.html#authentic">verification page</a>.</li>
      </ol></div>
    <div class="tab-panel" data-p="how" hidden><p>Mix 1 serving with 200–250 ml of water or milk. Have it after a workout or between meals. Don't exceed the recommended dose. Store in a cool, dry place. Not for children, pregnant or nursing women.</p></div>`;
  $$("#pdpTabs .tab").forEach(t => t.addEventListener("click", () => {
    $$("#pdpTabs .tab").forEach(x => x.classList.toggle("active", x === t));
    $$("#pdpTabs .tab-panel").forEach(x => x.hidden = x.dataset.p !== t.dataset.t);
  }));

  // Reviews
  const dist = [68, 20, 7, 3, 2];
  $("#reviews").innerHTML = `
    <h2>Ratings & Reviews</h2>
    <div class="rev-grid">
      <div class="rev-summary"><b>${p.rating}</b>${stars(p.rating)}<small>${p.reviews.toLocaleString("en-IN")} verified ratings</small>
        ${dist.map((d, k) => `<div class="bar"><span>${5 - k}★</span><i><em style="width:${d}%"></em></i><span>${d}%</span></div>`).join("")}
      </div>
      <div class="rev-list">${TESTIMONIALS.slice(0, 3).map(t => `
        <div class="rev"><div>${stars(t.rating)} <b>${t.name}</b> <span class="verified">Verified Buyer</span></div><p>${t.text}</p></div>`).join("")}
      </div>
    </div>`;

  $("#related").innerHTML = PRODUCTS.filter(x => x.id !== p.id && (x.category === p.category || x.goals.some(g => p.goals.includes(g)))).slice(0, 4).map(productCard).join("");

  const pick = (sel, cb) => $(sel) && $(sel).addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    $$(".chip", $(sel)).forEach(c => c.classList.toggle("active", c === b)); cb(b.dataset.v);
  });
  pick("#sizes", v => {
    size = v;
    $("#pPrice").textContent = inr(unitPrice(p, v));
  });
  pick("#flavours", v => flavour = v);
  $("#qMinus").addEventListener("click", () => { qty = Math.max(1, qty - 1); $("#qVal").textContent = qty; });
  $("#qPlus").addEventListener("click", () => { qty = Math.min(10, qty + 1); $("#qVal").textContent = qty; });
  $("#addBtn").addEventListener("click", () => addToCart(p.id, qty, size, flavour));
  $("#buyBtn").addEventListener("click", () => openLeadForm(p.id, qty, size, flavour));
  $("#pinBtn").addEventListener("click", () => {
    const v = $("#pin").value.trim();
    $("#pinOut").innerHTML = /^[1-9]\d{5}$/.test(v)
      ? `✔ Delivery to <b>${v}</b> by <b>${new Date(Date.now() + 3 * 864e5).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</b>. COD available.`
      : `<span style="color:#d00000">Please enter a valid 6-digit pincode.</span>`;
  });
}

/* ===== Cart page ===== */
function initCart() {
  let coupon = store.get("vx_coupon", "");
  const COUPONS = { WELCOME10: 0.10, FIT15: 0.15 };

  const render = () => {
    const cart = getCart().filter(l => PRODUCTS.some(x => x.id === l.id));
    if (cart.length !== getCart().length) setCart(cart);
    if (!cart.length) {
      $("#cartWrap").innerHTML = `<div class="empty card"><div style="font-size:56px">🛒</div><h2>Your cart is empty</h2><p>Add verified supplements and they'll show up here.</p><a class="btn btn-primary" href="products.html">Start Shopping</a></div>`;
      return;
    }
    const lines = cart.map((l, idx) => ({ ...l, idx, p: PRODUCTS.find(x => x.id === l.id) }));
    const mrp = lines.reduce((a, l) => a + unitMrp(l.p, l.size) * l.qty, 0);
    const sub = lines.reduce((a, l) => a + unitPrice(l.p, l.size) * l.qty, 0);
    const disc = COUPONS[coupon] ? Math.round(sub * COUPONS[coupon]) : 0;
    const ship = sub - disc >= 999 ? 0 : 79;
    const total = sub - disc + ship;

    $("#cartWrap").innerHTML = `
      <div class="cart-grid">
        <div>
          ${ship ? `<div class="ship-note">Add <b>${inr(999 - (sub - disc))}</b> more for <b>FREE delivery</b> <i><em style="width:${Math.min(100, (sub - disc) / 9.99)}%"></em></i></div>` : `<div class="ship-note ok">🎉 Your order qualifies for <b>FREE delivery</b></div>`}
          ${lines.map(l => `
          <div class="card cart-line">
            <a href="product.html?id=${l.p.id}" class="cl-img" style="--tint:${l.p.accent}">${productArt(l.p, 96)}</a>
            <div class="cl-info">
              <small>${l.p.brand} <span class="verified">✔ Verified</span></small>
              <a href="product.html?id=${l.p.id}"><b>${l.p.name}</b></a>
              <small>${l.size}${l.flavour !== "—" ? " · " + l.flavour : ""}</small>
              <div class="pc-price"><b>${inr(unitPrice(l.p, l.size))}</b> <s>${inr(unitMrp(l.p, l.size))}</s> <em>${off(l.p)}% off</em></div>
            </div>
            <div class="cl-actions">
              <div class="qty"><button data-dec="${l.idx}">−</button><span>${l.qty}</span><button data-inc="${l.idx}">+</button></div>
              <button class="link" data-rm="${l.idx}">Remove</button>
            </div>
          </div>`).join("")}
        </div>
        <aside class="card summary">
          <h3>Order Summary</h3>
          <form id="couponForm" class="coupon"><input id="couponIn" placeholder="Coupon code (try FIT15)" value="${coupon}"><button class="btn btn-ghost">Apply</button></form>
          ${coupon && !COUPONS[coupon] ? `<small class="err">Invalid coupon code</small>` : ""}
          <dl>
            <dt>Total MRP</dt><dd>${inr(mrp)}</dd>
            <dt>Discount on MRP</dt><dd class="save">− ${inr(mrp - sub)}</dd>
            ${disc ? `<dt>Coupon (${coupon})</dt><dd class="save">− ${inr(disc)}</dd>` : ""}
            <dt>Delivery</dt><dd>${ship ? inr(ship) : '<span class="save">FREE</span>'}</dd>
            <dt class="tot">To Pay</dt><dd class="tot">${inr(total)}</dd>
          </dl>
          <div class="you-save">You save ${inr(mrp - sub + disc)} on this order · Earn ${inr(Math.round(total * 0.05))} VitaCash</div>
          <button class="btn btn-accent btn-block btn-lg" id="checkout">Proceed to Checkout</button>
          <div class="pay-icons"><span>UPI</span><span>VISA</span><span>RuPay</span><span>Mastercard</span><span>COD</span></div>
          <p class="secure">🔒 Payments are 100% secure and encrypted</p>
        </aside>
      </div>`;

    $("#couponForm").addEventListener("submit", e => {
      e.preventDefault(); coupon = $("#couponIn").value.trim().toUpperCase(); store.set("vx_coupon", coupon); render();
      if (COUPONS[coupon]) toast(`Coupon <b>${coupon}</b> applied!`);
    });
    $("#checkout").addEventListener("click", () => openCheckoutForm(lines, { payable: inr(total), coupon: disc ? coupon : "" }, () => {
      setCart([]); store.set("vx_coupon", ""); coupon = "";
      $("#cartWrap").innerHTML = `<div class="empty card"><div style="font-size:56px">✅</div><h2>Order placed!</h2><p>Your order has been received. Our team will contact you shortly to confirm it.</p><a class="btn btn-primary" href="index.html">Continue Shopping</a></div>`;
    }));
  };

  $("#cartWrap").addEventListener("click", e => {
    const cart = getCart();
    const t = e.target;
    if (t.dataset.inc) cart[t.dataset.inc].qty = Math.min(10, cart[t.dataset.inc].qty + 1);
    else if (t.dataset.dec) { const l = cart[t.dataset.dec]; l.qty > 1 ? l.qty-- : cart.splice(t.dataset.dec, 1); }
    else if (t.dataset.rm) cart.splice(t.dataset.rm, 1);
    else return;
    setCart(cart); render();
  });

  $("#recs").innerHTML = PRODUCTS.filter(p => p.price < 900).slice(0, 4).map(productCard).join("");
  render();
}

/* ===== Account page: login, signup & order tracking ===== */
const TRACK_STEPS = [["new", "Order placed"], ["confirmed", "Confirmed"], ["shipped", "Shipped"], ["delivered", "Delivered"]];
const fmtDate = iso => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

async function authPost(path, body) {
  const r = await fetch(`${API_BASE}/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function initAccount() {
  const wrap = $("#accountWrap");
  const next = params.get("next");
  const safeNext = next && /^[\w.-]+\.html(\?[^#]*)?$/.test(next) ? next : "";

  if (!CURRENT_USER) {
    $("#accountTitle").textContent = "Login / Sign up";
    wrap.innerHTML = `
      ${safeNext ? `<p class="auth-note">🔒 Please log in or create an account to place your order.</p>` : ""}
      <div class="card auth-box">
        <div class="auth-tabs"><button class="active" data-auth="login">Login</button><button data-auth="signup">Sign up</button></div>
        <form id="loginForm" class="lead-form">
          <label>Email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
          <label>Password<input name="password" type="password" required autocomplete="current-password" minlength="6"></label>
          <p class="lead-error" hidden></p>
          <button class="btn btn-primary btn-block btn-lg">Login</button>
          <p class="auth-switch">New here? <button type="button" class="link" data-auth="signup">Create an account</button></p>
        </form>
        <form id="signupForm" class="lead-form" hidden>
          <label>Full name<input name="name" required autocomplete="name" maxlength="80"></label>
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
          <label>Mobile number<input name="phone" type="tel" required autocomplete="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" title="Enter a valid 10-digit mobile number"></label>
          <label>Password <small class="muted">(at least 6 characters)</small><input name="password" type="password" required autocomplete="new-password" minlength="6"></label>
          <p class="lead-error" hidden></p>
          <button class="btn btn-primary btn-block btn-lg">Create account</button>
          <p class="auth-switch">Already have an account? <button type="button" class="link" data-auth="login">Log in</button></p>
        </form>
      </div>`;
    const show = tab => {
      $$("[data-auth]", wrap).forEach(b => b.classList.toggle("active", b.dataset.auth === tab));
      $("#loginForm").hidden = tab !== "login"; $("#signupForm").hidden = tab !== "signup";
    };
    wrap.addEventListener("click", e => { const b = e.target.closest("[data-auth]"); if (b) show(b.dataset.auth); });
    if (location.hash === "#signup") show("signup");
    const handle = (form, path) => form.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = $("button:not([type=button])", form), err = $(".lead-error", form);
      btn.disabled = true; err.hidden = true;
      try {
        await authPost(path, Object.fromEntries(new FormData(form)));
        location.href = safeNext || "account.html#orders";
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
    });
    handle($("#loginForm"), "login");
    handle($("#signupForm"), "signup");
    return;
  }

  const u = CURRENT_USER;
  $("#accountTitle").textContent = "My Account";
  wrap.innerHTML = `
    <div class="card acct-head">
      <div class="acct-avatar">${esc(u.name[0].toUpperCase())}</div>
      <div><b>${esc(u.name)}</b><small>${esc(u.email)} · ${esc(u.phone)}</small></div>
      <button class="btn btn-ghost" id="logoutBtn">Log out</button>
    </div>
    <h2 class="acct-sub" id="orders">My Orders</h2>
    <div id="myOrders"><p class="muted">Loading your orders…</p></div>`;
  $("#logoutBtn").addEventListener("click", async () => { await authPost("logout", {}).catch(() => {}); location.href = "index.html"; });
  loadMyOrders();
}

function payLabel(o) {
  const p = o.payment || { method: "cod", status: "pending" };
  if (p.method === "upi") return `📱 UPI · <b class="pay-ok">${p.status === "refunded" ? "Refunded" : "Paid"}</b>${p.txnId ? ` · Txn ${esc(p.txnId)}` : ""}`;
  return `💵 Cash on Delivery · <b class="${p.status === "paid" ? "pay-ok" : "pay-due"}">${p.status === "paid" ? "Paid" : `Pay ${inr(o.total)} on delivery`}</b>`;
}
async function loadMyOrders() {
  const box = $("#myOrders");
  let orders;
  try {
    const r = await fetch(`${API_BASE}/api/my/orders`, { credentials: "same-origin" });
    if (!r.ok) throw new Error();
    orders = await r.json();
  } catch { box.innerHTML = `<p class="lead-error">Could not load your orders. Please refresh the page.</p>`; return; }
  if (!orders.length) {
    box.innerHTML = `<div class="empty card"><div style="font-size:56px">📦</div><h2>No orders yet</h2><p>Orders you place will show here so you can track them.</p><a class="btn btn-primary" href="products.html">Start Shopping</a></div>`;
    return;
  }
  box.innerHTML = orders.map(o => {
    const when = Object.fromEntries((o.history || [{ status: o.status, at: o.createdAt }]).map(h => [h.status, h.at]));
    when.new ||= o.createdAt;
    const reached = TRACK_STEPS.findIndex(([k]) => k === o.status);
    const track = o.status === "cancelled"
      ? `<p class="track-cancel">✖ This order was cancelled${when.cancelled ? " on " + fmtDate(when.cancelled) : ""}. Please call ${CONTACT.display} if you have questions.</p>`
      : `<ol class="track">${TRACK_STEPS.map(([k, label], i) => `<li class="${i <= reached ? "done" : ""} ${i === reached ? "now" : ""}"><b>${label}</b><small>${when[k] ? fmtDate(when[k]) : i <= reached ? "Done" : "Pending"}</small></li>`).join("")}</ol>`;
    return `<article class="card order-card">
      <header><div><b>Order #${esc(o.orderNo)}</b><small>Placed ${fmtDate(o.createdAt)}</small></div><div class="oc-total"><b>${inr(o.total)}</b><span class="ostatus os-${o.status}">${o.status}</span></div></header>
      ${track}
      <ul class="oc-items">${o.items.map(i => `<li><span>${esc(i.brand)} ${esc(i.name)}<small>${esc(i.size)}${i.flavour !== "—" ? " · " + esc(i.flavour) : ""} · Qty ${i.qty}</small></span><b>${inr(i.lineTotal)}</b></li>`).join("")}</ul>
      <p class="oc-pay">${payLabel(o)}</p>
      <p class="oc-addr">📍 ${esc(o.customer.address)}</p>
    </article>`;
  }).join("");
  if (location.hash === "#orders") $("#orders").scrollIntoView();
}

/* ===== Boot ===== */
async function loadProducts() {
  if (location.protocol === "file:") return;
  try {
    const r = await fetch(`${API_BASE}/api/products`);
    if (r.ok) PRODUCTS = await r.json();
  } catch { /* server not running — keep the built-in catalogue */ }
}
let CURRENT_USER = null;
async function loadUser() {
  if (location.protocol === "file:") return;
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, { credentials: "same-origin" });
    if (r.ok) CURRENT_USER = (await r.json()).user;
  } catch { /* offline — treat as logged out */ }
}
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadProducts(), loadUser()]);
  renderChrome();
  ({ home: initHome, listing: initListing, product: initProduct, cart: initCart, account: initAccount })[document.body.dataset.page]?.();
});
