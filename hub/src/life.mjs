// The day's chorus: the rhythm of a 24-year-old designer's Bengaluru day, chores, money and feelings.
// Once-a-day moments fire at most once; everything respects quiet hours and a daily nudge budget.
const DAY = 24 * 3600e3;
const hm = d => d.getHours() * 60 + d.getMinutes();
const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

export class Life {
  constructor(soul, profile, push) {
    this.soul = soul; this.p = profile || {}; this.push = push;
    this.fired = soul.status.lifeFired || {};   // "moment|date" → true
    this.budget = 6;                             // unrequested nudges per day
  }
  quiet(d) {
    const [a, b] = (this.p.quietHours || ["00:30", "07:30"]).map(toMin), m = hm(d);
    return a < b ? m >= a && m < b : m >= a || m < b;
  }
  once(key, d, fn) {
    const k = key + "|" + d.toDateString(); if (this.fired[k]) return; this.fired[k] = true;
    this.soul.status.lifeFired = this.fired; fn();
  }
  say(line, from = "life") {
    const today = new Date().toDateString(), used = this.soul.since(DAY).filter(e => e.kind === "nudge" && new Date(e.t).toDateString() === today).length;
    if (used >= this.budget) return;
    this.push(line, from);
  }
  chores(d) {
    const out = [], done = this.soul.since(400 * DAY).filter(e => e.kind === "chore");
    for (const [name, rule] of Object.entries(this.p.chores || {})) {
      const last = done.filter(e => e.name === name).pop();
      if (rule.everyDays) { const age = last ? (d - Date.parse(last.t)) / DAY : Infinity; if (age >= rule.everyDays) out.push({ name, due: true, age: isFinite(age) ? Math.floor(age) : null }); }
      if (rule.dayOfMonth) { const dom = d.getDate(), diff = rule.dayOfMonth - dom; if (diff >= 0 && diff <= 3 && !(last && d - Date.parse(last.t) < 20 * DAY)) out.push({ name, due: true, inDays: diff }); }
    }
    this.soul.status.chores = out;
    return out;
  }
  tick(d) {
    if (this.quiet(d)) return;
    const m = hm(d), sc = this.soul.status.scooter, cal = this.soul.status.calendar, chores = this.chores(d);
    const recent = this.soul.since(DAY);
    // morning
    if (m >= 7 * 60 + 30 && m < 10 * 60) this.once("morning", d, () => {
      const first = cal?.today?.[0];
      const bits = [first ? `First up: ${first.summary} at ${first.time}.` : "Calendar's clear this morning.", sc?.soc != null ? `Scooter ${sc.soc}%.` : null, chores.find(c => c.inDays === 0) ? `${chores.find(c => c.inDays === 0).name} is due today.` : null].filter(Boolean);
      this.say("Morning. " + bits.join(" "), "morning");
    });
    // lunch (designers skip it)
    if (m >= 14 * 60 + 15 && m < 15 * 60) this.once("lunch", d, () => {
      if (!recent.some(e => /lunch|khana|ate|eaten/i.test(e.text || ""))) this.say("Did you eat? It's past 2.", "care");
    });
    // ride home + evening
    if (m >= 18 * 60 + 30 && m < 19 * 60 + 30) this.once("evening", d, () => {
      const due = chores.filter(c => c.due).map(c => c.name).slice(0, 2);
      this.say(`Heading home soon?${due.length ? " Tonight: " + due.join(", ") + "." : ""}`, "evening");
    });
    // late-night creative session: protect sleep without nagging
    if (m >= 23 * 60 + 45 || m < 30) this.once("late", d, () => {
      const lateNights = this.soul.since(7 * DAY).filter(e => e.kind === "nudge" && e.from === "late").length;
      this.say(lateNights >= 3 ? "Fourth late night this week. Save the file, the render will wait." : "Good session? Save and wind down in 30.", "late");
    });
    // payday / money survival
    if (this.p.payday && d.getDate() === ((this.p.payday + 26) % 30 || 30)) this.once("money", d, () => this.say("Payday in ~4 days. Want a quick spend check?", "money"));
    // Sunday: how was your week
    if (d.getDay() === 0 && m >= 11 * 60) this.once("week", d, () => {
      const wins = this.soul.since(7 * DAY).filter(e => e.kind === "win").length;
      this.say(wins ? `You had ${wins} wins this week. Want the recap?` : "How was your week, honestly?", "week");
    });
  }
}
