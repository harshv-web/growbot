// The crew scheduler. Agents run on a clock (`at`, optional `days`), an interval (`every` minutes) or on events (`on`).
// Jobs go through a small queue (two at a time: the Fire 7 has 1 GB of RAM); model calls go through the router's
// rate limits and budget, so when the budget runs out, agents quietly fall back to their rule-based path.
import gather from "./gather.mjs";
import understand from "./understand.mjs";
import plan from "./plan.mjs";
import act from "./act.mjs";
import care from "./care.mjs";
import work from "./work.mjs";
import home from "./home.mjs";
import create from "./create.mjs";
import meta from "./meta.mjs";

export const DEPTS = { gather: "Gather", understand: "Understand", plan: "Plan", act: "Act", care: "Care", work: "Work", home: "Home", create: "Create", meta: "Meta" };
export const AGENTS = [...gather, ...understand, ...plan, ...act, ...care, ...work, ...home, ...create, ...meta];
const inWindow = (now, at, mins) => { const [h, m] = at.split(":").map(Number), d = now.getHours() * 60 + now.getMinutes() - (h * 60 + m); return d >= 0 && d < mins; };

export class Crew {
  constructor(ctx) {
    this.ctx = ctx; this.queue = []; this.running = 0; this.lastEvery = {};
    this.seen = new Set(ctx.soul.recent.map(e => e.id));
    ctx.soul.status.crew ||= {}; ctx.soul.status.crewFired ||= {};
    const names = new Set(); for (const a of AGENTS) { if (names.has(a.name)) throw new Error("duplicate agent " + a.name); names.add(a.name); }
  }
  enabled(a) { const off = this.ctx.cfg.crew?.off || []; return !off.includes(a.name) && !(this.ctx.soul.status.crewOff || []).includes(a.name); }
  list() {
    return AGENTS.map(a => ({ name: a.name, dept: a.dept, title: a.title, role: a.role, tier: a.tier || "rules", enabled: this.enabled(a),
      schedule: [a.at && "at " + a.at.join(", ") + (a.days ? " (" + a.days.map(d => "SMTWTFS"[d]).join("") + ")" : ""), a.every && (a.every === 1 ? "every minute" : `every ${a.every} min`), a.on && "on " + a.on.join(", ")].filter(Boolean).join(" · "),
      ...(this.ctx.soul.status.crew[a.name] || {}) }));
  }
  toggle(name, on) { const off = new Set(this.ctx.soul.status.crewOff || []); on ? off.delete(name) : off.add(name); this.ctx.soul.status.crewOff = [...off]; return { name, enabled: on }; }
  enqueue(name, ev) { if (this.queue.some(j => j[0] === name && j[1]?.id && j[1].id === ev?.id)) return; this.queue.push([name, ev]); this.pump(); }
  pump() {
    while (this.running < (this.ctx.cfg.crew?.concurrency || 2) && this.queue.length) {
      const [name, ev] = this.queue.shift(); this.running++;
      this.run(name, ev).finally(() => { this.running--; this.pump(); });
    }
  }
  async run(name, ev = { kind: "manual" }) {
    const a = AGENTS.find(x => x.name === name); if (!a) return null;
    const ctx = { ...this.ctx, source: name, model: null }, t0 = Date.now();
    try {
      const summary = await a.run(ctx, ev);
      const st = this.ctx.soul.status.crew[name] ||= {};
      st.runs = (st.runs || 0) + 1; st.lastTry = new Date().toISOString();
      if (summary) {
        Object.assign(st, { lastRun: st.lastTry, ok: true, summary: String(summary).slice(0, 240), model: ctx.model || "rules", ms: Date.now() - t0 });
        if (ctx.model || ["planner", "weekly", "dreamer", "standup", "content", "topics", "meals"].includes(name)) this.ctx.soul.log({ kind: "agent", agent: name, summary: String(summary).slice(0, 240), model: ctx.model || "rules" });
      } else if (st.ok === false) st.ok = true;
      return summary;
    } catch (e) {
      Object.assign(this.ctx.soul.status.crew[name] ||= {}, { lastTry: new Date().toISOString(), ok: false, summary: String(e.message || e).slice(0, 200) });
      return null;
    }
  }
  // Called by the server every few seconds.
  tick(now = new Date()) {
    const fired = this.ctx.soul.status.crewFired, today = now.toDateString();
    for (const k of Object.keys(fired)) if (!k.endsWith(today)) delete fired[k];
    const fresh = this.ctx.soul.recent.filter(e => !this.seen.has(e.id)); fresh.forEach(e => this.seen.add(e.id));
    for (const a of AGENTS) {
      if (!this.enabled(a)) continue;
      if (a.at && (!a.days || a.days.includes(now.getDay()))) for (const at of a.at) {
        const k = a.name + "|" + at + "|" + today;
        if (!fired[k] && inWindow(now, at, 90)) { fired[k] = true; this.enqueue(a.name, { kind: "clock", at }); }
      }
      if (a.every && Date.now() - (this.lastEvery[a.name] || 0) >= a.every * 60e3) { this.lastEvery[a.name] = Date.now(); this.enqueue(a.name, { kind: "interval" }); }
      if (a.on) for (const e of fresh) if (a.on.includes(e.kind)) this.enqueue(a.name, e);
    }
  }
}
