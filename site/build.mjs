// Builds the single-file Lab page and the data-driven docs.
//   node site/build.mjs            → site/dist/jeevo-lab.html + docs/03–06
//   node site/build.mjs --seed DIR → also writes archive seed JSON into DIR
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = p => readFileSync(join(here, "src", p), "utf8");
const require = createRequire(import.meta.url);
const D = require("./src/data.js");

/* ---------- page ---------- */
const page = src("index.html")
  .replace("/*__CSS__*/", () => src("styles.css"))
  .replace("/*__DATA__*/", () => src("data.js"))
  .replace("/*__APP__*/", () => src("app.js"));
if (/<\/script/i.test(src("data.js") + src("app.js"))) throw new Error("A script contains </script");
mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "jeevo-lab.html"), page);
console.log("page", (page.length / 1024).toFixed(1) + " KB");

/* ---------- docs ---------- */
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
const cell = s => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const stat = st => D.status[st].label;
const gen = "<!-- Generated from site/src/data.js by site/build.mjs. Edit the data, not this file. -->\n\n";

function budget(p, y27) {
  let usd = 0;
  for (const [, m, c, i, o, b] of p.rows) {
    const pr = D.prices[m];
    const pin = y27 && pr.in27 ? pr.in27 : pr.in, pout = y27 && pr.out27 ? pr.out27 : pr.out;
    usd += c * (i * pin + o * pout) / 1e6 * (b ? 0.5 : 1) * 30;
  }
  const B = D.budget, fx = D.meta.fx;
  const w = Math.max(0, p.listenHours * 60 - B.whisperFreeMinPerDay) * B.whisperPerMin * 30 * fx;
  const k = p.kannadaEngine === "sarvam" ? p.kannadaMin / 60 * B.sarvamPerHourINR * 30 : p.kannadaMin / 60 * B.geminiAudioPerHour * 30 * fx;
  return usd * fx + w + k + B.fixedINR;
}

// 03 bodies
{
  let s = "# Bodies and hardware\n\n" + gen;
  s += "Your old tablet and iPhone do most of the work. Everything else is optional and adds up to about " + inr(D.bom.reduce((a, b) => a + b.inr, 0)) + " over four months (estimates; check Robu or Robocraze).\n\n";
  for (const b of D.bodies) {
    s += `## ${b.name} (${b.tag})\n\n${b.role}\n\n**Does**\n\n${b.does.map(x => "- " + x).join("\n")}\n\n**Build**\n\n${b.build.map(x => "- " + x).join("\n")}\n\n`;
    s += "| Part | ₹ | Note |\n|---|---:|---|\n" + b.parts.map(p => `| ${cell(p[0])} | ${p[1] ? inr(p[1]) : "₹0"} | ${cell(p[2])} |`).join("\n") + "\n\n";
    s += `**Limits**\n\n${b.limits.map(x => "- " + x).join("\n")}\n\n`;
  }
  s += "## What each device can do\n\n| Capability | " + D.capability.cols.join(" | ") + " |\n|---|" + D.capability.cols.map(() => "---").join("|") + "|\n";
  s += D.capability.rows.map(r => "| " + r.map(cell).join(" | ") + " |").join("\n") + "\n\n";
  s += "## Parts budget\n\n| Phase | What | ₹ |\n|---|---|---:|\n" + D.bom.map(b => `| ${b.tier} | ${cell(b.items)} | ${inr(b.inr)} |`).join("\n");
  s += `\n| **Total** | | **${inr(D.bom.reduce((a, b) => a + b.inr, 0))}** |\n`;
  writeFileSync(join(root, "docs", "03-bodies-and-hardware.md"), s);
}

// 04 use cases
{
  const counts = {};
  D.useCases.forEach(u => { counts[u.st] = (counts[u.st] || 0) + 1; });
  let s = "# Use cases\n\n" + gen;
  s += `${D.useCases.length} use cases. Status: ` + Object.keys(D.status).map(k => `${stat(k)} ${counts[k] || 0}`).join(" · ") + ".\n\n";
  s += Object.entries(D.status).map(([k, v]) => `- **${v.label}**: ${v.note}`).join("\n") + "\n\n";
  for (const d of D.domains) {
    const list = D.useCases.filter(u => u.d === d);
    if (!list.length) continue;
    s += `## ${d}\n\n`;
    for (const u of list) {
      s += `### ${u.t}\n\n*${stat(u.st)} · ${u.ph} · ${u.when} · ${u.s.map(x => D.surfaces[x].name).join(", ")} · crew: ${u.agents.join(", ")}*\n\n`;
      s += `**Trigger.** ${u.trig}\n\n**What happens.** ${u.flow}\n\n`;
      if (u.edges.length) s += "**Edge cases**\n\n" + u.edges.map(e => "- " + e).join("\n") + "\n\n";
      s += "**Uses:** " + u.i.join(", ") + "\n\n";
    }
  }
  writeFileSync(join(root, "docs", "04-use-cases.md"), s);
}

// 05 integrations
{
  let s = "# Integrations (checked September 2026)\n\n" + gen;
  const cats = [...new Set(D.integrations.map(i => i.cat))];
  for (const c of cats) {
    s += `## ${c}\n\n| Service | Status | How Jeevo uses it | Cost | The catch | Source |\n|---|---|---|---|---|---|\n`;
    s += D.integrations.filter(i => i.cat === c).map(i => `| **${cell(i.name)}** | ${stat(i.st)} | ${cell(i.how)} | ${cell(i.cost)} | ${cell(i.limits)} | [${cell(i.srcLabel)}](${i.src}) |`).join("\n") + "\n\n";
  }
  s += "## All sources\n\n" + D.sources.map(x => `- [${x[0]}](${x[1]})`).join("\n") + "\n";
  writeFileSync(join(root, "docs", "05-integrations.md"), s);
}

// 06 build plan
{
  let s = "# Build plan\n\n" + gen;
  s += "About 10–12 hours a week. Each phase ends in a demo and a \"done when\" test; nothing from a later phase starts before the current one passes.\n\n";
  for (const p of D.phases) {
    s += `## ${p.id} · ${p.name} (${p.weeks})\n\n${p.goal}\n\n${p.build.map(b => "- [ ] " + b).join("\n")}\n\n**Demo:** ${p.demo}\n\n**Done when:** ${p.done}\n\n**Cost:** ${p.cost}\n\n`;
  }
  s += "## Running cost (crew presets)\n\n| Preset | Now (Sep 2026 prices) | From Jan 2027 |\n|---|---:|---:|\n";
  for (const p of Object.values(D.budget.presets)) s += `| ${p.label} | ${inr(budget(p, false))}/month | ${inr(budget(p, true))}/month |\n`;
  s += "\nPer-agent detail and editable assumptions are in the Lab's Crew budget tool.\n\n";
  s += "## Weekly rhythm\n\n- Tue + Thu evenings (2 h each): the current phase's next task.\n- Saturday (4–5 h): the big build block, tested on the real tablet and phone.\n- Sunday (1 h): Jeevo's Sunday review, update the Lab board, log decisions, clip the week's reel.\n";
  writeFileSync(join(root, "docs", "06-build-plan.md"), s);
}
console.log("docs 03–06 written");

/* ---------- archive seed ---------- */
const seedIdx = process.argv.indexOf("--seed");
if (seedIdx > 0) {
  const out = process.argv[seedIdx + 1];
  mkdirSync(out, { recursive: true });
  const now = "2026-09-27T12:00:00.000Z";
  const meta = {
    "01-concept.md": ["research", ["concept", "vision", "v2"], "The personal edition: one memory, many bodies, listening, Model of Me, the crew, many models, and the open questions."],
    "02-architecture.md": ["research", ["architecture", "soul-core", "crew", "privacy", "sync"], "Soul Core on a Durable Object, presences, ears and life log, privacy tiers, the crew, model router, Model of Me, attention router, sync, security."],
    "03-bodies-and-hardware.md": ["research", ["hardware", "bom", "tablet", "iphone", "keychain", "case", "dock"], "Each body, what it does, how to build it, parts in ₹, and the device capability matrix."],
    "04-use-cases.md": ["research", ["use-cases", "edge-cases"], "All use cases by domain with triggers, flows and edge cases."],
    "05-integrations.md": ["research", ["integrations", "india", "sources"], "Swiggy, Zomato, Alexa+, Namma Metro, UPI, WhatsApp, Claude, Gemini, Sarvam, Cloudflare and more, with costs, catches and sources."],
    "06-build-plan.md": ["research", ["plan", "phases", "budget"], "Eight phases with tasks, demos, done-when tests and running costs."],
    "07-risks-and-edge-cases.md": ["research", ["risks", "safety", "privacy"], "Platform limits, service catches, listening and privacy risks, hardware safety, project risks."],
    "08-research-log.md": ["log", ["discord", "growbot", "research-log"], "What the GrowBot Discord, the Field Brief and the v1 business plan taught us, plus the Sep 2026 integration findings."],
    "09-decisions.md": ["decision", ["decisions"], "Decision log: what's decided, proposed and open."]
  };
  const files = readdirSync(join(root, "docs")).filter(f => meta[f]);
  const batch = [];
  for (const f of files) {
    const body = readFileSync(join(root, "docs", f), "utf8").replace(gen, "");
    const title = (body.match(/^#\s+(.+)$/m) || [, f])[1];
    const [kind, tags, summary] = meta[f];
    const id = f.replace(/\.md$/, "");
    const doc = { title, kind, tags, summary, body: body.replace(/^#\s+.+\n+/, ""), author: "claude", created: now, updated: now, pinned: f === "01-concept.md", file: "docs/" + f };
    writeFileSync(join(out, id + ".json"), JSON.stringify(doc));
    batch.push({ id, bytes: JSON.stringify(doc).length });
  }
  console.log("seed", JSON.stringify(batch));
}
