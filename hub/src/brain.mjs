// One input, many ways → classify → answer simply (one line) with depth on tap.
import { detectOrder, orders, habits } from "./orders.mjs";
import { parseWhen, taskTitle } from "./memory.mjs";
import { spendCat, merchant } from "./crew/util.mjs";
import { readJSON } from "./router.mjs";

const DAY = 24 * 3600e3;
export const LOOK = /\b(what do you see|what can you see|look at|take a look|see this|read this)\b|dekho|kya dikh/i;
const isToday = t => new Date(t).toDateString() === new Date().toDateString();

export class Brain {
  constructor(soul, router, cfg, profile, snap, memory) { this.soul = soul; this.router = router; this.cfg = cfg; this.profile = profile || {}; this.snap = snap; this.memory = memory; this.crew = null; this.ctx = null; }

  // kinds: voice | text | photo | share | nfc | button | touch | notification | email | sms | telemetry
  async input(inp) {
    const ev = this.soul.log({ kind: "input", via: inp.kind, from: inp.from || "unknown", text: inp.text || "", data: inp.data || null });
    const text = (inp.text || "").trim();
    this.appraise(text);
    if (inp.kind === "touch") { this.soul.sensation(inp.from || "keychain", inp.data?.long ? "cosy" : "tickled"); this.soul.feel("petted"); return { line: "Hehe.", deep: null }; }
    if (inp.kind === "shake") { this.soul.sensation(inp.from || "keychain", "dizzy"); this.soul.feel("played"); return { line: "Whoa, dizzy.", deep: null }; }
    if (inp.kind === "nfc") return this.nfc(inp.data?.tag);
    if (["health", "focus", "location", "place", "screen", "sync", "expense", "phone"].includes(inp.kind)) return this.phone(inp);
    if (!text) return { line: "I'm here.", deep: null };
    if (inp.kind === "telemetry" || inp.kind === "sms") return this.telemetry(text, inp);
    const chore = Object.keys(this.profile.chores || {}).find(c => new RegExp("\\b(did|done|paid|finished|kar (diya|li))\\b.*" + c.split(" ")[0], "i").test(text) || new RegExp(c.split(" ")[0] + ".*\\b(done|paid|ho gaya)\\b", "i").test(text));
    if (chore) { this.soul.log({ kind: "chore", name: chore }); this.soul.feel("praised", 0.5); return { line: `${chore[0].toUpperCase() + chore.slice(1)}: done. Nice.`, deep: null }; }
    if (inp.kind !== "notification" && inp.kind !== "email" && LOOK.test(text)) return this.look(text, inp.data?.image || null);
    const o = detectOrder(text, inp.from);
    if (o && inp.kind !== "voice" && inp.kind !== "text") { this.soul.log({ kind: "order", order: o, source: inp.from }); if (/deliver|arriv|on the way|out for/i.test(o.stage)) this.soul.sensation("tablet", "excited"); return { line: `Noted: ${o.app} ${o.stage.replace(/_/g, " ")}.`, deep: null }; }
    const cmd = await this.command(text, inp);
    if (cmd) { this.soul.log({ kind: "answer", ref: ev.id, line: cmd.line, deep: cmd.deep, model: "rules" }); return cmd; }
    const intent = await this.classify(text);
    if (intent === "log") { this.soul.log({ kind: "note", text, ref: ev.id }); return { line: "Saved.", deep: null }; }
    const felt = this.soul.sense.tablet && this.soul.sense.tablet.until > Date.now() ? this.soul.sense.tablet.name : null;
    if (!felt) this.soul.sensation("tablet", "thinking");
    const ans = await this.answer(text);
    if (this.soul.sense.tablet?.name === "thinking") this.soul.sensation("tablet", "talking");
    this.soul.log({ kind: "answer", ref: ev.id, line: ans.line, deep: ans.deep, model: ans.model || "rules" });
    return ans;
  }

  // Words → a quick feeling on the tablet face (and the closest one on the keychain).
  appraise(t) {
    const s = t.toLowerCase(), face = n => { this.soul.sensation("tablet", n); this.soul.sensation("keychain", n); };
    if (/\b(hi|hello|hey|good morning|namaste)\b/.test(s)) this.soul.feel("greeted");
    if (/\b(love you|good job|well done|shabash)\b/.test(s)) { this.soul.feel("praised"); face("love"); }
    else if (/\b(thanks|thank you|thx|shukriya|dhanyavaad)\b/.test(s)) { this.soul.feel("praised", .6); face("grateful"); }
    if (/\b(haha+|lol|lmao|hehe)\b|😂|🤣/.test(s)) { this.soul.feel("played", .5); face("laughing"); }
    if (/\b(cute|pyaar[ai]|adorable|so sweet)\b/.test(s)) { this.soul.feel("praised", .5); face("shy"); }
    if (/\b(wow|amazing|awesome|insane|kya baat)\b/.test(s)) face("amazed");
    if (/\b(bye|see you|chalta hoon|nikalta hoon)\b/.test(s)) face("wink");
    if (/\b(let'?s go|chalo|focus mode|let'?s do this)\b/.test(s)) face("determined");
    if (/\b(shut up|stupid|useless|bakwas|dumb)\b/.test(s)) {
      const scolded = this.soul.since(120e3).some(e => e.kind === "scolded");
      this.soul.log({ kind: "scolded" }); this.soul.feel("ignored"); face(scolded ? "crying" : "sulky");
    }
    if (/\b(sorry|maaf)\b/.test(s)) { this.soul.feel("petted", .5); face("relieved"); }
  }

  async classify(text) {
    const s = text.toLowerCase();
    if (/^(remember|note|log|save)\b/.test(s)) return "log";
    if (/\?|^(what|when|where|who|how|why|can|should|do i|did i|is|are|tell|show)\b|kya|kab|kaise/.test(s)) return "ask";
    const r = await this.router.text("fast", "Classify the user's message to their personal AI. Reply with exactly one word: ask, log, do or ignore.", text, { prio: "user", agent: "classify" });
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
    const style = `You are ${this.cfg.name}, ${this.cfg.owner}'s personal AI creature in Bengaluru. Who he is: ${p.about || ""} His rhythm: ${(p.rhythm || []).join("; ")}. What he cares about: ${(p.cares || []).join(", ")}. What wears him down: ${(p.drains || []).join(", ")}. What you've learned about him: ${JSON.stringify(this.memory?.profile() || {}).slice(0, 3000)}. Who you are: ${(this.memory?.identity || []).join(" ")} You know him like a close friend who lives with him: notice how he's doing, celebrate small wins, be honest and kind, never preachy. Speak English or Hindi, matching him. Style: calm, warm, very brief, like a 2047 car interface.`;
    const shape = `Reply ONLY as JSON: {"line": "<one plain sentence, max 18 words>", "deep": "<optional markdown with the details, sources and options>"}. Never invent orders, messages or numbers.`;
    // Claude with tools: it looks things up (memory, tasks, scooter, orders, inbox) and can act (remember, add a task).
    if (this.router.claude && this.ctx) {
      try {
        const r = await this.router.claudeAgent(style + " Use the tools to look up anything you need before answering, and to act when he asks (add tasks, remember facts). " + shape, q, { ...this.ctx, source: "you" }, { prio: "user", agent: "answer", maxTurns: 6 });
        const j = readJSON(r?.text); if (j?.line) return { line: j.line, deep: j.deep || null, model: r.model };
        if (r?.text) return { line: r.text.split("\n")[0].slice(0, 160), deep: r.text, model: r.model };
      } catch (e) { /* fall back below */ }
    }
    const r = await this.router.text("chat", style + " " + shape + " Use only the context given; if it isn't there, say so in the line.", `CONTEXT:\n${JSON.stringify(ctx)}\n\nQUESTION: ${q}`, { prio: "user", agent: "answer" });
    if (r) {
      const j = readJSON(r.text); if (j?.line) return { line: j.line, deep: j.deep || null, model: r.model };
      return { line: r.text.split("\n")[0].slice(0, 160), deep: r.text, model: r.model };
    }
    return this.rules(q, ctx);
  }

  // Direct commands that never need a model: tasks, reminders, parking, plan, money, what it knows.
  async command(text, inp) {
    const s = text.toLowerCase(), m = this.memory; if (!m) return null;
    if (/^(please\s+)?(remind me|add (a )?(task|todo)|todo[:\s]|task[:\s]|yaad dila|mujhe yaad)/i.test(text)) {
      const due = parseWhen(text), t = m.addTask({ title: taskTitle(text), due, from: inp.from || "you" });
      this.soul.log({ kind: "task", id: t.id, title: t.title, due: t.due });
      return { line: due ? `Okay. ${t.title}, ${new Date(due).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}.` : `Added: ${t.title}.`, deep: null };
    }
    if (/\b(my (tasks|todos?|list)|show (my )?(tasks|list)|what'?s on my list|kya karna hai|pending tasks)\b/.test(s)) {
      const open = m.open(); if (!open.length) return { line: "Your list is clear.", deep: null };
      return { line: `${open.length} open. First: ${open[0].title}.`, deep: open.map(t => `- ${t.title}${t.due ? " · " + new Date(t.due).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : ""}`).join("\n") };
    }
    const dm = text.match(/^(?:done|finished|completed|ho gaya)[:\s]+(?:with\s+)?(.{3,})$/i);
    if (dm) {
      const q = dm[1].toLowerCase(), t = m.open().find(x => x.title.toLowerCase().includes(q) || q.includes(x.title.toLowerCase()));
      if (t) { m.doneTask(t.id); this.soul.feel("praised", 0.5); this.soul.log({ kind: "win", text: "Done: " + t.title }); return { line: `Done: ${t.title}. Nice.`, deep: null }; }
    }
    if (/where did i park|where'?s my scooter|scooter kaha|parking kaha/.test(s)) {
      const pk = this.soul.status.parked; if (!pk) return { line: "I don't have a parking spot saved yet.", deep: null };
      return { line: `Parked ${new Date(pk.t).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}.`, deep: pk.lat ? `https://maps.google.com/?q=${pk.lat},${pk.lon}` : null };
    }
    if (/\b(plan my day|what'?s (my|the) plan|today'?s plan|aaj ka plan)\b/.test(s) && this.crew) {
      await this.crew.run("planner", { kind: "manual" });
      const pl = this.soul.status.plan; if (!pl) return null;
      return { line: pl.headline, deep: pl.blocks.map(b => `${b.time}  ${b.title}`).join("\n") + (pl.headsUp?.length ? "\n\n" + pl.headsUp.join("\n") : "") };
    }
    if (/\b(how much (did i|have i) spen[dt]|my spend|spent (today|this month)|kharcha)\b/.test(s)) {
      const mo = this.soul.status.money || {}, cats = this.soul.status.spendCats || {};
      return { line: `₹${mo.today ?? 0} today, ₹${mo.month ?? 0} this month.`, deep: Object.entries(cats).map(([k, v]) => `- ${k}: ₹${v}`).join("\n") || null };
    }
    if (/what do you know about me|mere baare mein kya/.test(s)) {
      const pr = m.profile(), n = m.facts.length;
      return { line: `${n} things so far. Tap to see and edit them.`, deep: Object.entries(pr).map(([k, v]) => `**${k}**\n` + v.slice(0, 8).map(x => "- " + x).join("\n")).join("\n\n") || null };
    }
    return null;
  }

  // Structured input from the iPhone (Shortcuts): health, Focus, places, screen time, expenses.
  phone(inp) {
    const d = inp.data || {}, st = this.soul.status;
    st.phoneSync = new Date().toISOString();
    const out = [];
    const health = inp.kind === "health" ? d : d.health;
    if (health) { const h = Object.fromEntries(Object.entries(health).map(([k, v]) => [k, isNaN(+v) ? v : +(+v).toFixed(1)])); st.health = { ...st.health, ...h, t: st.phoneSync }; this.soul.log({ kind: "health", data: h }); out.push("health"); }
    const screen = inp.kind === "screen" ? d : d.screen;
    if (screen) { st.screen = { ...screen, t: st.phoneSync }; out.push("screen"); }
    if (inp.kind === "focus" || d.focus) { const f = inp.kind === "focus" ? d : d.focus; this.soul.log({ kind: "focus", mode: f.mode || "Focus", on: f.on !== false && f.on !== "false" }); out.push("focus"); }
    if (inp.kind === "location" || inp.kind === "place") { const leave = /leave|left|exit/i.test(d.stage || ""); const place = (d.place || inp.text || "somewhere").toLowerCase(); this.soul.log({ kind: "place", place: leave ? "left-" + place : place, lat: d.lat, lon: d.lon }); if (!leave) this.soul.feel("greeted", 0.3); out.push(place); }
    if (inp.kind === "expense") { this.soul.log({ kind: "spend", amount: +d.amount || 0, text: d.what || inp.text || "", cat: spendCat(d.what || inp.text || ""), merchant: d.what || null }); out.push("expense"); }
    return { line: "", deep: null, synced: out };
  }

  // Works with no model keys at all.
  rules(q, ctx) {
    const s = q.toLowerCase();
    if (/tired|thak|stressed|sad|lonely|bura|bored|burnt|burned/.test(s)) { this.soul.log({ kind: "feeling", who: "owner", text: q }); this.soul.sensation("tablet", "love"); return { line: "I'm here. Want me to hold everything else till tomorrow?", deep: "I've noted how you feel. Tonight I'll keep nudges quiet unless something is urgent." }; }
    if (/shipped|done|finished|posted|got it|nailed/.test(s)) { this.soul.feel("praised"); this.soul.sensation("tablet", "proud"); this.soul.log({ kind: "win", text: q }); return { line: "Yesss. That's a win. Logged it.", deep: null }; }
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
    this.soul.sensation("tablet", "confused");
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
    if (/left home/.test(s)) { this.soul.log({ kind: "place", place: "left-home" }); return { line: "", deep: null }; }
    const amt = s.match(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)/);
    if (inp.kind === "sms") this.soul.status.phoneSync = new Date().toISOString();
    if (/\b(otp|one time password|verification code)\b/.test(s) && !/debited|credited|spent|paid/.test(s)) return { line: "", deep: null };   // OTP messages are never stored
    if (/debited|spent|paid|purchase|sent to/.test(s) && amt) {
      const amount = +amt[1].replace(/,/g, ""), m = merchant(text);
      this.soul.log({ kind: "spend", amount, text: text.replace(/\b\d{6,}\b/g, "…"), cat: spendCat(text), merchant: m });
      const o = detectOrder(text, inp.from); if (o) this.soul.log({ kind: "order", order: o, source: "sms" });
      return { line: `Logged ₹${amt[1]}${m ? " · " + m : ""}.`, deep: null };
    }
    if (/credited|received/.test(s) && amt) { this.soul.log({ kind: "credit", amount: +amt[1].replace(/,/g, ""), text: text.replace(/\b\d{6,}\b/g, "…") }); return { line: `₹${amt[1]} came in.`, deep: null }; }
    const due = s.match(/\bdue (?:on|by)?\s*(\d{1,2})[\/\- ](\d{1,2}|[a-z]{3})/);
    if (/\bbill\b|\bdue\b/.test(s) && due) {
      const mon = isNaN(+due[2]) ? "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(due[2]) / 3 : +due[2] - 1, d = new Date(new Date().getFullYear(), mon, +due[1], 10);
      this.soul.log({ kind: "bill", name: (inp.from || "bill").slice(0, 30), due: d.toISOString(), amount: amt ? +amt[1].replace(/,/g, "") : null });
      return { line: `Bill noted, due ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`, deep: null };
    }
    this.soul.log({ kind: "telemetry", text, from: inp.from });
    return { line: "", deep: null };
  }

  // Sight. The face sends a frame; from anywhere else the hub takes one with termux-camera-photo.
  // Only the description is kept, never the picture.
  async look(q, image) {
    if (!image && this.snap) { try { image = await this.snap(); } catch (e) { return { line: "I can't open my eyes from here.", deep: "The hub camera needs Termux:API with camera permission, or open the face and ask there. (" + e.message + ")" }; } }
    if (!image) return { line: "I can't see right now.", deep: null };
    this.soul.sensation("tablet", "looking");
    const system = `You are ${this.cfg.name}, ${this.cfg.owner}'s personal AI creature, looking through the Fire 7's camera in his room in Bengaluru. Reply ONLY as JSON: {"line": "<one plain, warm sentence, max 18 words>", "deep": "<optional markdown: what you see in detail, any text you can read>"}. Describe only what is visible. Never guess who a person is.`;
    const r = await this.router.vision(system, q, image);
    if (!r) return { line: "I took a look, but I need a model key to understand it.", deep: "Add ANTHROPIC_API_KEY or GEMINI_API_KEY to secrets.json." };
    let out; try { const j = JSON.parse(r.text.replace(/^```(json)?|```$/g, "").trim()); out = { line: j.line, deep: j.deep || null }; } catch { out = { line: r.text.split("\n")[0].slice(0, 160), deep: r.text }; }
    this.soul.log({ kind: "saw", q, line: out.line, deep: out.deep, model: r.model });
    this.soul.feel("new_thing", 0.5);
    return { ...out, model: r.model };
  }

  // What the face's camera noticed, as words: arrived | left | dark | light | wave. No pictures.
  room(what) {
    const h = new Date().getHours();
    this.soul.log({ kind: "presence", body: "room", state: what });
    if (what === "arrived") {
      this.soul.feel("greeted"); this.soul.sensation("tablet", "surprised");
      const gone = this.soul.since(DAY).filter(e => e.kind === "presence" && e.body === "room" && e.state === "left").pop();
      const away = gone ? (Date.now() - Date.parse(gone.t)) / 3600e3 : 0, today = new Date().toDateString();
      if (h >= 5 && h < 11 && this.soul.status.morningSeen !== today) { this.soul.status.morningSeen = today; return "Morning. Chai first."; }
      if (away >= 6) return h >= 17 ? "You're back. Long day?" : "Hey, you're back.";
      return "";                     // short gaps: just a happy look, no words
    }
    if (what === "wave") { this.soul.feel("played", 0.5); this.soul.sensation("tablet", "tickled"); return "Hi hi!"; }
    if (what === "dark" && (h >= 22 || h < 6)) { this.soul.feel("night"); this.soul.sensation("tablet", "dozing"); return ""; }
    if (what === "light") { if (this.soul.sense.tablet?.name === "dozing") delete this.soul.sense.tablet; return ""; }
    return "";
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
