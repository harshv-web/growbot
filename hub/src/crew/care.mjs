// CARE: agents that look after you: sleep, movement, meals, breaks, late nights, mood, family, wins, stress.
import { DAY, isWeekday, once, insight, texts, sentiment, week, mins } from "./util.mjs";
import { orders } from "../orders.mjs";

export default [
  { name: "coach", dept: "care", title: "Coach", role: "Each night: sleep, steps, late nights and late orders, in one kind line.", at: ["22:30"],
    run(ctx) {
      const ev = ctx.soul.since(7 * DAY), h = ctx.soul.status.health || {}, lines = [];
      if (h.sleepHours != null && h.sleepHours < 6) lines.push(`Only ${h.sleepHours} h sleep last night.`);
      if (h.steps != null) lines.push(`${h.steps} steps today.`);
      const late = ev.filter(e => e.kind === "nudge" && e.from === "night-owl").length; if (late >= 3) lines.push(`${late} late nights this week.`);
      const lateOrders = orders(ev).filter(o => new Date(o.t).getHours() >= 22).length; if (lateOrders >= 3) lines.push(`${lateOrders} late-night orders.`);
      ctx.soul.status.coach = { lines, t: new Date().toISOString() };
      if (lines.length) ctx.push(lines.slice(0, 2).join(" ") + (h.sleepHours != null && h.sleepHours < 6 ? " Early night?" : ""), "coach");
      return lines.join(" ") || "all calm";
    } },
  { name: "meal-guard", dept: "care", title: "Meal guard", role: "Designers skip lunch. If nothing says you ate by 2:15, it asks once.", at: ["14:15"],
    run(ctx) {
      const ate = ctx.soul.since(8 * 3600e3).some(e => /\b(lunch|khana|ate|eaten|eating|biryani|thali|meal)\b/i.test(e.text || "") || (e.kind === "order" && new Date(e.t).getHours() >= 11));
      if (!ate) ctx.push("Did you eat? It's past 2.", "meal-guard"); return ate ? "ate" : "asked";
    } },
  { name: "breaks", dept: "care", title: "Breaks", role: "At the office, a stretch-and-water nudge every two hours of sitting. Twice a day at most.", every: 20,
    run(ctx) {
      const now = new Date(), st = ctx.soul.status; if (!isWeekday(now) || st.place?.name !== "office" || now.getHours() < 11 || now.getHours() > 18) return null;
      const since = Date.now() - Date.parse(st.place.t), n = ctx.soul.since(DAY).filter(e => e.kind === "nudge" && e.from === "breaks").length;
      if (n < 2 && since > (n + 1) * 2 * 3600e3) { ctx.push("Two hours in. Stand up, water, look far away for a minute.", "breaks"); return "nudged"; }
      return null;
    } },
  { name: "night-owl", dept: "care", title: "Night owl", role: "Late creative sessions are yours. It just counts them and says one line near midnight.", at: ["23:50"],
    run(ctx) {
      const late = ctx.soul.since(7 * DAY).filter(e => e.kind === "nudge" && e.from === "night-owl").length;
      const active = ctx.soul.since(20 * 60e3).some(e => e.kind === "input" || (e.kind === "presence" && e.state === "arrived"));
      if (!active) return "asleep, it seems";
      ctx.push(late >= 3 ? `${late + 1}th late night this week. Save the file, the render will wait.` : "Good session? Save and wind down in 30.", "night-owl");
      return `late night ${late + 1}`;
    } },
  { name: "mood-mirror", dept: "care", title: "Mood mirror", role: "Watches your mood over days, not minutes. Low for three days: a gentle check-in. Good streak: it notices.", at: ["21:35"],
    run(ctx) {
      const m = ctx.soul.status.userMood || {}, days = Object.keys(m).sort().slice(-4).map(k => m[k].sum / m[k].n);
      insight(ctx, "mood", { days, line: days.map(v => v > 0.2 ? "↑" : v < -0.2 ? "↓" : "·").join(" ") });
      if (days.length >= 3 && days.slice(-3).every(v => v < -0.2)) { ctx.push("You've sounded low for a few days. Want to talk, or should I keep things quiet for a bit?", "mood-mirror", { important: true }); ctx.soul.sensation("tablet", "worried"); return "check-in"; }
      if (days.length >= 3 && days.slice(-3).every(v => v > 0.3)) { ctx.push("Three good days in a row. Whatever you're doing, it's working.", "mood-mirror"); ctx.soul.sensation("tablet", "joyful"); return "good streak"; }
      return days.length ? "steady" : "not enough yet";
    } },
  { name: "family", dept: "care", title: "Family", role: "If you haven't talked to someone close in a week, it suggests a call on Sunday.", at: ["11:10"], days: [0],
    run(ctx) {
      const close = (ctx.memory.facts || []).filter(f => f.cat === "people" && /mom|mother|dad|father|sister|brother|nani|dadi|grand/i.test(f.key)).map(f => f.value);
      const ppl = ctx.soul.status.people || {};
      const due = close.filter(n => !ppl[n] || Date.now() - Date.parse(ppl[n].last) > 7 * DAY);
      if (due.length) ctx.push(`Call ${due[0]} today? It's been a while.`, "family");
      return due.length ? "suggested " + due[0] : close.length ? "all in touch" : "tell me who your family is";
    } },
  { name: "wins", dept: "care", title: "Wins", role: "Collects your wins and, on Friday evening, reads the week's list back to you.", on: ["win"], at: ["18:40"], days: [5],
    run(ctx, ev) {
      if (ev?.kind === "win") return "win: " + (ev.text || "").slice(0, 60);
      const w = ctx.soul.since(7 * DAY).filter(e => e.kind === "win"); if (!w.length) return "no wins logged";
      ctx.push(`${w.length} wins this week. ${w.slice(-2).map(e => e.text).join(". ")}.`, "wins", { important: true }); ctx.soul.feel("praised", 0.6);
      return `${w.length} wins`;
    } },
  { name: "stress-guard", dept: "care", title: "Stress guard", role: "When you say you're stressed or tired, it quiets everything non-urgent for two hours.", on: ["input"],
    run(ctx, ev) {
      if (!ev.text || ["notification", "email", "sms"].includes(ev.via) || sentiment(ev.text) > -0.5 || !/stress|tired|overwhelm|thak|tension|pareshan|burnt|exhaust/i.test(ev.text)) return null;
      ctx.soul.status.dnd = { until: Date.now() + 2 * 3600e3, why: "you needed quiet" };
      return "quiet for 2 hours";
    } }
];
