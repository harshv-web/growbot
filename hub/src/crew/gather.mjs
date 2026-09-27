// GATHER: agents that watch each source, keep it healthy, and turn raw signals into clean status.
import { DAY, once, insight, sameDay, spendCat, merchant, median } from "./util.mjs";

export default [
  { name: "notifications", dept: "gather", title: "Notification scout", role: "Watches every app notification on the Fire 7 (WhatsApp, Gmail, Zepto, Swiggy, Ather, banks).", every: 30,
    run(ctx) { const ev = ctx.soul.since(DAY).filter(e => e.kind === "message" || e.kind === "vehicle" || (e.kind === "order" && /notification/.test(e.source || "")));
      const last = ev.at(-1); return insight(ctx, "notifications", { today: ev.length, last: last?.t || null, line: `${ev.length} notifications read today` }).line; } },
  { name: "mail", dept: "gather", title: "Mail scout", role: "Reads new personal email headers over IMAP (read-only) and spots orders and replies owed.", every: 30,
    run(ctx) { const ev = ctx.soul.since(DAY).filter(e => e.app === "Email" || /^email/.test(e.source || "")); const err = ctx.soul.since(DAY).filter(e => e.kind === "adapter" && e.source === "email").at(-1);
      return insight(ctx, "mail", { today: ev.length, error: err?.error || null, line: err?.error ? "Email: " + err.error : `${ev.length} emails today` }).line; } },
  { name: "calendar", dept: "gather", title: "Calendar scout", role: "Keeps today's calendar fresh from your private ICS link and finds the next event.", every: 15,
    run(ctx) { const c = ctx.soul.status.calendar; if (!c) return "not connected";
      const now = new Date(), nowHM = now.toTimeString().slice(0, 5), next = (c.today || []).find(e => e.time >= nowHM);
      return insight(ctx, "calendar", { next, count: c.today?.length || 0, line: next ? `Next: ${next.summary} at ${next.time}` : "No more events today" }).line; } },
  { name: "ather", dept: "gather", title: "Ather scout", role: "Reads the scooter's live telemetry every 5 minutes with your Ather login.", every: 15,
    run(ctx) { const a = ctx.ather?.status(); if (!a?.connected) return "not logged in";
      return insight(ctx, "ather", { ...a, line: a.error ? "Ather: " + a.error : `Live · last ${a.last ? new Date(a.last).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}` }).line; } },
  { name: "body", dept: "gather", title: "Body sense", role: "Feels the Fire 7's own battery, charger and temperature.", every: 15,
    run(ctx) { const t = ctx.soul.status.tablet; return t ? `${t.pct}%${t.plugged ? " · plugged" : ""} · ${Math.round(t.temp)}°C` : "no battery data (Termux:API)"; } },
  { name: "eyes", dept: "gather", title: "Eyes", role: "Turns the camera's words (arrived, left, wave, dark) into presence: when you're home and at your desk.", every: 30,
    run(ctx) { const ev = ctx.soul.since(DAY).filter(e => e.kind === "presence" && e.body === "room");
      let deskMin = 0, inAt = null; for (const e of ev) { if (e.state === "arrived") inAt = Date.parse(e.t); if (e.state === "left" && inAt) { deskMin += (Date.parse(e.t) - inAt) / 60e3 - 30; inAt = null; } }
      if (inAt) deskMin += (Date.now() - inAt) / 60e3;
      return insight(ctx, "eyes", { arrivals: ev.filter(e => e.state === "arrived").length, deskMin: Math.round(deskMin), line: `${Math.round(deskMin / 6) / 10} h near the tablet today` }).line; } },
  { name: "phone", dept: "gather", title: "iPhone link", role: "Receives the iPhone's daily sync (health, focus, places, screen time) and tells you if it stopped.", every: 120,
    run(ctx) { const last = ctx.soul.status.phoneSync;
      if (last && Date.now() - Date.parse(last) > 36 * 3600e3) once(ctx, "phone-stale", () => ctx.push("I haven't heard from your iPhone in a day and a half. Is the Daily Sync automation on?", "phone"));
      return last ? `last sync ${new Date(last).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}` : "waiting for the first Daily Sync"; } },
  { name: "bank", dept: "gather", title: "Bank SMS reader", role: "Reads debit/credit SMS your iPhone forwards (OTPs never leave the phone) and files each spend.", on: ["spend", "credit"],
    run(ctx, ev) { if (ev.kind === "credit") { if (ev.amount > 20000) ctx.soul.status.payday = ev.t; return `credit ₹${ev.amount}`; }
      if (!ev.cat) { ev.cat = spendCat(ev.text || ""); ev.merchant = merchant(ev.text || ""); }
      return `₹${ev.amount} · ${ev.cat}${ev.merchant ? " · " + ev.merchant : ""}`; } },
  { name: "health", dept: "gather", title: "Health reader", role: "Steps, sleep, heart rate and workouts from Apple Health via the Daily Sync.", on: ["health"],
    run(ctx) { const hs = ctx.soul.since(8 * DAY).filter(e => e.kind === "health");
      const steps = median(hs.map(e => e.data?.steps)), sleep = median(hs.map(e => e.data?.sleepHours));
      return insight(ctx, "health", { stepsMedian: steps, sleepMedian: sleep, days: hs.length, line: `7-day median: ${steps ?? "?"} steps, ${sleep ?? "?"} h sleep` }).line; } },
  { name: "places", dept: "gather", title: "Places", role: "Learns your places (home, office, gym, parents') and when you usually arrive and leave.", on: ["place"],
    run(ctx, ev) { const pl = ctx.soul.status.places ||= {}; const name = ev.place || ev.name; if (!name) return null;
      const p = pl[name] ||= { visits: 0, arrivals: [] };
      if (!/^left|leave/.test(ev.stage || ev.place)) { p.visits++; p.last = ev.t; p.arrivals = [...p.arrivals, new Date(ev.t).getHours() * 60 + new Date(ev.t).getMinutes()].slice(-30); }
      ctx.soul.status.place = { name, t: ev.t };
      return `${name}: visit ${p.visits}`; } }
];
