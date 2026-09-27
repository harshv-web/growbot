// ACT: agents that handle things for you: messages, replies, money, bills, subscriptions, the scooter.
import { DAY, isWeekday, once, insight, sameDay, spendCat, merchant } from "./util.mjs";
import { orders } from "../orders.mjs";
import { readJSON } from "../router.mjs";

export default [
  { name: "inbox", dept: "act", title: "Inbox", role: "Sorts messages and email: what needs you, what can wait. Evening reminder of what's still open.", on: ["message"], at: ["18:15"],
    run(ctx, ev) {
      const st = ctx.soul.status; st.inbox ||= [];
      if (ev?.kind === "message") {
        st.inbox.push({ id: ev.id, app: ev.app || "Mail", from: ev.title || ev.from, summary: ev.summary, needsYou: !!ev.needsYou, t: ev.t, done: false });
        st.inbox = st.inbox.slice(-80);
        return ev.needsYou ? `Needs you: ${ev.app} · ${ev.title || ""}` : null;
      }
      const open = st.inbox.filter(m => m.needsYou && !m.done && Date.now() - Date.parse(m.t) < DAY);
      if (open.length) ctx.push(`${open.length} messages still need you: ${open.slice(0, 3).map(m => m.from).join(", ")}.`, "inbox", { important: true });
      return `${open.length} waiting`;
    } },
  { name: "reply-drafter", dept: "act", title: "Reply drafter", role: "Drafts short replies in your voice for messages that need you. You send them; it never does.", on: ["message"], tier: "fast",
    async run(ctx, ev) {
      if (!ev.needsYou || ev.app === "Email" && /no-?reply/i.test(ev.title || "")) return null;
      const r = await ctx.router.text("fast", `Draft a short reply Harsh could send (his style: friendly, brief, English or Hinglish matching the message). Max 25 words. Reply with only the draft.`, `${ev.app} from ${ev.title}: ${ev.summary}`, { agent: "reply-drafter" });
      if (!r?.text) return null; ctx.model = r.model;
      const item = (ctx.soul.status.inbox || []).find(m => m.id === ev.id); if (item) item.draft = r.text.trim().slice(0, 300);
      return "Drafted a reply to " + ev.title;
    } },
  { name: "butler", dept: "act", title: "Butler", role: "Money today and this month, and restocking: spots what's running low from your order rhythm.", every: 60,
    run(ctx) {
      const now = new Date(), st = ctx.soul.status, p = ctx.profile || {};
      const month = ctx.soul.since(31 * DAY).filter(e => e.kind === "spend" && new Date(e.t).getMonth() === now.getMonth());
      st.money = { today: Math.round(month.filter(e => sameDay(e.t)).reduce((a, e) => a + (e.amount || 0), 0)), month: Math.round(month.reduce((a, e) => a + (e.amount || 0), 0)), budget: p.monthlyBudget || null };
      const os = orders(ctx.soul.since(45 * DAY)), byApp = {};
      for (const o of os) (byApp[o.app] ||= []).push(Date.parse(o.t));
      st.restock = Object.entries(byApp).filter(([, ts]) => ts.length >= 3).map(([app, ts]) => { const gaps = ts.slice(1).map((t, i) => t - ts[i]), avg = gaps.reduce((a, b) => a + b, 0) / gaps.length; return { app, everyDays: +(avg / DAY).toFixed(1), lastDaysAgo: +((Date.now() - ts.at(-1)) / DAY).toFixed(1), due: Date.now() - ts.at(-1) > avg * 1.1 }; });
      const due = st.restock.filter(x => x.due);
      if (due.length && now.getHours() >= 17 && now.getHours() < 21) once(ctx, "restock", () => ctx.push(`You usually order from ${due[0].app} every ${due[0].everyDays} days. Running low on anything?`, "butler"));
      if (st.money.budget && st.money.month > st.money.budget * 0.8) once(ctx, "budget80", () => ctx.push(`80% of this month's budget is gone (₹${st.money.month} of ₹${st.money.budget}).`, "butler", { important: true }), "m" + now.getMonth());
      return `₹${st.money.today} today · ₹${st.money.month} this month`;
    } },
  { name: "bills", dept: "act", title: "Bills", role: "Rent, BESCOM, phone and card bills: reminds you two days before, from your profile and bill SMS.", at: ["09:05"],
    run(ctx) {
      const now = new Date(), p = ctx.profile || {};
      const fixed = Object.entries(p.chores || {}).filter(([, r]) => r.dayOfMonth).map(([name, r]) => ({ name, inDays: (r.dayOfMonth - now.getDate() + 31) % 31 }));
      const sms = ctx.soul.since(20 * DAY).filter(e => e.kind === "bill" && e.due).map(e => ({ name: e.name, inDays: Math.round((Date.parse(e.due) - Date.now()) / DAY) }));
      const soon = [...fixed, ...sms].filter(b => b.inDays >= 0 && b.inDays <= 3);
      ctx.soul.status.bills = soon;
      const paid = new Set(ctx.soul.since(10 * DAY).filter(e => e.kind === "chore").map(e => e.name));
      const dueNow = soon.filter(b => b.inDays <= 2 && !paid.has(b.name));
      if (dueNow.length) ctx.push(`${dueNow.map(b => `${b.name} ${b.inDays ? "in " + b.inDays + " days" : "today"}`).join(", ")}.`, "bills", { important: true });
      return soon.length ? soon.map(b => b.name).join(", ") : "nothing due";
    } },
  { name: "subscriptions", dept: "act", title: "Subscriptions", role: "Finds recurring payments (Netflix, Spotify, iCloud, Figma…) and warns the day before renewal.", at: ["04:20"],
    run(ctx) {
      const ev = ctx.soul.since(100 * DAY).filter(e => e.kind === "spend"), by = {};
      for (const e of ev) { const m = (e.merchant || merchant(e.text || "") || "").toLowerCase(); if (!m) continue; (by[m] ||= []).push(e); }
      const subs = [];
      for (const [m, list] of Object.entries(by)) {
        if (list.length < 2) continue;
        const gaps = list.slice(1).map((e, i) => (Date.parse(e.t) - Date.parse(list[i].t)) / DAY), avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const monthly = avg > 25 && avg < 35, yearly = avg > 350;
        if (!(monthly || yearly) && !(spendCat(m) === "subscriptions")) continue;
        const next = new Date(Date.parse(list.at(-1).t) + (yearly ? 365 : 30) * DAY);
        subs.push({ name: m, amount: list.at(-1).amount, every: yearly ? "year" : "month", next: next.toISOString().slice(0, 10) });
      }
      ctx.soul.status.subscriptions = subs;
      const tomorrow = new Date(Date.now() + DAY).toISOString().slice(0, 10);
      for (const s of subs.filter(s => s.next === tomorrow)) once(ctx, "sub-" + s.name, () => ctx.push(`${s.name} renews tomorrow (₹${s.amount}). Still using it?`, "subscriptions"));
      return `${subs.length} subscriptions · ₹${Math.round(subs.filter(s => s.every === "month").reduce((a, s) => a + (s.amount || 0), 0))}/month`;
    } },
  { name: "rider", dept: "act", title: "Rider", role: "Charge planning for tomorrow's ride, tyre warnings, full-charge and Ather login expiry.", every: 30, on: ["telemetry"],
    run(ctx) {
      const sc = ctx.soul.status.scooter, p = ctx.profile || {}, now = new Date(); if (!sc) return "no scooter data yet";
      const need = (p.commuteKm || 12) * 2 * 1.3, tomorrowOffice = isWeekday(new Date(Date.now() + DAY)), evening = now.getHours() >= 19 && now.getHours() < 23;
      if (evening && !sc.charging && ((tomorrowOffice && sc.rangeKm != null && sc.rangeKm < need) || (sc.soc != null && sc.soc < (p.chargeBelow || 30))))
        once(ctx, "charge", () => ctx.push(`Scooter at ${sc.soc ?? "?"}%${sc.rangeKm != null ? ", ~" + sc.rangeKm + " km" : ""}. Plug in tonight.`, "rider", { important: true }));
      if (sc.tyreWarn) once(ctx, "tyre", () => ctx.push(`Tyre pressure looks off (front ${sc.tyreFront ?? "?"}, rear ${sc.tyreRear ?? "?"} psi).`, "rider", { important: true }));
      if (sc.charging && sc.soc >= 95) once(ctx, "full", () => ctx.push("Scooter's full. Unplug when you can.", "rider"));
      const exp = ctx.soul.status.atherTokenExp; if (exp && exp * 1000 - Date.now() < 3 * DAY) once(ctx, "ather-token", () => ctx.push("Your Ather login expires soon. Settings → Ather to log in again.", "rider", { important: true }));
      if (ctx.soul.status.atherAuthError && Date.now() - Date.parse(ctx.soul.status.atherAuthError) < 3600e3) once(ctx, "ather-auth", () => ctx.push("Ather stopped accepting my login. Log in again in Settings → Ather.", "rider", { important: true }));
      return `${sc.soc ?? "?"}% · ${sc.rangeKm ?? "?"} km${sc.charging ? " · charging" : ""}`;
    } },
  { name: "charging", dept: "act", title: "Charge log", role: "Logs every charging session and learns your real efficiency (km per % of battery).", on: ["charge", "ride"],
    run(ctx) {
      const ev = ctx.soul.since(60 * DAY), sessions = ev.filter(e => e.kind === "charge" && e.stage === "end" && e.from != null).map(e => ({ t: e.t, from: e.from, to: e.soc }));
      const rides = ev.filter(e => e.kind === "ride" && e.stage === "end" && e.km > 0 && e.socUsed > 0);
      const kmPerPct = rides.length ? +(rides.reduce((a, r) => a + r.km, 0) / rides.reduce((a, r) => a + r.socUsed, 0)).toFixed(2) : null;
      ctx.soul.status.charging = { sessions: sessions.slice(-20), kmPerPct, rides: rides.length };
      return kmPerPct ? `${kmPerPct} km per 1% over ${rides.length} rides` : `${sessions.length} sessions logged`;
    } },
  { name: "parking", dept: "act", title: "Parking memory", role: "Remembers where the scooter was parked (from the ride-end Shortcut or the Ather's GPS).", on: ["ride"],
    run(ctx, ev) { if (ev.stage !== "end") return null; const p = ctx.soul.status.parked; return p ? `parked ${p.lat ? p.lat.toFixed(4) + "," + p.lon.toFixed(4) : p.place || "saved"}` : null; } },
  { name: "ride-log", dept: "act", title: "Ride log", role: "Every ride: when, how far, battery used; weekly km.", on: ["ride"],
    run(ctx) { const rides = ctx.soul.since(7 * DAY).filter(e => e.kind === "ride" && e.stage === "end");
      const km = rides.reduce((a, r) => a + (r.km || 0), 0); return insight(ctx, "rides", { week: rides.length, km: +km.toFixed(1), line: `${rides.length} rides this week${km ? ", " + km.toFixed(0) + " km" : ""}` }).line; } }
];
