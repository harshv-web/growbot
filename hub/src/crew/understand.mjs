// UNDERSTAND: agents that turn what happens into knowledge about you (the Model of Me).
import { DAY, insight, texts, sentiment, median, fromMin, spendCat, week } from "./util.mjs";
import { orders, habits } from "../orders.mjs";
import { parseWhen, taskTitle } from "../memory.mjs";
import { readJSON } from "../router.mjs";

// ---- rule-based fact extraction (the Librarian's free path) ----
const FACT_RULES = [
  [/\bi (?:really )?(?:like|love|prefer|enjoy)\s+(.{2,80})/i, "preference", m => ["likes " + m[1], m[1]]],
  [/\bi (?:don'?t like|hate|dislike|can'?t stand|avoid)\s+(.{2,80})/i, "preference", m => ["dislikes " + m[1], "dislikes " + m[1]]],
  [/\bi(?:'m| am) allergic to\s+(.{2,60})/i, "health", m => ["allergic to " + m[1], "allergy"]],
  [/\bi live (?:in|at|near)\s+(.{2,60})/i, "places", m => [m[1], "home area"]],
  [/\bmy office is (?:in|at|near)\s+(.{2,60})/i, "places", m => [m[1], "office area"]],
  [/\bmy (mom|mother|dad|father|sister|brother|girlfriend|boyfriend|wife|husband|partner|best friend|flatmate|roommate|manager|boss)(?:'s name)? is\s+([\p{L} .'-]{2,40})/iu, "people", m => [m[2].trim(), m[1]]],
  [/\bmy ([\p{L} ]{2,30}?) is\s+(.{1,80})/iu, "other", m => [m[2], m[1]]],
  [/\b(?:my goal is|i want to|i'?m trying to)\s+(.{4,100})/i, "goal", m => [m[1], m[1].slice(0, 40)]],
  [/\bi (?:usually|always|normally)\s+(.{4,100})/i, "routine", m => [m[1], m[1].slice(0, 40)]]
];
export function ruleFacts(text) {
  const out = [], clean = text.replace(/^(remember|note)( that)?[:,]?\s*/i, "").replace(/[.!]+$/, "");
  for (const [re, cat, f] of FACT_RULES) { const m = clean.match(re); if (m) { const [value, key] = f(m); out.push({ cat, key: key.trim(), value: value.trim() }); break; } }
  if (!out.length && /^(remember|note)\b/i.test(text)) out.push({ cat: "other", key: clean.slice(0, 40), value: clean });
  return out;
}
const own = ev => ev && ev.kind === "input" && ev.text && !["notification", "email", "sms", "telemetry", "health", "location", "focus"].includes(ev.via);

export default [
  { name: "librarian", dept: "understand", title: "Librarian", role: "Learns lasting facts about you from what you say and write.", on: ["input"], tier: "fast",
    async run(ctx, ev) {
      if (!own(ev) || ev.text.split(/\s+/).length < 3) return null;
      let facts = ruleFacts(ev.text).map(f => ({ ...f, confidence: 0.75 }));
      if (!facts.length && ev.text.split(/\s+/).length >= 6) {
        const r = await ctx.router.text("fast", `Extract lasting personal facts about the speaker (Harsh) from his message: preferences, people, places, routines, health, goals, work, money habits. Ignore one-off events and questions. Reply ONLY JSON: {"facts":[{"category":"identity|people|places|food|routine|preference|health|work|money|scooter|home|goal|other","key":"short label","fact":"short fact","confidence":0.5-1}]} (empty list if none).`, ev.text, { agent: "librarian" });
        const j = readJSON(r?.text); if (j?.facts) { facts = j.facts.filter(f => f.fact).map(f => ({ cat: f.category, key: f.key, value: f.fact, confidence: +f.confidence || 0.6 })); ctx.model = r.model; }
      }
      const saved = facts.map(f => ctx.memory.remember({ ...f, source: "librarian" }));
      return saved.length ? "Learned: " + saved.map(f => f.value).join("; ") : null;
    } },
  { name: "mood-reader", dept: "understand", title: "Mood reader", role: "Reads the feeling in what you say (English + Hindi) and keeps a daily mood line.", on: ["input"],
    run(ctx, ev) { if (!own(ev)) return null; const s = sentiment(ev.text); if (!s) return null;
      const m = ctx.soul.status.userMood ||= {}; const d = new Date().toISOString().slice(0, 10); const x = m[d] ||= { sum: 0, n: 0 }; x.sum += s; x.n++;
      for (const k of Object.keys(m).sort().slice(0, -30)) delete m[k];
      return `${s > 0 ? "up" : "down"} (${(x.sum / x.n).toFixed(2)} today)`; } },
  { name: "people", dept: "understand", title: "People keeper", role: "Remembers the people in your life and when you last talked.", on: ["input", "message"],
    run(ctx, ev) {
      const ppl = ctx.soul.status.people ||= {}; const found = [];
      if (ev.kind === "message" && ev.title && ev.app !== "Email" && !/\d{4,}/.test(ev.title)) found.push([ev.title.replace(/\s*\(\d+ messages?\)$/, "").trim(), ev.app]);
      if (own(ev)) for (const m of ev.text.matchAll(/\b(?:with|call(?:ed)?|met|told|texted|meet|miss|visit(?:ed)?)\s+([A-Z][a-z]{2,15}(?:\s[A-Z][a-z]{2,15})?)/g)) found.push([m[1], "said"]);
      for (const [name, via] of found) { const p = ppl[name] ||= { n: 0 }; p.n++; p.last = ev.t; p.via = via; }
      return found.length ? found.map(f => f[0]).join(", ") : null; } },
  { name: "routine-miner", dept: "understand", title: "Routine miner", role: "Learns your real rhythm from two weeks of data: wake, leave, office, home, sleep.", at: ["04:05"],
    run(ctx) {
      const ev = ctx.soul.since(14 * DAY), m = e => { const d = new Date(e.t); return d.getHours() * 60 + d.getMinutes(); };
      const days = {}; for (const e of ev) (days[e.t.slice(0, 10)] ||= []).push(e);
      const wake = [], leave = [], office = [], home = [], sleep = [];
      for (const list of Object.values(days)) {
        const w = list.find(e => e.kind === "wake"); if (w) wake.push(m(w));
        const rs = list.find(e => e.kind === "ride" && e.stage === "start" && m(e) < 720); if (rs) leave.push(m(rs));
        const o = list.find(e => e.kind === "place" && e.place === "office"); if (o) office.push(m(o));
        const h = list.filter(e => e.kind === "place" && e.place === "home").at(-1); if (h) home.push(m(h));
        const last = list.filter(e => e.kind === "input").at(-1); if (last && (m(last) > 1200 || m(last) < 240)) sleep.push(m(last) < 240 ? m(last) + 1440 : m(last));
      }
      const r = { wake: median(wake), leave: median(leave), office: median(office), home: median(home), lastActive: median(sleep) };
      const out = {}; for (const [k, v] of Object.entries(r)) if (v != null) { out[k] = fromMin(v); ctx.memory.remember({ cat: "routine", key: "usual " + k + " time", value: fromMin(v), source: "routine-miner", confidence: 0.6 }); }
      insight(ctx, "routine", out); ctx.soul.status.routine = out;
      return Object.entries(out).map(([k, v]) => `${k} ${v}`).join(" · ") || "need more days";
    } },
  { name: "habit-miner", dept: "understand", title: "Habit miner", role: "Finds patterns in orders and spending: which days, which hours, how much.", at: ["04:10"], on: ["order"],
    run(ctx) { const ev = ctx.soul.since(30 * DAY), os = orders(ev), h = habits(ev), dow = new Array(7).fill(0);
      os.forEach(o => dow[new Date(o.t).getDay()]++);
      const top = dow.indexOf(Math.max(...dow)), names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const lines = [...h.lines]; if (os.length >= 6) lines.push(`Most orders on ${names[top]}s`);
      ctx.soul.status.habits = { ...h, lines, byDay: dow };
      return lines.slice(0, 2).join(" · ") || "need more orders"; } },
  { name: "spend-analyst", dept: "understand", title: "Spend analyst", role: "Sorts every rupee into food, travel, bills, shopping, subscriptions, health.", at: ["21:05"], on: ["spend"],
    run(ctx) { const now = new Date(), month = ctx.soul.since(31 * DAY).filter(e => e.kind === "spend" && new Date(e.t).getMonth() === now.getMonth());
      const cats = {}; for (const e of month) { const c = e.cat || spendCat(e.text || ""); cats[c] = (cats[c] || 0) + (e.amount || 0); }
      ctx.soul.status.spendCats = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]));
      const top = Object.entries(ctx.soul.status.spendCats)[0]; return top ? `Top this month: ${top[0]} ₹${top[1]}` : "no spends yet"; } },
  { name: "topics", dept: "understand", title: "Topic tracker", role: "What's been on your mind this week, in a few words.", at: ["18:05"], days: [0], tier: "fast",
    async run(ctx) { const t = texts(ctx, 7 * DAY).map(e => e.text); if (t.length < 5) return "quiet week";
      const r = await ctx.router.text("fast", "List the 3-5 themes on Harsh's mind this week from his messages to his AI. Reply ONLY JSON {\"themes\":[\"2-4 words\"]}.", t.slice(-150).join("\n"), { agent: "topics" });
      const j = readJSON(r?.text); if (r) ctx.model = r.model;
      const themes = j?.themes || topWords(t);
      insight(ctx, "topics", { themes, week: week() }); return themes.join(", "); } },
  { name: "promises", dept: "understand", title: "Promise keeper", role: "Catches promises you make (\"I'll send it by Friday\") and turns them into tasks.", on: ["input"],
    run(ctx, ev) { if (!own(ev)) return null;
      const m = ev.text.match(/\b(?:i'?ll|i will|i have to|i need to|i must|i promised to|bhej dunga|kar dunga)\s+(.{4,80})/i); if (!m || /\?$/.test(ev.text)) return null;
      const due = parseWhen(ev.text); if (!due && !/\b(today|tonight|tomorrow|by|before|kal|aaj)\b/i.test(ev.text)) return null;
      const t = ctx.memory.addTask({ title: taskTitle(m[1]), due, from: "promises" }); ctx.soul.log({ kind: "task", id: t.id, title: t.title, due: t.due, from: "promises" });
      return `Task: ${t.title}${due ? " · " + new Date(due).toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}`; } },
  { name: "ideas", dept: "understand", title: "Idea catcher", role: "Saves ideas the moment you say them (\"idea: …\", \"what if…\", \"I should build…\").", on: ["input"],
    run(ctx, ev) { if (!own(ev)) return null; const m = ev.text.match(/^(?:idea[:\-]\s*|what if\s+|i should (?:build|make|try)\s+)(.+)/i); if (!m) return null;
      const ideas = ctx.soul.status.ideas ||= []; ideas.push({ text: m[1].slice(0, 200), t: ev.t }); ctx.soul.status.ideas = ideas.slice(-100);
      return "Idea saved: " + m[1].slice(0, 60); } },
  { name: "curiosity", dept: "understand", title: "Gap finder", role: "Notices questions it couldn't answer well, so you know what to connect next.", on: ["answer"],
    run(ctx, ev) { if (ev.model !== "rules" || !/can't see|need a model key|no orders seen|I heard you|nothing on your calendar/i.test(ev.line || "")) return null;
      const g = ctx.soul.status.gaps ||= []; g.push({ q: ctx.soul.recent.find(e => e.id === ev.ref)?.text || "", why: ev.line, t: ev.t }); ctx.soul.status.gaps = g.slice(-30);
      return "gap: " + ev.line.slice(0, 60); } }
];
const STOPW = new Set("the a an and or of to in on at is are was i me my you your it this that what when where who how for with from about have has be will can do did jeevo please kya hai ka ki ke se ko mein aur".split(" "));
function topWords(t) { const c = {}; for (const s of t) for (const w of s.toLowerCase().match(/[a-z]{4,}/g) || []) if (!STOPW.has(w)) c[w] = (c[w] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]); }
