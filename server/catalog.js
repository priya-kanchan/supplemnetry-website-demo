// Reads the site's js/data.js so the server and the website share one source
// for categories, goals and the starter product list.
import fs from "node:fs";
import vm from "node:vm";

export function loadSiteData(file) {
  const code = fs.readFileSync(file, "utf8") + "\n;({ CATEGORIES, GOALS, BRANDS, PRODUCTS });";
  const ctx = vm.createContext({ location: { protocol: "http:" } });
  return vm.runInContext(code, ctx);
}

// Pricing — must match unitPrice() / initCart() in public/js/main.js
export const COUPONS = { WELCOME10: 0.10, FIT15: 0.15 };
export const FREE_SHIPPING_FROM = 999;
export const SHIPPING_FEE = 79;

const sizeMul = (p, size) => 1 + Math.max(0, p.sizes.indexOf(size)) * 0.85;
export const unitPrice = (p, size) => Math.round(p.price * sizeMul(p, size));

export function priceOrder(lines, coupon) {
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const rate = COUPONS[coupon] || 0;
  const discount = Math.round(subtotal * rate);
  const shipping = subtotal - discount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  return { subtotal, coupon: rate ? coupon : "", discount, shipping, total: subtotal - discount + shipping };
}
