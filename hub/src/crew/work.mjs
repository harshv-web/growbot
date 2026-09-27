// WORK: agents for office days: arrival brief, meeting prep, the day's standup notes, focus and hours.
// Work sources (company mail/chat) stay off unless your employer's policy allows them (config → workCompartment).
import { DAY, isWeekday, once, insight, sameDay, toMin, mins, week } from "./util.mjs";
import { readJSON } from "../router.mjs";

export default [
  { name: "office", dept: "work", title: "Office day", role: "When you reach the office: today's meetings, promises due and one thing to protect.", on: ["place"],
    run(ctx, ev) {
      if (ev.place !== "office") return null;
      const st = ctx.soul.status, cal = st.calendar?.today || [], due = ctx.memory.open().filter(t => t.due && sameDay(t.due));
      const days = ctx.soul.since(7 * DAY).filter(e => e.kind === "place" && e.place === "office").map(e => e.t.slice(0, 10));
      insight(ctx, "office", { daysThisWeek: new Set(days).size });
      return `${cal.length} meetings, ${due.length} due today`;
    } },
  { name: "meeting-prep", dept: "work", title: "Meeting prep", role: "Ten minutes before a meeting: the heads-up, plus anything you've noted about it.", every: 5,
    run(ctx) {
      const cal = ctx.soul.status.calendar?.today || [], m = mins(new Date());
      const e = cal.find(x => { const d = toMin(x.time) - m; return d >= 8 && d <= 15; }); if (!e) return null;
      once(ctx, "prep-" + e.time + e.summary, () => {
        const notes = ctx.memory.search(e.summary, ctx.soul.recent, 3).map(h => h.text);
        ctx.push(`${e.summary} at ${e.time}.${e.location ? " " + e.location + "." : ""}`, "meeting-prep", { important: true, deep: notes.length ? "From your notes:\n" + notes.map(n => "• " + n).join("\n") : null });
      });
      return "prepped " + e.summary;
    } },
  { name: "standup", dept: "work", title: "Standup writer", role: "At 6:30 pm on workdays: what you did today, drafted from your notes, wins and finished tasks.", at: ["18:30"], tier: "fast",
    async run(ctx) {
      if (!isWeekday(new Date())) return null;
      const done = ctx.memory.tasks.filter(t => t.done && t.doneAt && sameDay(t.doneAt)).map(t => t.title);
      const notes = ctx.soul.since(12 * 3600e3).filter(e => ["note", "win"].includes(e.kind)).map(e => e.text);
      if (!done.length && !notes.length) return "nothing logged today";
      let text = ["Today:", ...done.map(d => "• " + d), ...notes.map(n => "• " + n)].join("\n");
      const r = await ctx.router.text("fast", "Turn these into a crisp 3-5 bullet standup update (done / next / blockers) in plain English.", text, { agent: "standup" });
      if (r?.text) { text = r.text.trim(); ctx.model = r.model; }
      ctx.soul.status.standup = { day: new Date().toDateString(), text };
      return text.split("\n")[0];
    } },
  { name: "focus-log", dept: "work", title: "Focus log", role: "Adds up your iPhone Focus time: how many deep-work hours you really got.", on: ["focus"],
    run(ctx) {
      const ev = ctx.soul.since(DAY).filter(e => e.kind === "focus"); let total = 0, on = null;
      for (const e of ev) { if (e.on) on = Date.parse(e.t); else if (on) { total += Date.parse(e.t) - on; on = null; } }
      if (on) total += Date.now() - on;
      return insight(ctx, "focusToday", { hours: +(total / 3600e3).toFixed(1), line: `${(total / 3600e3).toFixed(1)} h focus today` }).line;
    } },
  { name: "work-hours", dept: "work", title: "Work hours", role: "Hours at the office each day and week; warns past 50 hours.", on: ["place"], at: ["20:30"],
    run(ctx) {
      const ev = ctx.soul.since(7 * DAY).filter(e => e.kind === "place" && /office/.test(e.place || "")); let total = 0, inAt = null;
      for (const e of ev) { if (e.place === "office") inAt = Date.parse(e.t); else if (e.place === "left-office" && inAt) { total += Date.parse(e.t) - inAt; inAt = null; } }
      const h = +(total / 3600e3).toFixed(1); insight(ctx, "workHours", { week: h, line: `${h} h at office this week` });
      if (h > 50) once(ctx, "50h", () => ctx.push(`${h} hours at the office this week. Protect the weekend.`, "work-hours", { important: true }), week());
      return `${h} h this week`;
    } }
];
