// PLAN: agents that look ahead: your day, your week, focus time, the commute, the weather, meals, errands, sleep.
import { DAY, isWeekday, ist, mins, toMin, fromMin, once, insight, sameDay } from "./util.mjs";
import { today } from "../tools.mjs";
import { orders } from "../orders.mjs";
import { readJSON } from "../router.mjs";

const BLR = { lat: 12.97, lon: 77.59 };

export default [
  { name: "planner", dept: "plan", title: "Planner", role: "Plans your day every morning (or when you wake), with Claude when there's budget.", at: ["07:40"], on: ["wake"], tier: "agent",
    async run(ctx, ev) {
      const now = new Date(), key = now.toDateString(), st = ctx.soul.status, p = ctx.profile || {};
      if (st.plan?.day === key && ev?.kind !== "manual") return null;
      const t = today(ctx), blocks = [];
      for (const e of t.calendar) blocks.push({ time: e.time, title: e.summary, kind: "meeting" });
      const officeDay = isWeekday(now) && !(p.wfhDays || []).includes(now.getDay());
      const routine = st.routine || {};
      if (officeDay) { blocks.push({ time: routine.leave || p.leaveAt || "09:30", title: "Ride to office", kind: "ride" }); blocks.push({ time: p.leaveOfficeAt || "19:00", title: "Ride home", kind: "ride" }); }
      blocks.push({ time: "13:30", title: "Lunch. Actually eat.", kind: "care" });
      for (const tk of ctx.memory.open().filter(x => x.due && sameDay(x.due))) blocks.push({ time: ist(tk.due), title: tk.title, kind: "task" });
      if (st.focusBlock?.day === key) blocks.push({ time: st.focusBlock.time, title: "Focus block", kind: "focus" });
      if (t.chores.length) blocks.push({ time: "20:00", title: "Chores: " + t.chores.slice(0, 3).join(", "), kind: "chore" });
      blocks.push({ time: st.bedtime?.target || "23:30", title: "Wind down", kind: "care" });
      blocks.sort((a, b) => a.time.localeCompare(b.time));
      const top3 = [...ctx.memory.open().slice(0, 3).map(x => x.title), ...t.chores].slice(0, 3);
      const headsUp = [];
      if (t.scooter?.soc != null && t.scooter.soc < (p.chargeBelow || 40)) headsUp.push(`Scooter at ${t.scooter.soc}%.`);
      if (st.weather?.rainLater) headsUp.push(`Rain likely around ${st.weather.rainAt}. Raincoat in the seat.`);
      if (t.needsYou) headsUp.push(`${t.needsYou} messages need a reply.`);
      for (const b of st.bills || []) headsUp.push(`${b.name} due in ${b.inDays} days.`);
      let plan = { day: key, headline: officeDay ? "Office day." : "Your day.", blocks, top3, headsUp, by: "rules", t: now.toISOString() };
      const r = await ctx.router.claudeAgent(`You are the Planner in Jeevo, Harsh's personal AI. Plan his day in Bengaluru like a calm, caring chief of staff: realistic, protective of lunch and sleep, aware of traffic, rain and his energy. Check his day, tasks, profile and memory with the tools first. Then reply ONLY JSON: {"headline":"<one warm line, max 12 words>","blocks":[{"time":"HH:MM","title":"...","kind":"meeting|ride|task|chore|care|focus"}],"top3":["..."],"headsUp":["..."]}. Keep his real meetings and tasks; never invent appointments.`,
        "Draft plan from rules:\n" + JSON.stringify(plan), ctx, { tools: ["today", "list_tasks", "profile", "search_memory", "scooter", "inbox"], maxTurns: 6 });
      const j = readJSON(r?.text); if (j?.blocks) { plan = { ...plan, ...j, day: key, by: r.model }; ctx.model = r.model; }
      st.plan = plan;
      ctx.push(`${plan.headline} ${plan.top3.length ? "Top: " + plan.top3.slice(0, 2).join(", ") + "." : ""}`.trim(), "planner", { important: true, deep: plan.blocks.map(b => `${b.time}  ${b.title}`).join("\n") + (plan.headsUp.length ? "\n\n" + plan.headsUp.join("\n") : "") });
      return plan.headline + ` (${plan.blocks.length} blocks, ${plan.by})`;
    } },
  { name: "weekly", dept: "plan", title: "Week planner", role: "Sunday evening: an honest look back and three to five intentions for next week.", at: ["19:30"], days: [0], tier: "deep",
    async run(ctx) {
      const ev = ctx.soul.since(7 * DAY);
      const wins = ev.filter(e => e.kind === "win").map(e => e.text), rides = ev.filter(e => e.kind === "ride" && e.stage === "end").length;
      const spend = ev.filter(e => e.kind === "spend").reduce((a, e) => a + (e.amount || 0), 0);
      let review = { wins, rides, spend: Math.round(spend), orders: orders(ev).length, lateNights: ev.filter(e => e.kind === "nudge" && e.from === "night-owl").length, by: "rules" };
      const r = await ctx.router.claudeAgent(`You are Jeevo's week planner. Review Harsh's week and set up next week. Use the tools. Reply ONLY JSON: {"line":"<one honest, kind sentence about the week>","wins":["..."],"watch":["..."],"nextWeek":["3-5 concrete intentions"]}`,
        "Week numbers: " + JSON.stringify(review), ctx, { tools: ["recent", "list_tasks", "profile", "search_memory", "orders"], maxTurns: 6, job: "deep" });
      const j = readJSON(r?.text); if (j?.line) { review = { ...review, ...j, by: r.model }; ctx.model = r.model; }
      ctx.soul.status.week = { ...review, t: new Date().toISOString() };
      ctx.push(review.line || `This week: ${wins.length} wins, ${rides} rides, ₹${review.spend} spent.`, "weekly", { important: true, deep: (review.nextWeek || []).map(x => "• " + x).join("\n") });
      return review.line || "week reviewed";
    } },
  { name: "timekeeper", dept: "plan", title: "Timekeeper", role: "Fires every reminder on time, on every device, and follows up once if you miss it.", every: 1,
    run(ctx) {
      const due = ctx.memory.dueReminders(); const out = [];
      for (const t of due) { t.reminded = true; ctx.memory.save(); ctx.push(`Reminder: ${t.title}`, "timekeeper", { important: true, alert: true, taskId: t.id }); out.push(t.title); }
      for (const t of ctx.memory.tasks.filter(t => t.reminded && !t.done && !t.followed && t.remindAt && Date.now() - Date.parse(t.remindAt) > 2 * 3600e3 && Date.now() - Date.parse(t.remindAt) < 12 * 3600e3)) { t.followed = true; ctx.memory.save(); ctx.push(`Still open: ${t.title}. Done, or move it?`, "timekeeper", { taskId: t.id }); }
      return out.length ? "Reminded: " + out.join(", ") : null;
    } },
  { name: "focus-guard", dept: "plan", title: "Focus guard", role: "Finds a free 90-minute window for deep work and guards it when your iPhone Focus is on.", at: ["09:50", "13:50"], on: ["focus"],
    run(ctx, ev) {
      const st = ctx.soul.status;
      if (ev?.kind === "focus") { st.dnd = ev.on ? { until: Date.now() + 3 * 3600e3, why: ev.mode || "Focus" } : null; if (ev.on) ctx.soul.sensation("keychain", "focused"); return ev.on ? `Holding nudges: ${ev.mode || "Focus"}` : "Focus off"; }
      const now = new Date(); if (!isWeekday(now)) return null;
      const busy = (st.calendar?.today || []).map(e => toMin(e.time)).sort((a, b) => a - b);
      let start = Math.max(mins(now) + 15, 600), end = 18 * 60;
      for (const b of [...busy, end]) { if (b - start >= 90) { st.focusBlock = { day: now.toDateString(), time: fromMin(start) }; return insight(ctx, "focus", { window: fromMin(start) + "–" + fromMin(start + 90), line: `Free for deep work at ${fromMin(start)}` }).line; } if (b + 60 > start) start = b + 60; }
      return "no 90-minute gap today";
    } },
  { name: "commute", dept: "plan", title: "Commute", role: "Tells you when to leave, with the scooter's range and the rain in mind.", every: 5,
    run(ctx) {
      const now = new Date(), p = ctx.profile || {}, st = ctx.soul.status; if (!isWeekday(now) || (p.wfhDays || []).includes(now.getDay())) return null;
      const leave = toMin(st.routine?.leave || p.leaveAt || "09:30"), home = toMin(p.leaveOfficeAt || "19:00"), m = mins(now);
      const say = (k, when) => once(ctx, "commute-" + k, () => {
        const bits = [`Leave in ${when - m} min.`]; if (st.scooter?.rangeKm != null) bits.push(`${st.scooter.rangeKm} km range.`); if (st.weather?.rainNow || st.weather?.rainSoon) bits.push("Rain around: raincoat.");
        ctx.push(bits.join(" "), "commute", { important: true });
      });
      if (m >= leave - 20 && m < leave - 10 && st.place?.name !== "office") say("am", leave);
      if (m >= home - 15 && m < home - 5 && st.place?.name === "office") say("pm", home);
      return null;
    } },
  { name: "weather", dept: "plan", title: "Weather", role: "Bengaluru weather from Open-Meteo (free, no key): rain before your rides.", every: 60,
    async run(ctx) {
      const c = ctx.cfg.weather || {}; if (c.enabled === false) return "off";
      const lat = c.lat || BLR.lat, lon = c.lon || BLR.lon;
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code&hourly=precipitation_probability&forecast_hours=12&timezone=Asia%2FKolkata`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("open-meteo " + r.status);
      const j = await r.json(), probs = j.hourly?.precipitation_probability || [], times = j.hourly?.time || [];
      const i = probs.findIndex(p => p >= 60);
      const w = { tempC: j.current?.temperature_2m, rainNow: (j.current?.precipitation || 0) > 0.2, rainSoon: probs.slice(0, 3).some(p => p >= 60), rainLater: i >= 0, rainAt: i >= 0 ? times[i].slice(11, 16) : null, t: new Date().toISOString() };
      ctx.soul.status.weather = w;
      const h = new Date().getHours();
      if (w.rainSoon && (h === 8 || h === 18)) once(ctx, "rain-" + h, () => ctx.push(`Rain likely soon (${w.rainAt}). Raincoat before the ride.`, "weather", { important: true }));
      return `${Math.round(w.tempC)}°C${w.rainAt ? " · rain ~" + w.rainAt : ""}`;
    } },
  { name: "meals", dept: "plan", title: "Meals", role: "Lunch and dinner ideas from what you like and usually order, cook-or-order included.", at: ["12:50", "19:50"], tier: "fast",
    async run(ctx) {
      const likes = (ctx.memory.profile().food || []).concat(ctx.memory.profile().preference || []).slice(0, 12);
      const recent = orders(ctx.soul.since(5 * DAY)).map(o => `${o.app} ${o.items || ""}`.trim());
      const dinner = new Date().getHours() >= 17;
      let line = dinner ? (recent.length > 2 ? "Three orders this week. Cook something simple tonight?" : "Dinner plan?") : "Lunch at 1:30. Don't skip it.";
      const r = await ctx.router.text("fast", `Suggest ONE ${dinner ? "dinner" : "lunch"} for Harsh in Bengaluru (one sentence, max 16 words, friendly). Consider what he likes and recent orders; nudge toward cooking if he ordered a lot.`, JSON.stringify({ likes, recent }), { agent: "meals" });
      if (r?.text) { line = r.text.trim().split("\n")[0].slice(0, 140); ctx.model = r.model; }
      ctx.push(line, "meals"); return line;
    } },
  { name: "errands", dept: "plan", title: "Errands", role: "Groups errands by where you'll be (\"on the ride home: …\").", at: ["17:40"],
    run(ctx) {
      const list = ctx.memory.open().filter(t => /\b(buy|pick ?up|get|collect|drop|return|print|courier|atm|pharmacy|groceries|medicine)\b/i.test(t.title)).map(t => t.title);
      const chores = (ctx.soul.status.chores || []).filter(c => c.due && /groceries|tyre/i.test(c.name)).map(c => c.name);
      const all = [...list, ...chores]; if (all.length < 2) return null;
      ctx.push(`On the way home: ${all.slice(0, 4).join(", ")}.`, "errands"); return all.join(", ");
    } },
  { name: "bedtime", dept: "plan", title: "Bedtime", role: "Works out when you should sleep from tomorrow's first thing, and says it once.", at: ["22:05"],
    run(ctx) {
      const tomorrowStart = toMin(ctx.soul.status.routine?.wake || "07:30"), target = tomorrowStart - 7.5 * 60;
      const t = fromMin(target); ctx.soul.status.bedtime = { target: t, t: new Date().toISOString() };
      ctx.push(`Aim to sleep by ${t} for a ${fromMin(tomorrowStart)} start.`, "bedtime"); return "target " + t;
    } }
];
