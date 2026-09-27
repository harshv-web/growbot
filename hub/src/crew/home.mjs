// HOME: chores, deliveries, arriving home, leaving home, laundry weather.
import { DAY, once, insight, sameDay } from "./util.mjs";
import { orders } from "../orders.mjs";

export default [
  { name: "chores", dept: "home", title: "Chores", role: "Keeps the chore list from your profile (laundry every 4 days, rent on the 1st…) and marks them done when you say so.", every: 30,
    run(ctx) { const due = ctx.life.chores(new Date()).filter(c => c.due); return due.length ? due.map(c => c.name).join(", ") : "all done"; } },
  { name: "deliveries", dept: "home", title: "Deliveries", role: "Orders on the way: tells you when to expect the doorbell, and nudges if one looks stuck.", on: ["order"],
    run(ctx, ev) {
      const o = ev.order; if (!o) return null;
      if (o.stage === "on_the_way") { ctx.soul.sensation("tablet", "excited"); ctx.push(`${o.app} is on the way.`, "deliveries"); }
      const open = orders(ctx.soul.since(DAY)).filter(x => x.stage === "on_the_way" && Date.now() - Date.parse(x.t) > 90 * 60e3);
      if (open.length) once(ctx, "stuck-" + open[0].app, () => ctx.push(`${open[0].app} said on the way 90 minutes ago. Check the app?`, "deliveries"));
      return `${o.app}: ${o.stage.replace(/_/g, " ")}`;
    } },
  { name: "arrival", dept: "home", title: "Home arrival", role: "When you get home: one line with what's due tonight and what's arriving.", on: ["place"],
    run(ctx, ev) {
      if (ev.place !== "home") return null;
      const due = (ctx.soul.status.chores || []).filter(c => c.due).map(c => c.name).slice(0, 2);
      const coming = orders(ctx.soul.since(6 * 3600e3)).filter(o => o.stage === "on_the_way").map(o => o.app);
      const tasks = ctx.memory.open().filter(t => t.due && sameDay(t.due) && Date.parse(t.due) > Date.now()).map(t => t.title).slice(0, 2);
      const bits = [due.length && "Tonight: " + due.join(", ") + ".", coming.length && coming.join(", ") + " arriving.", tasks.length && "Later: " + tasks.join(", ") + "."].filter(Boolean);
      if (bits.length) ctx.push("Welcome home. " + bits.join(" "), "arrival");
      return bits.join(" ") || "home, nothing pending";
    } },
  { name: "departure", dept: "home", title: "Leaving check", role: "When you leave home: keys, wallet, helmet, and whether the scooter has enough charge.", on: ["place", "nfc"],
    run(ctx, ev) {
      if (!(ev.kind === "place" && /left.?home/.test(ev.place || "")) && !(ev.kind === "nfc" && ev.tag === "door")) return null;
      const sc = ctx.soul.status.scooter, w = ctx.soul.status.weather;
      const bits = ["Keys, wallet, helmet."]; if (sc?.soc != null) bits.push(`Scooter ${sc.soc}%.`); if (w?.rainSoon) bits.push("Rain soon.");
      ctx.push(bits.join(" "), "departure"); return bits.join(" ");
    } },
  { name: "laundry-weather", dept: "home", title: "Laundry weather", role: "Bengaluru rain vs. drying clothes: if laundry's due and tomorrow looks dry, it says so.", at: ["20:10"],
    run(ctx) {
      const due = (ctx.soul.status.chores || []).some(c => c.due && /laundry/i.test(c.name)), w = ctx.soul.status.weather;
      if (!due || !w) return null;
      if (!w.rainLater) { ctx.push("Laundry's due and no rain expected. Good night to run it.", "laundry-weather"); return "go"; }
      return "rain expected, wait";
    } }
];
