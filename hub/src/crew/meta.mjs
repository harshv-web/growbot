// META: agents that run the system: dreams, the conductor, privacy, backups, the critic, memory upkeep.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { DAY, once, insight, week } from "./util.mjs";
import { readJSON } from "../router.mjs";

export default [
  { name: "dreamer", dept: "meta", title: "Dreamer", role: "At night: one diary line and, rarely, one new \"I know…\" sentence (GrowBot's dream; identity capped at 800 characters).", at: ["03:30"], tier: "deep",
    async run(ctx) {
      const ev = ctx.soul.since(DAY), counts = {}; for (const e of ev) counts[e.kind] = (counts[e.kind] || 0) + 1;
      let line = `A day of ${counts.input || 0} talks, ${counts.ride || 0} ride moments and ${counts.order || 0} orders.`, identity = null;
      const r = await ctx.router.text("deep", `You are Jeevo dreaming at night, a small creature that lives with Harsh in Bengaluru. From the day's events, write ONE diary line in your own voice (max 25 words, warm, specific). Optionally ONE new sentence starting "I know" about who you are or who he is, only if the day truly taught you something; else null. Current identity: ${JSON.stringify(ctx.memory.identity)}. Reply ONLY JSON {"line":"...","identity":null}`,
        JSON.stringify(ev.filter(e => ["input", "answer", "note", "win", "feeling", "ride", "order", "place", "nudge"].includes(e.kind)).slice(-150).map(e => ({ k: e.kind, t: e.t.slice(11, 16), x: (e.text || e.line || e.title || e.order?.app || e.place || "").slice(0, 160) }))), { agent: "dreamer" });
      const j = readJSON(r?.text); if (j?.line) { line = j.line; identity = j.identity || null; ctx.model = r.model; }
      ctx.memory.dream(line, identity); ctx.soul.feel("night");
      return line;
    } },
  { name: "conductor", dept: "meta", title: "Conductor", role: "Watches the whole crew: failing agents, dead sources, spend vs budget. One line at night if something's off.", every: 15, at: ["21:45"],
    run(ctx, ev) {
      const crew = ctx.soul.status.crew || {}, bad = Object.entries(crew).filter(([, c]) => c.ok === false).map(([n]) => n);
      const u = ctx.router.limits.report(), share = u.usd / u.budgetUSD;
      const sources = ctx.soul.since(DAY).filter(e => e.kind === "adapter" && /unreachable|error/.test(e.state)).map(e => e.source);
      const h = { failing: bad, deadSources: [...new Set(sources)], spend: u.usd, budget: u.budgetUSD, calls: u.calls, blocked: ctx.router.lastBlock };
      insight(ctx, "system", { ...h, line: `${bad.length} failing · $${u.usd.toFixed(3)} of $${u.budgetUSD} today` });
      if (ev?.kind === "clock" && (bad.length || h.deadSources.length || share > 0.9)) ctx.push(`System: ${[bad.length && bad.length + " agents failing (" + bad.slice(0, 3).join(", ") + ")", h.deadSources.length && "no data from " + h.deadSources.join(", "), share > 0.9 && "AI budget nearly used"].filter(Boolean).join("; ")}.`, "conductor");
      return `${Object.keys(crew).length} active · ${bad.length} failing · $${u.usd.toFixed(3)}`;
    } },
  { name: "privacy", dept: "meta", title: "Privacy guard", role: "Nightly: deletes raw events older than your retention setting and scrubs anything that looks like an OTP or card number.", at: ["04:30"],
    run(ctx) {
      const days = ctx.cfg.privacy?.retentionDays ?? 365, file = ctx.soul.logFile; if (!existsSync(file)) return null;
      const cut = Date.now() - days * DAY; let kept = 0, dropped = 0, scrubbed = 0;
      const out = readFileSync(file, "utf8").split("\n").filter(Boolean).map(l => {
        let e; try { e = JSON.parse(l); } catch { dropped++; return null; }
        if (Date.parse(e.t) < cut) { dropped++; return null; }
        const s = JSON.stringify(e), c = scrub(s); if (c !== s) scrubbed++; kept++; return c;
      }).filter(Boolean);
      writeFileSync(file, out.join("\n") + "\n");
      return `kept ${kept}, removed ${dropped} old, scrubbed ${scrubbed}`;
    } },
  { name: "backup", dept: "meta", title: "Backup", role: "Nightly copy of Jeevo's memory (soul, facts, events) — 7 days kept, optionally to shared storage.", at: ["04:40"],
    run(ctx) {
      const dir = ctx.soul.dir, dest = ctx.cfg.backup?.dir || join(dir, "backups"), day = new Date().toISOString().slice(0, 10), to = join(dest, day);
      mkdirSync(to, { recursive: true });
      for (const f of ["soul.json", "memory.json", "events.jsonl", "usage.json"]) if (existsSync(join(dir, f))) copyFileSync(join(dir, f), join(to, f));
      const all = readdirSync(dest).filter(x => /^\d{4}-\d\d-\d\d$/.test(x)).sort();
      for (const old of all.slice(0, -7)) rmSync(join(dest, old), { recursive: true, force: true });
      return `saved ${day} (${Math.min(all.length, 7)} kept)`;
    } },
  { name: "critic", dept: "meta", title: "Critic", role: "Weekly: which nudges you answered and which you ignored. Quiet sources get quieter.", at: ["18:20"], days: [0],
    run(ctx) {
      const ev = ctx.soul.since(14 * DAY), stats = {};
      for (const n of ev.filter(e => e.kind === "nudge")) {
        const s = stats[n.from] ||= { sent: 0, engaged: 0 }; s.sent++;
        if (ev.some(e => e.kind === "input" && e.via !== "notification" && Date.parse(e.t) > Date.parse(n.t) && Date.parse(e.t) - Date.parse(n.t) < 15 * 60e3)) s.engaged++;
      }
      const muted = Object.entries(stats).filter(([k, s]) => s.sent >= 8 && s.engaged / s.sent < 0.1 && !["timekeeper", "planner", "rider", "bills", "meeting-prep"].includes(k)).map(([k]) => k);
      ctx.soul.status.nudgeStats = stats; ctx.soul.status.quietSources = muted;
      return muted.length ? "quieter: " + muted.join(", ") : `${Object.keys(stats).length} sources reviewed`;
    } },
  { name: "gardener", dept: "meta", title: "Memory gardener", role: "Weekly memory upkeep: merges duplicate facts and lets unconfirmed guesses fade.", at: ["04:50"], days: [1],
    run(ctx) {
      const m = ctx.memory, seen = new Map(); let merged = 0, faded = 0;
      for (const f of [...m.facts]) {
        const k = f.cat + "|" + f.value.toLowerCase().replace(/\W+/g, " ").trim();
        if (seen.has(k)) { m.facts = m.facts.filter(x => x.id !== f.id); seen.get(k).confidence = Math.min(1, seen.get(k).confidence + 0.05); merged++; continue; }
        seen.set(k, f);
        if (f.source !== "you" && Date.now() - Date.parse(f.seen) > 60 * DAY) { f.confidence = +(f.confidence * 0.9).toFixed(2); faded++; }
      }
      m.facts = m.facts.filter(f => f.confidence >= 0.3 || f.source === "you"); m.save();
      return `${m.facts.length} facts · merged ${merged} · faded ${faded}`;
    } }
];
// OTP-like codes near "OTP/code", and 12-19 digit card/account numbers, become [scrubbed].
export const scrub = s => s.replace(/\b(otp|code|pin|password|passcode)\b([^0-9]{0,20})(\d{4,8})\b/gi, "$1$2[scrubbed]").replace(/\b\d{12,19}\b/g, "[scrubbed]");
