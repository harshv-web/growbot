// Rate limits and a daily budget for every model, so 55 agents can't run up a bill or hit provider limits.
//   - per model: requests per minute (rpm) and per day (rpd), and $ per million input/output tokens
//   - one daily $ budget; background agents may use only `backgroundShare` of it, your own questions the rest
//   - per-agent daily call caps
// Spend is counted from the real token usage each provider returns, and saved so a restart doesn't reset it.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_LIMITS = {
  dailyBudgetUSD: 1.5,          // about ₹125 a day at most; most days use a fraction
  backgroundShare: 0.6,
  agentCallsPerDay: 24,
  models: {
    "claude-opus-5":    { rpm: 4,  rpd: 30,   in: 5,   out: 25 },
    "claude-sonnet-5":  { rpm: 15, rpd: 300,  in: 2,   out: 10 },
    "claude-haiku-4-5": { rpm: 30, rpd: 1200, in: 1,   out: 5 },
    "*gemini*":         { rpm: 10, rpd: 800,  in: 0.3, out: 2.5 }
  }
};

export class Limiter {
  constructor(cfg = {}, dataDir) {
    this.c = { ...DEFAULT_LIMITS, ...cfg, models: { ...DEFAULT_LIMITS.models, ...(cfg.models || {}) } };
    this.file = dataDir ? join(dataDir, "usage.json") : null;
    const s = this.file && existsSync(this.file) ? JSON.parse(readFileSync(this.file, "utf8")) : {};
    this.day = s.day || today(); this.u = s.u || fresh(); this.minute = {};
    this.roll();
  }
  roll() { if (this.day !== today()) { this.history = [...(this.u.history || []), { day: this.day, usd: +this.u.usd.toFixed(4), calls: this.u.calls }].slice(-30); this.day = today(); this.u = fresh(); this.u.history = this.history; } }
  spec(model) { return this.c.models[model] || Object.entries(this.c.models).find(([k]) => k.startsWith("*") && model.includes(k.replace(/\*/g, "")))?.[1] || { rpm: 10, rpd: 500, in: 3, out: 15 }; }
  // prio: "user" (you asked) | "live" (reminders, hearing, looking) | "background" (agents)
  allow(model, prio = "background", agent = null) {
    this.roll();
    const sp = this.spec(model), now = Date.now();
    const win = (this.minute[model] || []).filter(t => now - t < 60e3); this.minute[model] = win;
    if (win.length >= sp.rpm) return { ok: false, why: `${model}: ${sp.rpm}/min limit` };
    if ((this.u.byModel[model]?.calls || 0) >= sp.rpd) return { ok: false, why: `${model}: ${sp.rpd}/day limit` };
    const budget = this.c.dailyBudgetUSD;
    if (prio === "background") {
      if (this.u.bgUsd >= budget * this.c.backgroundShare) return { ok: false, why: "background budget used for today" };
      if (agent && (this.u.byAgent[agent] || 0) >= (this.c.agentCaps?.[agent] ?? this.c.agentCallsPerDay)) return { ok: false, why: `${agent}: daily call cap` };
    } else if (this.u.usd >= budget * (prio === "user" ? 1.25 : 1)) return { ok: false, why: "daily budget used" };
    return { ok: true };
  }
  record(model, usage = {}, prio = "background", agent = null) {
    this.roll();
    const sp = this.spec(model), inTok = usage.in || 0, outTok = usage.out || 0, cached = usage.cached || 0;
    const usd = ((inTok - cached) * sp.in + cached * sp.in * 0.1 + outTok * sp.out) / 1e6;
    (this.minute[model] ||= []).push(Date.now());
    const m = this.u.byModel[model] ||= { calls: 0, in: 0, out: 0, usd: 0 };
    m.calls++; m.in += inTok; m.out += outTok; m.usd += usd;
    this.u.calls++; this.u.usd += usd; if (prio === "background") this.u.bgUsd += usd;
    if (agent) this.u.byAgent[agent] = (this.u.byAgent[agent] || 0) + 1;
    this.save();
    return usd;
  }
  report() {
    this.roll();
    return { day: this.day, usd: +this.u.usd.toFixed(4), bgUsd: +this.u.bgUsd.toFixed(4), budgetUSD: this.c.dailyBudgetUSD, backgroundShare: this.c.backgroundShare, calls: this.u.calls,
      byModel: Object.fromEntries(Object.entries(this.u.byModel).map(([k, v]) => [k, { ...v, usd: +v.usd.toFixed(4), rpd: this.spec(k).rpd, rpm: this.spec(k).rpm }])), byAgent: this.u.byAgent, history: this.u.history || [] };
  }
  save() { if (this.file) writeFileSync(this.file, JSON.stringify({ day: this.day, u: this.u })); }
}
const today = () => new Date().toDateString();
const fresh = () => ({ usd: 0, bgUsd: 0, calls: 0, byModel: {}, byAgent: {} });
