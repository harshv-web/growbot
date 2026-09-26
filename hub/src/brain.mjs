// One input, many ways → classify → answer simply (one line) with depth on tap.
import { detectOrder, orders, habits } from "./orders.mjs";

const DAY = 24 * 3600e3;
const isToday = t => new Date(t).toDateString() === new Date().toDateString();

export class Brain {
  constructor(soul, router, cfg, profile) { this.soul = soul; this.router = router; this.cfg = cfg; this.profile = profile || {}; }

  // kinds: voice | text | photo | share | nfc | button | touch | notification | email | sms | telemetry
  async input(inp) {
    const ev = this.soul.log({ kind: "input", via: inp.kind, from: inp.from || "unknown", text: inp.text || "", data: inp.data || null });
    const text = (inp.text || "").trim();
    this.appraise(text);
    if (inp.kind === "touch") { this.soul.sensation(inp.from || "keychain", inp.data?.long ? "cosy" : "tickled"); this.soul.feel("petted"); return { line: "Hehe.", deep: null }; }
    if (inp.kind === "shake") { this.soul.sensation(inp.from || "keychain", "dizzy"); this.soul.feel("played"); return { line: "Whoa, dizzy.", deep: null }; }
    if (inp.kind === "nfc") return this.nfc(inp.data?.tag);
    if (!text) return { line: "I'm here.", deep: null };
    if (inp.kind === "telemetry" || inp.kind === "sms") return this.telemetry(text, inp);
    const chore = Object.keys(this.profile.chores || {}).find(c => new RegExp("\\b(did|done|paid|finished|kar (diya|li))\\b.*" + c.split(" ")[0], "i").test(text) || new RegExp(c.split(" ")[0] + ".*\\b(done|paid|ho gaya)\\b", "i").test(text));
    if (chore) { this.soul.log({ kind: "chore", name: chore }); this.soul.feel("praised", 0.5); return { line: `${chore[0].toUpperCase() + chore.slice(1)}: done. Nice.`, deep: null }; }
    const o = detectOrder(text, inp.from);
    if (o && inp.kind !== "voice" && inp.kind !== "text") { this.soul.log({ kind: "order", order: o, source: inp.from }); return { line: `Noted: ${o.app} ${o.stage.replace(/_/g, " ")}.`, deep: null }; }
    const intent = await this.classify(text);
    if (intent === "log") { this.soul.log({ kind: "note", text, ref: ev.id }); return { line: "Saved.", deep: null }; }
    this.soul.sensation("tablet", "thinking");
    const ans = await this.answer(text);
    this.soul.sensation("tablet", "talking");
    this.soul.log({ kind: "answer", ref: ev.id, line: ans.line, deep: ans.deep, model: ans.model || "rules" });
    return ans;
  }

  appraise(t) {
    const s = t.toLowerCase();
    if (/\b(hi|hello|hey|good morning|namaste)\b/.test(s)) this.soul.feel("greeted");
    if (/\b(thanks|thank you|good job|love you|well done|shabash)\b/.test(s)) { this.soul.feel("praised"); this.soul.sensation("tablet", "love"); }
  }

  async classify(text) {
    const s = text.toLowerCase();
    if (/^(remember|note|log|save)\b/.test(s)) return "log";
    if (/\?|^(what|when|where|who|how|why|can|should|do i|did i|is|are|tell|show)\b|kya|kab|kaise/.test(s)) return "ask";
    const r = await this.router.text("classify", "Classify the user's message to their personal AI. Reply with exactly one word: ask, log, do or ignore.", text);
    const w = (r?.text || "ask").trim().toLowerCase().split(/\W/)[0];
    return ["ask", "log", "do", "ignore"].includes(w) ? w : "ask";
  }

  context() {
    const ev = this.soul.since(DAY), st = this.soul.status;
    const os = orders(this.soul.since(30 * DAY)), todayOrders = os.filter(o => isToday(o.t));
    const msgs = ev.filter(e => e.kind === "message" && e.needsYou).slice(-10);
    return {
      now: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      mood: this.soul.emotion.express().text,
      scooter: st.scooter || null, calendar: st.calendar || null,
      todayOrders, habits: habits(this.soul.since(30 * DAY)),
      needsYou: msgs.map(m => `${m.app}: ${m.title} — ${m.summary}`),
      notes: ev.filter(e => e.kind === "note").slice(-10).map(e => e.text),
      facts: this.soul.facts,
      feelingsThisWeek: this.soul.since(7 * DAY).filter(e => e.kind === "feeling").map(e => e.text).slice(-10),
      winsThisWeek: this.soul.since(7 * DAY).filter(e => e.kind === "win").map(e => e.text).slice(-10),
      chores: this.soul.status.chores || null
    };
  }

  async answer(q) {
    const ctx = this.context();
    const p = this.profile;
    const system = `You are ${this.cfg.name}, ${this.cfg.owner}'s personal AI creature in Bengaluru. Who he is: ${p.about || ""} His rhythm: ${(p.rhythm || []).join("; ")}. What he cares about: ${(p.cares || []).join(", ")}. What wears him down: ${(p.drains || []).join(", ")}. You know him like a close friend who lives with him: notice how he's doing, celebrate small wins, be honest and kind, never preachy. Speak English or Hindi, matching him. Style: calm, warm, very brief, like a 2047 car interface. Reply ONLY as JSON: {"line": "<one plain sentence, max 18 words>", "deep": "<optional markdown with the details, sources and options>"}. Use only the context given; if it isn't there, say so in the line. Never invent orders, messages or numbers.`;
    const user = `CONTEXT:\n${JSON.stringify(ctx)}\n\nQUESTION: ${q}`;
    const r = await this.router.text("chat", system, user);
    if (r) {
      try { const j = JSON.parse(r.text.replace(/^```(json)?|```$/g, "").trim()); return { line: j.line, deep: j.deep || null, model: r.model }; }
      catch { return { line: r.text.split("\n")[0].slice(0, 160), deep: r.text, model: r.model }; }
    }
    return this.rules(q, ctx);
  }

  // Works with no model keys at all.
  rules(q, ctx) {
    const s = q.toLowerCase();
    if (/tired|thak|stressed|sad|lonely|bura|bored|burnt|burned/.test(s)) { this.soul.log({ kind: "feeling", who: "owner", text: q }); this.soul.sensation("tablet", "love"); return { line: "I'm here. Want me to hold everything else till tomorrow?", deep: "I've noted how you feel. Tonight I'll keep nudges quiet unless something is urgent." }; }
    if (/shipped|done|finished|posted|got it|nailed/.test(s)) { this.soul.feel("praised"); this.soul.log({ kind: "win", text: q }); return { line: "Yesss. That's a win. Logged it.", deep: null }; }
    if (/order|zepto|swiggy|instamart|blinkit|mangaya/.test(s)) {
      if (!ctx.todayOrders.length) return { line: "No orders seen today.", deep: ctx.habits.lines.length ? "Last 30 days:\n- " + ctx.habits.lines.join("\n- ") : null };
      return { line: "Today: " + ctx.todayOrders.map(o => `${o.app}${o.amount ? " ₹" + o.amount : ""}`).join(", ") + ".", deep: ctx.todayOrders.map(o => `- ${o.app} · ${o.stage}${o.items ? " · " + o.items : ""} (from ${o.sources.join(", ")})`).join("\n") };
    }
    if (/scooter|ather|battery|range|charg|\btyres?\b|\btires?\b/.test(s)) {
      const sc = ctx.scooter;
      if (!sc) return { line: "I can't see the scooter yet.", deep: "Add your Ather token and endpoint in the hub config to connect it." };
      return { line: `Scooter at ${sc.soc ?? "?"}%, about ${sc.rangeKm ?? "?"} km.${sc.tyreWarn ? " Check the tyres." : ""}`, deep: "```json\n" + JSON.stringify(sc, null, 2) + "\n```" };
    }
    if (/today|schedule|meeting|calendar|aaj/.test(s)) {
      const c = ctx.calendar;
      if (!c || !c.today?.length) return { line: "Nothing on your calendar today.", deep: null };
      return { line: `${c.today.length} things today; first: ${c.today[0].summary} at ${c.today[0].time}.`, deep: c.today.map(e => `- ${e.time} ${e.summary}`).join("\n") };
    }
    if (/message|mail|whatsapp|anyone/.test(s)) {
      return ctx.needsYou.length ? { line: `${ctx.needsYou.length} messages need you.`, deep: ctx.needsYou.map(m => "- " + m).join("\n") } : { line: "Nothing needs you right now.", deep: null };
    }
    if (/how are you|kaisa|feel/.test(s)) return { line: `I feel ${ctx.mood.toLowerCase()}. And you?`, deep: null };
    return { line: "I heard you. Give me a model key to think deeper.", deep: null };
  }

  telemetry(text, inp) {
    const s = text.toLowerCase(), sc = this.soul.status.scooter;
    if (/ride started/.test(s)) { this.soul.log({ kind: "ride", stage: "start", via: inp.from }); this.soul.sensation("keychain", "focused"); return { line: "Ride mode. Eyes on the road.", deep: null }; }
    if (/ride ended/.test(s)) { this.soul.log({ kind: "ride", stage: "end", place: inp.data || null }); this.soul.status.parked = { t: new Date().toISOString(), ...(inp.data || {}) }; return { line: "Parked. I saved the spot." + (sc?.soc != null ? ` Scooter ${sc.soc}%.` : ""), deep: null }; }
    if (/arrived at office/.test(s)) { this.soul.log({ kind: "place", place: "office" }); const c = this.soul.status.calendar?.today?.[0]; return { line: c ? `At office. First: ${c.summary} at ${c.time}.` : "At office. Calendar's clear.", deep: null }; }
    if (/left office/.test(s)) { this.soul.log({ kind: "place", place: "left-office" }); return { line: "Done for the day. Ride safe.", deep: null }; }
    if (/arrived home/.test(s)) { this.soul.log({ kind: "place", place: "home" }); this.soul.feel("greeted"); const due = (this.soul.status.chores || []).filter(c => c.due).map(c => c.name).slice(0, 2); return { line: "Welcome home." + (due.length ? ` Pending: ${due.join(", ")}.` : ""), deep: null }; }
    if (/woke up/.test(s)) { this.soul.log({ kind: "wake" }); this.soul.feel("greeted"); return { line: "Morning. Chai first.", deep: null }; }
    if (/keys (arrived|left)/.test(s)) { this.soul.log({ kind: "presence", body: "keys", state: s.includes("arrived") ? "desk" : "away" }); return { line: "", deep: null }; }
    const amt = s.match(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)/);
    if (/debited|spent|paid/.test(s) && amt) { this.soul.log({ kind: "spend", amount: +amt[1].replace(/,/g, ""), text }); const o = detectOrder(text, inp.from); if (o) this.soul.log({ kind: "order", order: o, source: "sms" }); return { line: `Logged ₹${amt[1]}.`, deep: null }; }
    this.soul.log({ kind: "telemetry", text, from: inp.from });
    return { line: "", deep: null };
  }

  nfc(tag) {
    const map = { door: ["Bye. Scooter check done.", "leave"], helmet: ["Ride safe. Ride mode on.", "ride"], bed: ["Good night.", "sleep"], desk: ["Focus mode.", "focus"], pills: ["Dose logged.", "meds"] };
    const [line, what] = map[tag] || ["Tap noted.", "tap"];
    this.soul.log({ kind: "nfc", tag, what });
    if (what === "ride") this.soul.sensation("keychain", "focused");
    if (what === "sleep") this.soul.feel("night");
    return { line, deep: null };
  }
}
