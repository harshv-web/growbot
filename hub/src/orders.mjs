// Orders and habits, assembled from notifications, emails and bank SMS (no app APIs needed).
const APPS = { zepto: "Zepto", swiggy: "Swiggy", instamart: "Instamart", blinkit: "Blinkit", zomato: "Zomato", bigbasket: "BigBasket", amazon: "Amazon", flipkart: "Flipkart", "country delight": "Country Delight" };

export function detectOrder(text, source = "") {
  const s = (source + " " + text).toLowerCase();
  const app = Object.keys(APPS).find(k => s.includes(k));
  if (!app) return null;
  const amt = s.match(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d{1,2})?)/i);
  const stage = /deliver(ed|y done)|arrived/.test(s) ? "delivered" : /on the way|out for delivery|picked up|arriving/.test(s) ? "on_the_way" : /placed|confirmed|order received|thank you for (your )?order/.test(s) ? "placed" : /debited|paid|spent/.test(s) ? "paid" : "update";
  const items = (text.match(/(?:items?|order)[:\-]\s*([^.\n]{3,120})/i) || [])[1] || null;
  return { app: APPS[app], amount: amt ? parseFloat(amt[1].replace(/,/g, "")) : null, stage, items };
}

// Join events into orders: same app within 3 hours = same order.
export function orders(events) {
  const out = [];
  for (const e of events.filter(e => e.kind === "order").sort((a, b) => Date.parse(a.t) - Date.parse(b.t))) {
    const last = out.findLast?.(o => o.app === e.order.app && Date.parse(e.t) - Date.parse(o.t) < 3 * 3600e3);
    if (last) { last.amount = last.amount ?? e.order.amount; last.items = last.items || e.order.items; last.stage = e.order.stage; last.sources.push(e.source || e.from); }
    else out.push({ app: e.order.app, t: e.t, amount: e.order.amount, items: e.order.items, stage: e.order.stage, sources: [e.source || e.from] });
  }
  return out;
}

export function habits(events) {
  const os = orders(events), byApp = {}, hours = new Array(24).fill(0);
  os.forEach(o => { const h = new Date(o.t).getHours(); hours[h]++; (byApp[o.app] ||= { n: 0, sum: 0, withAmt: 0 }).n++; if (o.amount) { byApp[o.app].sum += o.amount; byApp[o.app].withAmt++; } });
  const lines = Object.entries(byApp).sort((a, b) => b[1].n - a[1].n).map(([app, v]) => `${app}: ${v.n} orders${v.withAmt ? `, avg ₹${Math.round(v.sum / v.withAmt)}` : ""}`);
  const late = os.filter(o => new Date(o.t).getHours() >= 21).length;
  if (os.length >= 4 && late / os.length > 0.4) lines.push(`${Math.round(late / os.length * 100)}% of orders are after 9 pm`);
  return { count: os.length, lines, peakHour: hours.indexOf(Math.max(...hours)) };
}
