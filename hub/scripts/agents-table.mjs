// Prints the crew as a Markdown table (used in docs/15-phase-1.md): node scripts/agents-table.mjs
import { AGENTS, DEPTS } from "../src/crew/index.mjs";
const sched = a => [a.at && "at " + a.at.join(", ") + (a.days ? " (" + a.days.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ") + ")" : ""), a.every && (a.every === 1 ? "every minute" : `every ${a.every} min`), a.on && "on " + a.on.join(", ")].filter(Boolean).join("; ");
let out = `${AGENTS.length} agents in ${Object.keys(DEPTS).length} departments.\n`;
for (const [k, name] of Object.entries(DEPTS)) {
  const list = AGENTS.filter(a => a.dept === k);
  out += `\n### ${name} (${list.length})\n\n| Agent | What it does | When | Model |\n|---|---|---|---|\n`;
  out += list.map(a => `| **${a.title}** \`${a.name}\` | ${a.role.replace(/\|/g, "\\|")} | ${sched(a)} | ${a.tier ? a.tier + " (falls back to rules)" : "rules"} |`).join("\n") + "\n";
}
console.log(out);
