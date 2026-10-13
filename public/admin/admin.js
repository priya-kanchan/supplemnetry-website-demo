/* Vitalyx admin dashboard — talks to the server API under /api/admin */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const inr = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
const fmtDate = iso => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];
const statusPill = s => `<span class="status s-${s}">${s}</span>`;
const PAY_METHODS = { cod: "Cash on Delivery", upi: "UPI" };
const payOf = o => o.payment || { method: "cod", status: "pending", txnId: "", ref: "", paidAt: "" };
const payPill = o => { const p = payOf(o); return `<span class="pay pay-${p.status}">${p.status === "pending" ? "Unpaid" : p.status}</span>`; };

const state = { orders: [], products: [], customers: 0, customerList: [], customerQ: "", view: "overview", orderFilter: "all", orderQ: "", productQ: "", productCat: "", editing: null, image: "" };

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2400);
}

async function api(path, opts = {}) {
  const r = await fetch(`/api${path}`, {
    method: opts.method || "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin"
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !/\/(login|reset-password)$/.test(path)) { showLogin(); throw new Error("Session expired — please log in again"); }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ---------- auth ---------- */
function showLogin() { $("#appView").hidden = true; $("#loginView").hidden = false; showLoginForm("login"); }
function showLoginForm(which) {
  $("#loginForm").hidden = which !== "login"; $("#resetForm").hidden = which !== "reset";
  $$("#loginView .error").forEach(e => e.hidden = true);
}
$("#loginView").addEventListener("click", e => { const b = e.target.closest("[data-login-view]"); if (b) showLoginForm(b.dataset.loginView); });
async function showApp(me) {
  $("#loginView").hidden = true; $("#appView").hidden = false;
  state.customers = me.customers || 0;
  $("#storageInfo").textContent = `Logged in as ${me.user} · data stored in ${me.storage}`;
  await loadAll();
  go(location.hash.slice(1) || "overview");
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target)), err = $("#loginError");
  err.hidden = true;
  try {
    await api("/admin/login", { method: "POST", body: d });
    e.target.reset();
    showApp(await api("/admin/me"));
  } catch (ex) { err.textContent = ex.message; err.hidden = false; }
});
// Forgot password: reset with the server's recovery key, then log in with the new password
$("#resetForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f)), err = $(".error", f), btn = $("[type=submit]", f);
  err.hidden = true;
  if (d.newPassword !== d.confirmPassword) { err.textContent = "The two new passwords don't match"; err.hidden = false; return; }
  btn.disabled = true;
  try {
    await api("/admin/reset-password", { method: "POST", body: d });
    f.reset(); showLoginForm("login");
    $("#loginForm").username.value = d.username;
    toast("Password changed. Log in with your new password.");
  } catch (ex) { err.textContent = ex.message; err.hidden = false; }
  finally { btn.disabled = false; }
});
$("#changePwBtn").addEventListener("click", () => {
  const f = $("#passwordForm");
  f.reset(); $(".error", f).hidden = true;
  openModal($("#passwordModal"));
  setTimeout(() => f.currentPassword.focus(), 50);
});
$("#passwordForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f)), err = $(".error", f), btn = $("[type=submit]", f);
  err.hidden = true;
  if (d.newPassword !== d.confirmPassword) { err.textContent = "The two new passwords don't match"; err.hidden = false; return; }
  btn.disabled = true;
  try {
    await api("/admin/password", { method: "POST", body: d });
    closeModal($("#passwordModal")); f.reset();
    toast("Password changed. Use the new password next time you log in.");
  } catch (ex) { err.textContent = ex.message; err.hidden = false; }
  finally { btn.disabled = false; }
});
$("#logoutBtn").addEventListener("click", async () => { await api("/admin/logout", { method: "POST" }).catch(() => {}); showLogin(); });

/* ---------- data ---------- */
async function loadAll() {
  let me;
  [state.orders, state.products, state.customerList, me] = await Promise.all([api("/admin/orders"), api("/admin/products"), api("/admin/customers"), api("/admin/me")]);
  state.customers = me.customers || 0;
  renderAll();
}
function renderAll() {
  const n = state.orders.filter(o => o.status === "new").length;
  $("#newBadge").textContent = n; $("#newBadge").hidden = !n;
  const r = state.customerList.filter(c => c.resetRequestedAt).length;
  $("#resetBadge").textContent = r; $("#resetBadge").hidden = !r;
  renderOverview(); renderOrders(); renderProducts(); renderCustomers();
}
// Check for new orders every 30 seconds
setInterval(async () => {
  if ($("#appView").hidden || document.hidden) return;
  try {
    const before = new Set(state.orders.map(o => o.id));
    const resets = () => state.customerList.filter(c => c.resetRequestedAt).map(c => c.id).join();
    const resetsBefore = resets();
    [state.orders, state.customerList] = await Promise.all([api("/admin/orders"), api("/admin/customers")]);
    const fresh = state.orders.filter(o => !before.has(o.id)).length;
    if (fresh) toast(`🔔 ${fresh} new order${fresh > 1 ? "s" : ""} received`);
    else if (resets() !== resetsBefore && resets()) toast("🔑 A customer asked for a password reset");
    if (fresh || resets() !== resetsBefore) renderAll();
  } catch { /* ignore — next tick will retry */ }
}, 30000);

/* ---------- navigation ---------- */
function go(view) {
  if (!["overview", "orders", "products", "customers"].includes(view)) view = "overview";
  state.view = view;
  $$(".nav [data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $$("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== view);
  history.replaceState(null, "", "#" + view);
  scrollTo(0, 0);
}
document.addEventListener("click", e => {
  const v = e.target.closest("[data-view], [data-goto]");
  if (v) go(v.dataset.view || v.dataset.goto);
  if (e.target.closest("[data-refresh]")) loadAll().then(() => toast("Updated")).catch(ex => toast(ex.message));
  const modal = e.target.closest(".modal");
  if (modal && (e.target === modal || e.target.closest("[data-close]"))) closeModal(modal);
});
document.addEventListener("keydown", e => { if (e.key === "Escape") $$(".modal.open").forEach(closeModal); });
function openModal(m) { m.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal(m) { m.classList.remove("open"); document.body.style.overflow = ""; }

/* ---------- overview ---------- */
function renderOverview() {
  const live = state.orders.filter(o => o.status !== "cancelled");
  const today = new Date().toDateString();
  const todays = state.orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const revenue = live.reduce((a, o) => a + o.total, 0);
  const newCount = state.orders.filter(o => o.status === "new").length;
  const activeProducts = state.products.filter(p => p.active !== false).length;
  $("#stats").innerHTML = [
    { k: "New orders", v: newCount, s: "Waiting for confirmation", hi: true },
    { k: "Today's orders", v: todays.length, s: inr(todays.filter(o => o.status !== "cancelled").reduce((a, o) => a + o.total, 0)) + " today" },
    { k: "Total orders", v: state.orders.length, s: `${state.orders.filter(o => o.status === "delivered").length} delivered` },
    { k: "Revenue", v: inr(revenue), s: `${inr(live.filter(o => payOf(o).status === "paid").reduce((a, o) => a + o.total, 0))} received · rest COD due` },
    { k: "Paid by UPI", v: state.orders.filter(o => payOf(o).method === "upi").length, s: `${state.orders.filter(o => payOf(o).method !== "upi").length} cash on delivery` },
    { k: "Products", v: activeProducts, s: `${state.products.length - activeProducts} hidden` },
    { k: "Customers", v: state.customers, s: "Registered accounts" }
  ].map(x => `<div class="card stat ${x.hi ? "hi" : ""}"><small>${x.k}</small><b>${x.v}</b><span>${x.s}</span></div>`).join("");

  $("#recentOrders").innerHTML = state.orders.length
    ? state.orders.slice(0, 6).map(o => `<div class="mini-row" data-order="${o.id}">
        <div><b>${esc(o.customer.name)}</b><small>#${esc(o.orderNo)} · ${fmtDate(o.createdAt)}</small></div>
        <div style="text-align:right"><b>${inr(o.total)}</b><small>${statusPill(o.status)}</small></div></div>`).join("")
    : `<p class="empty-note">No orders yet. Orders from the website will appear here.</p>`;

  const sold = {};
  live.forEach(o => o.items.forEach(i => {
    const k = i.productId;
    sold[k] ||= { name: `${i.brand} ${i.name}`, qty: 0, amount: 0 };
    sold[k].qty += i.qty; sold[k].amount += i.lineTotal;
  }));
  const top = Object.values(sold).sort((a, b) => b.qty - a.qty).slice(0, 6);
  $("#topProducts").innerHTML = top.length
    ? top.map(t => `<div class="mini-row" style="cursor:default"><div><b>${esc(t.name)}</b><small>${t.qty} sold</small></div><b>${inr(t.amount)}</b></div>`).join("")
    : `<p class="empty-note">Sales will show here once orders come in.</p>`;
}

/* ---------- orders ---------- */
function renderOrders() {
  const counts = Object.fromEntries(STATUSES.map(s => [s, state.orders.filter(o => o.status === s).length]));
  $("#statusChips").innerHTML = [["all", "All", state.orders.length], ...STATUSES.map(s => [s, s[0].toUpperCase() + s.slice(1), counts[s]])]
    .map(([k, label, n]) => `<button class="chip ${state.orderFilter === k ? "active" : ""}" data-status="${k}">${label}<i>${n}</i></button>`).join("");
  const q = state.orderQ.toLowerCase();
  const rows = state.orders.filter(o =>
    (state.orderFilter === "all" || o.status === state.orderFilter) &&
    (!q || [o.orderNo, o.customer.name, o.customer.phone, o.customer.email, payOf(o).txnId].join(" ").toLowerCase().includes(q)));
  $("#ordersTable").innerHTML = `<thead><tr><th>Order</th><th>Customer</th><th>Products</th><th class="num">Total</th><th>Payment</th><th>Status</th></tr></thead>
    <tbody>${rows.length ? rows.map(o => `<tr class="click" data-order="${o.id}">
      <td><b>#${esc(o.orderNo)}</b><small>${fmtDate(o.createdAt)}</small></td>
      <td><b>${esc(o.customer.name)}</b><small>${esc(o.customer.phone)}</small></td>
      <td>${o.items.map(i => `${esc(i.name)} × ${i.qty}`).slice(0, 2).join("<br>")}${o.items.length > 2 ? `<small>+${o.items.length - 2} more</small>` : ""}</td>
      <td class="num"><b>${inr(o.total)}</b></td>
      <td>${payOf(o).method === "upi" ? "📱 UPI" : "💵 COD"}<small>${payPill(o)}</small></td>
      <td><select class="status-sel" data-set-status="${o.id}" aria-label="Order status">${STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty-note">No orders found.</td></tr>`}</tbody>`;
}
$("#statusChips").addEventListener("click", e => { const c = e.target.closest("[data-status]"); if (c) { state.orderFilter = c.dataset.status; renderOrders(); } });
$("#orderSearch").addEventListener("input", e => { state.orderQ = e.target.value.trim(); renderOrders(); });

async function updateOrder(id, patch, msg) {
  try {
    const o = await api(`/admin/orders/${id}`, { method: "PATCH", body: patch });
    state.orders = state.orders.map(x => x.id === id ? o : x);
    renderAll(); toast(msg);
    return o;
  } catch (ex) { toast(ex.message); }
}
document.addEventListener("change", e => {
  const s = e.target.closest("[data-set-status]");
  if (s) updateOrder(s.dataset.setStatus, { status: s.value }, `Order marked ${s.value}`).then(o => { if (o && $("#orderModal").classList.contains("open")) showOrder(o.id); });
});
document.addEventListener("click", e => {
  if (e.target.closest("select, button, a")) return;
  const row = e.target.closest("[data-order]");
  if (row) showOrder(row.dataset.order);
});

function showOrder(id) {
  const o = state.orders.find(x => x.id === id);
  if (!o) return;
  const c = o.customer;
  const waText = `Hi ${c.name}, this is Vitalyx about your order #${o.orderNo} (${inr(o.total)}).`;
  $("#orderDetail").innerHTML = `
    <h2>Order #${esc(o.orderNo)} ${statusPill(o.status)}</h2>
    <p class="muted small" style="margin:-8px 0 14px">Placed ${fmtDate(o.createdAt)} · via ${o.source === "cart" ? "cart checkout" : "Book Now"}</p>
    <div class="od-grid">
      <div><small>Name</small>${esc(c.name)}</div>
      <div><small>Mobile</small>${esc(c.phone)}</div>
      <div class="span2"><small>Email</small>${esc(c.email)}</div>
      <div class="span2"><small>Address</small>${esc(c.address).replace(/\n/g, "<br>")}</div>
    </div>
    <div class="contact-btns">
      <a class="btn btn-ghost" href="tel:+91${esc(c.phone)}">📞 Call</a>
      <a class="btn btn-ghost" href="https://wa.me/91${esc(c.phone)}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">💬 WhatsApp customer</a>
      <a class="btn btn-ghost" href="mailto:${esc(c.email)}">✉ Email</a>
    </div>
    <div class="od-items">${o.items.map(i => `<div><span><b>${esc(i.brand)} ${esc(i.name)}</b><small>${esc(i.size)}${i.flavour !== "—" ? " · " + esc(i.flavour) : ""} · ${i.qty} × ${inr(i.unitPrice)}</small></span><b>${inr(i.lineTotal)}</b></div>`).join("")}</div>
    <dl class="od-sum">
      <dt>Subtotal</dt><dd>${inr(o.subtotal)}</dd>
      ${o.discount ? `<dt>Coupon (${esc(o.coupon)})</dt><dd>− ${inr(o.discount)}</dd>` : ""}
      <dt>Delivery</dt><dd>${o.shipping ? inr(o.shipping) : "FREE"}</dd>
      <dt class="tot">Total</dt><dd class="tot">${inr(o.total)}</dd>
    </dl>
    <div class="od-pay">
      <h3>Payment ${payPill(o)}</h3>
      <div class="od-grid">
        <div><small>Method</small>${PAY_METHODS[payOf(o).method] || esc(payOf(o).method)}${payOf(o).demo ? ' <span class="demo-tag">demo</span>' : ""}</div>
        <div><small>Amount</small>${inr(o.total)}</div>
        ${payOf(o).txnId ? `<div><small>Transaction ID</small>${esc(payOf(o).txnId)}</div>` : ""}
        ${payOf(o).ref ? `<div><small>Payment ref</small>${esc(payOf(o).ref)}</div>` : ""}
        ${payOf(o).paidAt ? `<div class="span2"><small>Paid on</small>${fmtDate(payOf(o).paidAt)}</div>` : ""}
      </div>
      <label>Payment status<select id="payStatus">${["pending", "paid", "refunded"].map(s => `<option value="${s}" ${s === payOf(o).status ? "selected" : ""}>${s === "pending" ? "Unpaid" : s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></label>
    </div>
    <div class="od-actions">
      <label>Status<select class="status-sel" data-set-status="${o.id}">${STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></label>
      <label>Internal note <small>only visible here</small><textarea id="orderNote" rows="2">${esc(o.note)}</textarea></label>
      <div class="od-row"><button class="btn btn-primary" id="saveNote">Save note</button><button class="btn btn-danger" id="deleteOrder" style="margin-left:auto">Delete order</button></div>
    </div>`;
  $("#payStatus").onchange = e => updateOrder(o.id, { paymentStatus: e.target.value }, "Payment status updated").then(x => x && showOrder(x.id));
  $("#saveNote").onclick = () => updateOrder(o.id, { note: $("#orderNote").value }, "Note saved");
  $("#deleteOrder").onclick = async () => {
    if (!confirm(`Delete order #${o.orderNo}? This cannot be undone.`)) return;
    try {
      await api(`/admin/orders/${o.id}`, { method: "DELETE" });
      state.orders = state.orders.filter(x => x.id !== o.id);
      closeModal($("#orderModal")); renderAll(); toast("Order deleted");
    } catch (ex) { toast(ex.message); }
  };
  openModal($("#orderModal"));
}

/* ---------- customers ---------- */
function renderCustomers() {
  const q = state.customerQ.toLowerCase();
  const rows = state.customerList.filter(c => !q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q));
  $("#customersTable").innerHTML = `<thead><tr><th>Customer</th><th>Mobile</th><th class="num">Orders</th><th>Joined</th><th>Password</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(c => `<tr>
      <td><b>${esc(c.name)}</b><small>${esc(c.email)}</small></td>
      <td>${esc(c.phone)}</td>
      <td class="num">${c.orders}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td>${c.resetRequestedAt ? `<span class="req">Forgot password</span><small>${fmtDate(c.resetRequestedAt)}</small>` : c.mustChangePassword ? `<small>Temporary password given</small>` : `<small>—</small>`}</td>
      <td class="actions"><button data-reset-pw="${c.id}">Reset password</button></td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty-note">No customers found.</td></tr>`}</tbody>`;
}
$("#customerSearch").addEventListener("input", e => { state.customerQ = e.target.value.trim(); renderCustomers(); });
$("#customersTable").addEventListener("click", async e => {
  const b = e.target.closest("[data-reset-pw]"); if (!b) return;
  const c = state.customerList.find(x => x.id === b.dataset.resetPw);
  if (!confirm(`Reset the password of ${c.name} (${c.phone})?

Only do this after you have checked it's really them, e.g. on a call to their registered number. Their old password will stop working.`)) return;
  try {
    const { tempPassword } = await api(`/admin/customers/${c.id}/reset-password`, { method: "POST" });
    state.customerList = state.customerList.map(x => x.id === c.id ? { ...x, resetRequestedAt: "", mustChangePassword: true } : x);
    renderAll();
    const msg = `Hi ${c.name}, this is Vitalyx. Your temporary password is ${tempPassword}
Log in with your email ${c.email} and set a new password under My Account.`;
    $("#tempPwBody").innerHTML = `
      <h2>Temporary password for ${esc(c.name)}</h2>
      <p class="muted small">Share it only with the customer. It is shown once. After logging in, they will be asked to set their own password.</p>
      <div class="temp-pw"><code>${esc(tempPassword)}</code><button class="btn btn-ghost" id="copyTempPw">Copy</button></div>
      <div class="contact-btns">
        <a class="btn btn-ghost" href="https://wa.me/91${esc(c.phone)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 Send on WhatsApp</a>
        <a class="btn btn-ghost" href="tel:+91${esc(c.phone)}">📞 Call</a>
      </div>`;
    $("#copyTempPw").onclick = () => navigator.clipboard.writeText(tempPassword).then(() => toast("Copied"), () => toast("Could not copy. Please select it by hand."));
    openModal($("#tempPwModal"));
  } catch (ex) { toast(ex.message); }
});

/* ---------- products ---------- */
const thumb = p => p.image
  ? `<img class="thumb" src="${esc(p.image)}" alt="">`
  : `<span class="thumb" style="background:${esc(p.color)}">${esc(p.name.slice(0, 2).toUpperCase())}</span>`;

function renderProducts() {
  const q = state.productQ.toLowerCase();
  const rows = state.products.filter(p =>
    (!state.productCat || p.category === state.productCat) &&
    (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)));
  $("#productsTable").innerHTML = `<thead><tr><th>Product</th><th>Category</th><th>Sizes</th><th class="num">Price</th><th>On site</th><th></th></tr></thead>
    <tbody>${rows.length ? rows.map(p => `<tr class="${p.active === false ? "off" : ""}">
      <td><div class="pname">${thumb(p)}<div><b>${esc(p.name)}</b><small>${esc(p.brand)}${p.badge ? " · " + esc(p.badge) : ""}</small></div></div></td>
      <td>${esc(catName(p.category))}</td>
      <td>${esc(p.sizes.join(", "))}<small>${p.flavours[0] === "—" ? "No flavours" : esc(p.flavours.length + " flavour" + (p.flavours.length > 1 ? "s" : ""))}</small></td>
      <td class="num"><b>${inr(p.price)}</b><small><s>${inr(p.mrp)}</s></small></td>
      <td><label class="switch" title="Show on website"><input type="checkbox" data-toggle="${p.id}" ${p.active !== false ? "checked" : ""}><span></span></label></td>
      <td class="actions"><button data-edit="${p.id}">Edit</button><button data-del="${p.id}" style="color:var(--danger)">Delete</button></td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty-note">No products found.</td></tr>`}</tbody>`;
}
$("#productSearch").addEventListener("input", e => { state.productQ = e.target.value.trim(); renderProducts(); });
$("#catFilter").addEventListener("change", e => { state.productCat = e.target.value; renderProducts(); });
$("#catFilter").innerHTML += CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

const productBody = p => ({ ...p, goals: p.goals, sizes: p.sizes, flavours: p.flavours[0] === "—" ? [] : p.flavours, highlights: p.highlights });
async function saveProduct(id, body) {
  const p = await api(id ? `/admin/products/${id}` : "/admin/products", { method: id ? "PUT" : "POST", body });
  state.products = id ? state.products.map(x => x.id === id ? p : x) : [...state.products, p];
  renderAll();
  return p;
}
$("#productsTable").addEventListener("change", async e => {
  const t = e.target.closest("[data-toggle]"); if (!t) return;
  const p = state.products.find(x => x.id === +t.dataset.toggle);
  try { await saveProduct(p.id, { ...productBody(p), active: t.checked }); toast(t.checked ? "Product is now on the website" : "Product hidden from the website"); }
  catch (ex) { t.checked = !t.checked; toast(ex.message); }
});
$("#productsTable").addEventListener("click", async e => {
  const ed = e.target.closest("[data-edit]");
  if (ed) return openProductForm(state.products.find(x => x.id === +ed.dataset.edit));
  const del = e.target.closest("[data-del]");
  if (del) {
    const p = state.products.find(x => x.id === +del.dataset.del);
    if (!confirm(`Delete "${p.name}"? It will be removed from the website. Tip: use the On site switch to hide it instead.`)) return;
    try {
      await api(`/admin/products/${p.id}`, { method: "DELETE" });
      state.products = state.products.filter(x => x.id !== p.id);
      renderAll(); toast("Product deleted");
    } catch (ex) { toast(ex.message); }
  }
});

/* product form */
const form = $("#productForm");
form.category.innerHTML = `<option value="">Choose…</option>` + CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
$("#goalChecks").innerHTML = GOALS.map(g => `<label><input type="checkbox" name="goals" value="${g.id}"> ${esc(g.name)}</label>`).join("");
$("#addProductBtn").addEventListener("click", () => openProductForm(null));

function setImage(url) {
  state.image = url || "";
  $("#imgPreview").innerHTML = url ? `<img src="${esc(url)}" alt="Product photo">` : "No photo";
  $("#imgRemove").hidden = !url;
}
function openProductForm(p) {
  state.editing = p ? p.id : null;
  form.reset(); $("#productError").hidden = true;
  $("#productFormTitle").textContent = p ? "Edit product" : "Add product";
  $("#brandList").innerHTML = [...new Set(state.products.map(x => x.brand))].map(b => `<option value="${esc(b)}">`).join("");
  const v = p || { color: "#0b6e4f", accent: "#e6f4ee", rating: 4.5, reviews: 0, active: true, sizes: [], flavours: [], goals: [], highlights: [] };
  for (const k of ["name", "brand", "category", "price", "mrp", "badge", "protein", "servings", "rating", "reviews", "color", "accent", "desc"]) {
    if (form[k]) form[k].value = v[k] ?? "";
  }
  if (form.protein.value === "—") form.protein.value = "";
  form.sizes.value = (v.sizes || []).join(", ");
  form.flavours.value = (v.flavours || []).filter(f => f !== "—").join(", ");
  form.highlights.value = (v.highlights || []).join("\n");
  form.active.checked = v.active !== false;
  $$("[name=goals]", form).forEach(c => c.checked = (v.goals || []).includes(c.value));
  setImage(v.image);
  openModal($("#productModal"));
  setTimeout(() => form.name.focus(), 50);
}

// Shrink the photo in the browser before upload (max 900px, JPEG) so pages stay fast
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Could not read this image"));
    img.src = URL.createObjectURL(file);
  });
}
$("#imgInput").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  $("#imgPreview").textContent = "Uploading…";
  try {
    const { url } = await api("/admin/images", { method: "POST", body: { dataUrl: await resizeImage(file) } });
    setImage(url);
  } catch (ex) { setImage(state.image); toast(ex.message); }
});
$("#imgRemove").addEventListener("click", () => setImage(""));

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form), btn = $("[type=submit]", form), err = $("#productError");
  const body = {
    ...Object.fromEntries([...fd].filter(([k]) => k !== "goals")),
    goals: fd.getAll("goals"),
    sizes: fd.get("sizes").split(","), flavours: fd.get("flavours").split(","),
    highlights: fd.get("highlights").split("\n"),
    active: form.active.checked, image: state.image
  };
  err.hidden = true; btn.disabled = true;
  try {
    await saveProduct(state.editing, body);
    closeModal($("#productModal"));
    toast(state.editing ? "Product updated" : "Product added to the website");
  } catch (ex) { err.textContent = ex.message; err.hidden = false; }
  finally { btn.disabled = false; }
});

/* ---------- start ---------- */
api("/admin/me").then(showApp).catch(showLogin);
