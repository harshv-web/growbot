// Phase 1 checks: the crew, memory and reminders, the rate limiter, the Claude tool loop (with a stand-in client),
// the Ather login + telemetry flow (against a stand-in Ather server), the Claude connector (MCP), and the app API.
process.env.TZ = "Asia/Kolkata";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Soul } from "../src/soul.mjs";
import { Memory, parseWhen } from "../src/memory.mjs";
import { Router } from "../src/router.mjs";
import { Limiter } from "../src/limits.mjs";
import { Crew, AGENTS, DEPTS } from "../src/crew/index.mjs";
import { Brain } from "../src/brain.mjs";
import { Life } from "../src/life.mjs";
import { Ather, normalize } from "../src/adapters/ather.mjs";
import { mcpHandle } from "../src/mcp.mjs";

const hub = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, extra = "") => { results.push(!!ok); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " → " + String(extra).slice(0, 160) : "")); };
const cfg = JSON.parse(readFileSync(join(hub, "config.example.json"), "utf8"));
const profile = JSON.parse(readFileSync(join(hub, "profile.example.json"), "utf8"));

// ---------- in-process: crew, memory, brain ----------
const dir = mkdtempSync(join(tmpdir(), "jeevo-p1-"));
const soul = new Soul(dir), memory = new Memory(dir), router = new Router(cfg, {}, dir), pushed = [];
const push = (line, from, o = {}) => { pushed.push({ line, from, ...o }); return true; };
const life = new Life(soul, profile, push);
const brain = new Brain(soul, router, cfg, profile, null, memory);
const ctx = { soul, memory, router, profile, cfg: { ...cfg, weather: { enabled: false } }, push, life, ather: null, brain };
brain.ctx = ctx; const crew = new Crew(ctx); brain.crew = crew;

check("55+ agents across 9 departments", AGENTS.length >= 55 && Object.keys(DEPTS).length === 9, `${AGENTS.length} agents`);
check("every agent has a name, department, role and run()", AGENTS.every(a => a.name && DEPTS[a.dept] && a.role && typeof a.run === "function" && (a.at || a.every || a.on)));

let r = await brain.input({ kind: "text", text: "remind me to call mom tomorrow 6pm" });
check("reminder from plain words", /call mom/i.test(r.line) && memory.open().some(t => t.title === "call mom" && new Date(t.due).getHours() === 18), r.line);
const t = memory.addTask({ title: "stretch", due: new Date(Date.now() - 1000).toISOString() });
await crew.run("timekeeper");
check("timekeeper fires due reminders as alerts", pushed.some(p => p.line === "Reminder: stretch" && p.alert), JSON.stringify(pushed.at(-1)));
r = await brain.input({ kind: "text", text: "done with stretch" });
check("done with … completes the task", memory.tasks.find(x => x.id === t.id).done, r.line);

soul.log({ kind: "input", via: "text", text: "I really love filter coffee with no sugar" });
await crew.run("librarian", soul.recent.at(-1));
check("librarian learns a preference (rules, no key)", memory.facts.some(f => /filter coffee/.test(f.value)), JSON.stringify(memory.facts.at(-1)));
soul.log({ kind: "input", via: "voice", text: "I'll send the deck to Priya by tomorrow 11am" });
await crew.run("promises", soul.recent.at(-1));
check("promise keeper turns a promise into a task", memory.open().some(x => /deck/i.test(x.title)), memory.open().map(x => x.title).join(" | "));
soul.log({ kind: "input", via: "text", text: "idea: a keychain that blushes when my crush texts" });
await crew.run("ideas", soul.recent.at(-1));
check("idea catcher saves ideas", (soul.status.ideas || []).length === 1);

r = await brain.input({ kind: "sms", text: "Rs.499.00 debited from A/c XX12 to NETFLIX on 01-09. OTP 123456 not shared", from: "bank" });
check("bank SMS → spend with category, OTP scrubbed", soul.recent.some(e => e.kind === "spend" && e.cat === "subscriptions") && !JSON.stringify(soul.recent).includes("123456"), r.line);
r = await brain.input({ kind: "health", data: { steps: 8123, sleepHours: 5.2 }, from: "iphone" });
check("iPhone health sync lands in status", soul.status.health?.steps === 8123 && soul.status.phoneSync);
await brain.input({ kind: "location", data: { place: "office", stage: "arrive" }, from: "iphone" });
await crew.run("places", soul.recent.filter(e => e.kind === "place").at(-1));
check("places agent learns the office", soul.status.places?.office?.visits === 1);

life.chores(new Date());
await crew.run("planner", { kind: "manual" });
check("planner makes a day plan with no key (rules)", soul.status.plan?.blocks?.length >= 3 && soul.status.plan.by === "rules", soul.status.plan?.headline);
await crew.run("butler"); await crew.run("bills"); await crew.run("conductor", { kind: "interval" });
check("butler, bills and conductor run clean", ["butler", "bills", "conductor"].every(n => soul.status.crew[n]?.ok), JSON.stringify(soul.status.crew.conductor));
let bad = [];
for (const a of AGENTS) { if (["weather", "backup", "privacy"].includes(a.name)) continue; await crew.run(a.name, { kind: "manual" }); if (soul.status.crew[a.name]?.ok === false) bad.push(a.name + ": " + soul.status.crew[a.name].summary); }
check("all agents run without throwing (no keys, manual trigger)", !bad.length, bad.join("; "));
crew.tick(new Date()); await new Promise(r => setTimeout(r, 300));
check("scheduler queues interval agents", Object.keys(soul.status.crew).length > 20);

// ---------- limiter ----------
const lim = new Limiter({ dailyBudgetUSD: 0.01, backgroundShare: 0.5, models: { "m": { rpm: 2, rpd: 100, in: 1000, out: 1000 } } });
check("limiter allows under the per-minute limit", lim.allow("m", "user").ok);
lim.record("m", { in: 1, out: 1 }, "user"); lim.record("m", { in: 1, out: 1 }, "user");
check("limiter blocks over the per-minute limit", !lim.allow("m", "user").ok, lim.allow("m", "user").why);
const lim2 = new Limiter({ dailyBudgetUSD: 0.01, backgroundShare: 0.5, models: { "m": { rpm: 99, rpd: 100, in: 1000, out: 1000 } } });
lim2.record("m", { in: 3, out: 3 }, "background");
check("background agents stop at their budget share; you don't", !lim2.allow("m", "background").ok && lim2.allow("m", "user").ok, lim2.allow("m", "background").why);

// ---------- Claude tool loop, with a stand-in client ----------
let calls = 0;
router.claude = { messages: { create: async req => {
  calls++;
  if (calls === 1) return { stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 20 }, content: [{ type: "text", text: "Let me check." }, { type: "tool_use", id: "tu1", name: "add_task", input: { title: "buy milk", when: "tomorrow 8am" } }] };
  const tr = req.messages.at(-1).content[0];
  return { stop_reason: "end_turn", usage: { input_tokens: 150, output_tokens: 30 }, content: [{ type: "text", text: JSON.stringify({ line: tr.type === "tool_result" && !tr.is_error ? "Added: buy milk, tomorrow 8." : "hmm", deep: null }) }] };
} } };
r = await brain.input({ kind: "text", text: "can you make sure I buy milk tomorrow morning?" });
check("Claude answers with tools: it added the task itself", memory.open().some(x => x.title === "buy milk") && /buy milk/.test(r.line), r.line);
check("every Claude call is counted by the limiter", router.limits.report().byModel[cfg.models.agent]?.calls === 2, JSON.stringify(router.limits.report().byModel));
router.claude = null;

// ---------- Ather, against a stand-in server ----------
const exp = Math.floor(Date.now() / 1000) + 30 * 86400, jwt = "h." + Buffer.from(JSON.stringify({ exp })).toString("base64url") + ".s";
const seen = [];
const fake = http.createServer((req, res) => {
  seen.push(req.method + " " + req.url + " " + (req.headers.source || "") + " " + (req.headers.authorization ? "auth" : "noauth"));
  let b = ""; req.on("data", c => b += c); req.on("end", () => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/auth/v2/generate-login-otp") return res.end("{}");
    if (req.url === "/auth/v2/verify-login-otp") return res.end(JSON.stringify(JSON.parse(b).userOtp === "4242" ? { token: jwt } : {}));
    if (req.url === "/api/v1/auth/user/scooters/firebase-dbs") return res.end(JSON.stringify({ scooterDatabases: [{ scooter: "SCOOTER-1" }] }));
    if (req.url.startsWith("/api/v1/devices/shadows/telemetry?uuid=SCOOTER-1")) return res.end(JSON.stringify({ data: { state: { reported: { bike: { battery_soc: "63.5", estimated_range: 71, odometer: 1520.4, charging_status: "false" }, tpms: { front_tyre_pressure: 29, rear_tyre_pressure: 24 }, location: { latitude: 12.93, longitude: 77.62 } } } } }));
    res.statusCode = 404; res.end("{}");
  });
}).listen(0);
await new Promise(r => fake.once("listening", r));
const ather = new Ather(soul, { adapters: { ather: { baseUrl: "http://127.0.0.1:" + fake.address().port, everyMin: 60 } } }, {}, dir);
await ather.sendOtp("+91 98765 43210");
const v = await ather.verifyOtp("9876543210", "4242");
check("Ather OTP login → token, scooter found", v.ok && v.scooters[0] === "SCOOTER-1" && seen.some(s => s.includes("ATHER_APP/11.3.0")), JSON.stringify(v));
await ather.poll(); ather.stop();
const sc = soul.status.scooter;
check("Ather telemetry → battery, range, tyres, odometer, location", sc?.soc === 63.5 && sc.rangeKm === 71 && sc.tyreRear === 24 && sc.tyreWarn && sc.odoKm === 1520.4 && sc.lat === 12.93, JSON.stringify(sc));
check("every scooter signal is kept for the Ride screen", Object.keys(soul.status.scooterSignals || {}).length >= 7);
check("token stays in data/ather.json, not config", JSON.parse(readFileSync(join(dir, "ather.json"), "utf8")).token === jwt);
check("normalize copes with an unknown shape", normalize({ foo: { bar: 1 } }).sc.soc === undefined);
fake.close();

// ---------- MCP ----------
let m = await mcpHandle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test" } } }, ctx);
check("MCP initialize", m.result?.serverInfo?.name === "jeevo" && m.result.protocolVersion === "2025-06-18" && m.result.capabilities.tools);
m = await mcpHandle({ jsonrpc: "2.0", id: 2, method: "tools/list" }, ctx);
check("MCP lists Jeevo's tools", m.result.tools.length >= 12 && m.result.tools.every(x => x.inputSchema?.type === "object"), m.result.tools.map(x => x.name).join(","));
m = await mcpHandle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search_memory", arguments: { query: "coffee" } } }, ctx);
check("Claude app can search your memory", /filter coffee/.test(m.result.content[0].text));
m = await mcpHandle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "nope", arguments: {} } }, ctx);
check("unknown tool is a clean JSON-RPC error", m.error?.code === -32602);
check("notifications get no reply", (await mcpHandle({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx)) === null);

// ---------- the live server: API + connector ----------
const dataDir = mkdtempSync(join(tmpdir(), "jeevo-srv-")), PORT = 18048;
const p = spawn("node", ["src/server.mjs"], { cwd: hub, env: { ...process.env, PORT, JEEVO_DATA: dataDir, ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "", HUB_TOKEN: "" }, stdio: ["ignore", "pipe", "pipe"] });
p.stderr.on("data", d => process.stderr.write(d));
await new Promise(r => p.stdout.once("data", r));
const api = async (path, o = {}) => { const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { ...o, headers: { "content-type": "application/json" }, body: o.body ? JSON.stringify(o.body) : undefined }); return { status: res.status, j: await res.json().catch(() => null) }; };
let x = await api("/api/crew"); check("GET /api/crew", x.j.agents.length >= 55);
x = await api("/api/tasks", { method: "POST", body: { title: "pay rent", when: "tomorrow 10am" } }); check("POST /api/tasks", /pay rent/i.test(x.j.line), x.j.line);
x = await api("/api/today"); check("GET /api/today", x.j.tasks.some(t => t.title === "pay rent"));
x = await api("/api/connections"); check("GET /api/connections shows the connector path", /^\/mcp\/.{10,}/.test(x.j.mcp.path));
const secret = JSON.parse(readFileSync(join(dataDir, "mcp.json"), "utf8")).secret;
x = await api("/mcp/wrong", { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } }); check("connector: wrong secret → 404", x.status === 404);
x = await api("/mcp/" + secret, { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "today", arguments: {} } } }); check("connector: today over HTTP", x.status === 200 && /pay rent/.test(x.j.result.content[0].text));
x = await api("/api/push/key"); check("push key for the iPhone app", x.j.publicKey?.length > 60);
x = await api("/api/usage"); check("usage and limits report", x.j.budgetUSD > 0 && x.j.limits.models);
x = await api("/api/crew/butler/run", { method: "POST", body: {} }); check("run an agent from the app", x.j.agent?.name === "butler");
x = await fetch(`http://127.0.0.1:${PORT}/app/`); check("app is served", x.ok && /Jeevo/.test(await x.text()));
p.kill();

console.log(results.every(Boolean) ? `ALL PASS (${results.length})` : `${results.filter(x => !x).length} FAILED of ${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
