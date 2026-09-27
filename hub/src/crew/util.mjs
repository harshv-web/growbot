// Shared helpers for the crew.
export const DAY = 24 * 3600e3;
export const isWeekday = d => d.getDay() >= 1 && d.getDay() <= 5;
export const ist = (d = new Date()) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
export const mins = d => d.getHours() * 60 + d.getMinutes();
export const toMin = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
export const fromMin = m => String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0") + ":" + String(((m % 60) + 60) % 60).padStart(2, "0");
export const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
export const sameDay = (a, b = new Date()) => new Date(a).toDateString() === new Date(b).toDateString();
// Do something at most once per key per day (keys live in soul.status.once).
export function once(ctx, key, fn, scope = new Date().toDateString()) {
  const o = ctx.soul.status.once ||= {}; const k = key + "|" + scope;
  if (o[k]) return false; o[k] = true;
  for (const x of Object.keys(o)) if (!x.endsWith(new Date().toDateString()) && !x.includes("|w")) delete o[x];
  fn(); return true;
}
export const week = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return "w" + x.toDateString(); };
export const insight = (ctx, name, data) => { (ctx.soul.status.insights ||= {})[name] = { ...data, t: new Date().toISOString() }; return data; };
export const texts = (ctx, ms, pred = () => true) => ctx.soul.since(ms).filter(e => e.kind === "input" && e.text && !["notification", "email", "sms", "telemetry"].includes(e.via) && pred(e));

// A tiny English + Hindi (Roman) mood lexicon: good enough to see a trend, never used to judge a single message.
const POS = "happy great good awesome amazing love loved excited proud yay nice calm relaxed fun shipped done won finally thanks thank grateful mast badhiya accha achha khush maza bindaas sahi".split(" ");
const NEG = "tired sad stressed stress angry annoyed upset lonely bored burnt burned anxious worried sick ill bad awful hate exhausted frustrated overwhelmed thak thaka pareshan bura udaas gussa bekaar tension".split(" ");
export function sentiment(text) {
  const w = String(text).toLowerCase().match(/[a-z]+/g) || []; let s = 0;
  for (const x of w) { if (POS.includes(x)) s++; if (NEG.includes(x)) s--; }
  if (/\b(not|nahi|na)\s+(good|happy|accha|great|fine)\b/i.test(text)) s -= 2;
  return Math.max(-1, Math.min(1, s / 2));
}

// Spend categories from merchant names in bank SMS / notifications.
export const SPEND_CATS = {
  food: /zepto|swiggy|zomato|instamart|blinkit|bigbasket|dunzo|country delight|licious|eatsure|starbucks|chai|cafe|restaurant|dominos|mcdonald|kfc/i,
  travel: /uber|ola|rapido|namma metro|bmrcl|metro|irctc|redbus|makemytrip|indigo|air india|fuel|petrol|parking|fastag/i,
  scooter: /ather|charging|charge grid/i,
  bills: /bescom|bwssb|electricity|water|airtel|jio|vodafone|vi |act fibernet|broadband|gas|rent/i,
  shopping: /amazon|flipkart|myntra|ajio|nykaa|meesho|decathlon|ikea|croma|reliance digital/i,
  subscriptions: /netflix|spotify|youtube|prime|hotstar|jiocinema|apple|icloud|google one|adobe|figma|notion|chatgpt|claude|anthropic|github/i,
  health: /pharm|apollo|medplus|1mg|pharmeasy|hospital|clinic|cult|gym/i
};
export const spendCat = t => Object.entries(SPEND_CATS).find(([, re]) => re.test(t))?.[0] || "other";
export const merchant = t => ((String(t).match(/\b(?:to|at|towards|for)\s+([A-Z][A-Za-z0-9&.* -]{2,30})/) || [])[1] || "").replace(/\s+(on|via|ref|upi|a\/c).*$/i, "").trim() || null;
