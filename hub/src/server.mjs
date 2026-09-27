// Jeevo hub: the local soul on the Fire 7. One port for everything.
//   /app            the Jeevo app (tablet + iPhone, installable)     /face   the full-screen face
//   /input          one input, many ways (voice, text, NFC, Shortcuts, SMS, health, places…)
//   /api/*          data for the app                                  /ws     live state for faces and ESP32 bodies
//   /mcp/<secret>   Jeevo as a connector for your own Claude app
import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";
import { Soul } from "./soul.mjs";
import { Router } from "./router.mjs";
import { Brain } from "./brain.mjs";
import { Memory } from "./memory.mjs";
import { Crew, DEPTS } from "./crew/index.mjs";
import { Push } from "./push.mjs";
import { mcpHandle } from "./mcp.mjs";
import { today as todayTool } from "./tools.mjs";
import { orders } from "./orders.mjs";
import { Ather } from "./adapters/ather.mjs";
import { notificationsAdapter } from "./adapters/notifications.mjs";
import { calendarAdapter } from "./adapters/calendar.mjs";
import { emailAdapter } from "./adapters/email.mjs";
import { Life } from "./life.mjs";
import { snap } from "./adapters/camera.mjs";
import { tabletAdapter } from "./adapters/tablet.mjs";

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const readJSON = f => existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
const cfg = readJSON(join(root, "config.json")) || readJSON(join(root, "config.example.json"));
const secrets = Object.assign({}, readJSON(join(root, "secrets.json")) || {}, Object.fromEntries(Object.entries(process.env).filter(([k]) => /API_KEY|TOKEN|PASSWORD|SECRET/.test(k))));
const PORT = +(process.env.PORT || cfg.port || 8047);
process.env.TZ = cfg.timezone || "Asia/Kolkata";   // reminders and schedules run on India time, whatever the tablet says
const dataDir = process.env.JEEVO_DATA || join(root, "data"); mkdirSync(dataDir, { recursive: true });

const soul = new Soul(dataDir);
const memory = new Memory(dataDir);
const router = new Router(cfg, secrets, dataDir);
const profile = readJSON(join(root, "profile.json")) || readJSON(join(root, "profile.example.json"));
const push = new Push(dataDir, cfg);
const ather = new Ather(soul, cfg, secrets, dataDir);
const clients = new Map();   // ws -> {body, compact, eyes}

// The MCP connector's secret path. Set MCP_SECRET yourself, or one is made once and kept in data/mcp.json.
const mcpFile = join(dataDir, "mcp.json");
const MCP_SECRET = secrets.MCP_SECRET || readJSON(mcpFile)?.secret || (() => { const s = randomBytes(18).toString("base64url"); writeFileSync(mcpFile, JSON.stringify({ secret: s })); return s; })();

// ---------- one way out: every nudge, reminder and alert ----------
// Respects quiet hours, Do Not Disturb (iPhone Focus / stress guard), sources the critic has quieted,
// and a daily cap. Faces get everything; the keychain gets alerts; the iPhone gets important ones by push.
const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
function quietNow() { const [a, b] = (profile.quietHours || ["00:30", "07:30"]).map(toMin), d = new Date(), m = d.getHours() * 60 + d.getMinutes(); return a < b ? m >= a && m < b : m >= a || m < b; }
function pushLine(line, from = "jeevo", o = {}) {
  if (!line) return false;
  const st = soul.status, important = !!(o.important || o.alert);
  // `live` = a reaction to you being right there (a wave, a greeting): never held.
  const why = o.live ? null : !o.alert && quietNow() ? "quiet hours" : !important && st.dnd && st.dnd.until > Date.now() ? "do not disturb" : !important && (st.quietSources || []).includes(from) ? "quieted by critic" : null;
  const sentToday = soul.since(24 * 3600e3).filter(e => e.kind === "nudge" && new Date(e.t).toDateString() === new Date().toDateString());
  const cap = o.live ? null : !important && sentToday.filter(e => !e.important).length >= (cfg.nudges?.maxPerDay ?? 10) ? "daily cap" : important && sentToday.length >= (cfg.nudges?.maxImportantPerDay ?? 30) ? "daily cap" : null;
  if (why || cap) { soul.log({ kind: "held", line, from, why: why || cap }); return false; }
  soul.log({ kind: "nudge", line, from, important, deep: o.deep || null });
  for (const [ws, c] of clients) if (ws.readyState === 1) ws.send(JSON.stringify(c.compact ? (important ? { t: "alert", text: line.slice(0, 120), from, taskId: o.taskId || null } : { t: "note", text: line.slice(0, 80) }) : { t: "nudge", line, from, deep: o.deep || null, important }));
  if (important && push.subs.length) push.send({ title: "Jeevo", body: line, tag: from, important: true }).catch(() => {});
  return true;
}

const life = new Life(soul, profile, (line, from) => pushLine(line, from));
const needsYou = async text => {
  if (/\?|urgent|asap|call me|please|kab|kaha|reply|jaldi/i.test(text)) return true;
  const r = await router.text("fast", "Does this message need the owner's reply or action today? Answer yes or no.", text, { agent: "inbox-sort" });
  return /^yes/i.test(r?.text?.trim() || "no");
};
const frames = new Map();
function faceSnap() {
  const face = [...clients].find(([ws, c]) => c.eyes && ws.readyState === 1);
  if (!face) return Promise.resolve(null);
  const id = Math.random().toString(36).slice(2);
  face[0].send(JSON.stringify({ t: "snap", id }));
  return new Promise(res => { frames.set(id, res); setTimeout(() => frames.delete(id) && res(null), 5000); });
}
const brain = new Brain(soul, router, cfg, profile, async () => (await faceSnap()) || snap(cfg), memory);
const ctx = { soul, memory, router, profile, cfg, push: pushLine, life, ather, brain };
brain.ctx = ctx;
const crew = new Crew(ctx);
brain.crew = crew; ctx.crew = crew;

// ---------- HTTP ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
// Localhost is trusted so the tablet's own screens need no token. With Tailscale in userspace mode, remote
// connections also arrive from 127.0.0.1: set "trustLocalhost": false to require the token everywhere.
const local = req => cfg.trustLocalhost !== false && /127\.0\.0\.1|::1$/.test(req.socket.remoteAddress || "");
const authed = req => !secrets.HUB_TOKEN || req.headers.authorization === "Bearer " + secrets.HUB_TOKEN || new URL(req.url, "http://x").searchParams.get("token") === secrets.HUB_TOKEN || local(req);
async function body(req) { let b = ""; for await (const c of req) { b += c; if (b.length > 8e6) throw Object.assign(new Error("too big"), { code: 413 }); } try { return JSON.parse(b || "{}"); } catch { return { text: b }; } }

function lifeData() {
  const st = soul.status, DAY = 864e5;
  return {
    mood: st.userMood || {}, health: st.health || null, healthTrend: st.insights?.health || null, screen: st.screen || null,
    habits: st.habits || null, spendCats: st.spendCats || {}, money: st.money || {}, subscriptions: st.subscriptions || [], restock: st.restock || [],
    rides: soul.since(14 * DAY).filter(e => e.kind === "ride" && e.stage === "end").slice(-20), charging: st.charging || null,
    routine: st.routine || {}, people: Object.entries(st.people || {}).sort((a, b) => Date.parse(b[1].last) - Date.parse(a[1].last)).slice(0, 30).map(([name, p]) => ({ name, ...p })),
    places: st.places || {}, ideas: (st.ideas || []).slice(-20).reverse(), content: (st.contentIdeas || []).slice(-10).reverse(), week: st.week || null, standup: st.standup || null,
    coach: st.coach || null, diary: memory.diary.slice(-14).reverse(), identity: memory.identity, insights: st.insights || {}, weather: st.weather || null,
    orders: orders(soul.since(14 * DAY)).slice(-30).reverse(), gaps: (st.gaps || []).slice(-10)
  };
}
function connections() {
  const st = soul.status, DAY = 864e5, last = k => soul.since(7 * DAY).filter(e => e.kind === k).at(-1)?.t || null;
  return {
    models: { claude: !!router.claude, gemini: !!router.gemini, config: cfg.models },
    ather: ather.status(),
    notifications: { on: cfg.adapters?.notifications?.enabled !== false, last: last("message") },
    email: { on: !!cfg.adapters?.email?.enabled, user: cfg.adapters?.email?.user || null },
    calendar: { on: !!cfg.adapters?.calendar?.enabled, events: st.calendar?.today?.length ?? null, t: st.calendar?.t || null },
    iphone: { lastSync: st.phoneSync || null, health: !!st.health, push: push.status() },
    camera: { faceEyes: cfg.camera?.faceEyes !== false, facesWithEyes: [...clients.values()].filter(c => c.eyes).length },
    tablet: st.tablet || null, weather: st.weather ? { tempC: st.weather.tempC, t: st.weather.t } : null,
    devices: [...clients.values()].map(c => c.body),
    mcp: { path: "/mcp/" + MCP_SECRET }, work: cfg.workCompartment || { enabled: false }
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x"), path = url.pathname, method = req.method;
  const send = (code, b, type = "application/json", extra = {}) => { res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*", "cache-control": "no-store", ...extra }); res.end(typeof b === "string" || Buffer.isBuffer(b) ? b : JSON.stringify(b)); };
  try {
    if (method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type,mcp-protocol-version,mcp-session-id", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS" }); return res.end(); }

    // ---- Claude connector (MCP) ----
    if (path.startsWith("/mcp/")) {
      if (path !== "/mcp/" + MCP_SECRET) return send(404, { error: "not found" });
      if (method !== "POST") return send(405, { error: "POST only" }, "application/json", { allow: "POST" });
      const msg = await body(req);
      const out = Array.isArray(msg) ? (await Promise.all(msg.map(m => mcpHandle(m, ctx)))).filter(Boolean) : await mcpHandle(msg, ctx);
      if (!out || (Array.isArray(out) && !out.length)) { res.writeHead(202, { "access-control-allow-origin": "*" }); return res.end(); }
      broadcast(); return send(200, out);
    }

    if (path === "/input" && method === "POST") {
      if (!authed(req)) return send(401, { error: "token" });
      const out = await brain.input(await body(req));
      broadcast(); soul.save();
      return send(200, out);
    }
    if (path.startsWith("/api/")) {
      if (!authed(req)) return send(401, { error: "token" });
      const seg = path.split("/").slice(2);   // e.g. ["tasks", "<id>", "done"]
      const b = method === "POST" || method === "DELETE" ? await body(req) : {};
      switch (seg[0]) {
        case "state": return send(200, soul.snapshot());
        case "log": return send(200, soul.since(+(url.searchParams.get("h") || 24) * 3600e3).slice(-300));
        case "today": return send(200, { ...todayTool(ctx), weather: soul.status.weather || null, money: soul.status.money || null, bills: soul.status.bills || [], focusBlock: soul.status.focusBlock || null, dnd: soul.status.dnd || null, insights: soul.status.insights || {}, nudges: soul.since(864e5).filter(e => e.kind === "nudge").slice(-30).reverse() });
        case "life": return send(200, lifeData());
        case "inbox":
          if (method === "POST" && seg[1]) { const m = (soul.status.inbox || []).find(x => x.id === seg[1]); if (m) m.done = true; return send(200, { ok: !!m }); }
          return send(200, (soul.status.inbox || []).slice().reverse());
        case "memory":
          if (method === "DELETE" && seg[1]) return send(200, { ok: memory.forget(seg[1]) });
          if (method === "POST") return send(200, memory.remember({ cat: b.category || b.cat, key: b.key, value: b.fact || b.value, source: "you", confidence: 1 }));
          return send(200, url.searchParams.get("q") ? memory.search(url.searchParams.get("q"), soul.recent, 30) : { facts: memory.facts.slice().sort((a, x) => Date.parse(x.seen) - Date.parse(a.seen)), identity: memory.identity, diary: memory.diary.slice(-30).reverse() });
        case "tasks":
          if (method === "POST" && seg[1] && seg[2] === "done") return send(200, memory.doneTask(seg[1], b.done !== false) || { error: "no task" });
          if (method === "POST") return send(200, await brain.command("remind me " + (b.title || "") + (b.when ? " " + b.when : ""), { from: "app" }));
          return send(200, { open: memory.open(), done: memory.tasks.filter(t => t.done).slice(-30).reverse() });
        case "crew":
          if (method === "POST" && seg[1] && seg[2] === "run") return send(200, { summary: await crew.run(seg[1], { kind: "manual" }), agent: crew.list().find(a => a.name === seg[1]) });
          if (method === "POST" && seg[1] && seg[2] === "toggle") return send(200, crew.toggle(seg[1], !!b.on));
          return send(200, { depts: DEPTS, agents: crew.list(), queue: crew.queue.length, running: crew.running });
        case "usage": return send(200, { ...router.limits.report(), lastBlock: router.lastBlock, limits: router.limits.c });
        case "connections": return send(200, connections());
        case "test-models": return send(200, await router.test());
        case "ather":
          if (method === "POST" && seg[1] === "otp") return send(200, await ather.sendOtp(b.phone));
          if (method === "POST" && seg[1] === "verify") return send(200, await ather.verifyOtp(b.phone, b.otp));
          if (method === "POST" && seg[1] === "logout") return send(200, ather.logout());
          if (method === "POST" && seg[1] === "refresh") { await ather.poll(); return send(200, { scooter: soul.status.scooter || null, status: ather.status() }); }
          return send(200, { status: ather.status(), scooter: soul.status.scooter || null, signals: soul.status.scooterSignals || {}, parked: soul.status.parked || null, charging: soul.status.charging || null, rides: soul.since(14 * 864e5).filter(e => e.kind === "ride").slice(-30).reverse() });
        case "push":
          if (seg[1] === "key") return send(200, { publicKey: push.publicKey() });
          if (method === "POST" && seg[1] === "subscribe") return send(200, push.subscribe(b.subscription, b.device));
          if (method === "POST" && seg[1] === "test") return send(200, await push.send({ body: "Hi from Jeevo. Push works.", important: true }));
          return send(200, push.status());
        case "dnd": soul.status.dnd = b.minutes ? { until: Date.now() + b.minutes * 60e3, why: "you asked" } : null; return send(200, { dnd: soul.status.dnd });
        default: return send(404, { error: "no such api" });
      }
    }

    // ---- static: the app, the face ----
    if (path === "/" || path === "") return send(302, "", "text/plain", { location: "/app/" });
    const base = path.startsWith("/app") ? join(root, "app") : join(root, "face");
    const rel = path.replace(/^\/(app|face)\/?/, "").replace(/^\/+/, "") || "index.html";
    const file = normalize(join(base, rel));
    if (file.startsWith(base) && existsSync(file)) return send(200, readFileSync(file), MIME[extname(file)] || "application/octet-stream", rel === "sw.js" ? { "service-worker-allowed": "/" } : {});
    return send(404, { error: "not found" });
  } catch (e) {
    return send(e.code === 413 ? 413 : 500, { error: String(e.message || e).slice(0, 200) });
  }
});

// ---------- WebSocket: app screens, faces and ESP32 bodies ----------
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 10e6 });
const pick = e => ({ label: e.label, text: e.text, eyes: e.eyes, eyeOpen: +e.eyeOpen.toFixed(2), mouth: +e.mouth.toFixed(2), hue: e.hue, glow: !!e.glow, talk: !!e.talk });
function keyInfo() {   // what the keychain's pages show
  const st = soul.status, now = new Date().toTimeString().slice(0, 5);
  const nextBlock = st.plan?.day === new Date().toDateString() ? st.plan.blocks.find(b => b.time >= now) : null;
  const nextEvent = (st.calendar?.today || []).find(e => e.time >= now);
  const next = nextEvent || nextBlock ? `${(nextEvent || nextBlock).time} ${(nextEvent?.summary || nextBlock?.title || "").slice(0, 18)}` : "";
  return { next, soc: st.scooter?.soc ?? -1, range: st.scooter?.rangeKm ?? -1, charging: !!st.scooter?.charging, needs: (st.inbox || []).filter(m => m.needsYou && !m.done).length, tasks: memory.open().length, weather: st.weather ? Math.round(st.weather.tempC) + "C" + (st.weather.rainSoon ? " rain" : "") : "" };
}
function broadcast() {
  const snapshot = soul.snapshot(), info = keyInfo();
  for (const [ws, c] of clients) {
    if (ws.readyState !== 1) continue;
    if (c.compact) ws.send(JSON.stringify({ t: "mood", ...pick(snapshot.bodies[c.body] || snapshot.bodies.keychain), info }));
    else ws.send(JSON.stringify({ t: "state", ...snapshot }));
  }
}
wss.on("connection", (ws, req) => {
  const q = new URL(req.url, "http://x").searchParams;
  if (secrets.HUB_TOKEN && q.get("token") !== secrets.HUB_TOKEN && !local(req)) { ws.close(4001, "token"); return; }
  clients.set(ws, { body: q.get("body") || "tablet", compact: q.get("compact") === "1" });
  soul.log({ kind: "presence", body: q.get("body") || "tablet", state: "online" });
  broadcast();
  ws.on("message", async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const c = clients.get(ws); if (!c) return;
    const body = c.body, reply = o => ws.readyState === 1 && ws.send(JSON.stringify(o));
    try {
      if (m.t === "input") { const out = await brain.input({ ...m, from: m.from || body }); reply({ t: "reply", ...out }); broadcast(); }
      if (m.t === "sense") { soul.sensation(body, m.name); if (m.name === "dizzy") soul.feel("played", 0.6); if (m.name === "tickled") soul.feel("petted", 0.6); broadcast(); }
      if (m.t === "look") { const out = await brain.look(m.q || "What do you see?", m.image || null); reply({ t: "reply", ...out }); broadcast(); }
      if (m.t === "hear") {
        const text = m.audio ? await router.transcribe(m.audio, m.mime || "audio/webm") : null;
        if (!text) { reply({ t: "reply", line: router.available().gemini ? "I didn't catch that." : "I need a Gemini key to hear on this tablet. Type for now?", deep: null }); return; }
        reply({ t: "heard", text });
        const out = await brain.input({ kind: "voice", text, from: body }); reply({ t: "reply", ...out }); broadcast();
      }
      if (m.t === "eyes") c.eyes = !!m.on;
      if (m.t === "frame" && frames.has(m.id)) { frames.get(m.id)(m.image || null); frames.delete(m.id); }
      if (m.t === "room" && typeof m.what === "string") { const line = brain.room(m.what); if (line) pushLine(line, "eyes", { live: true }); broadcast(); }
      if (m.t === "lease") { soul.lease = body; soul.feel("transfer_in"); broadcast(); }
      if (m.t === "ack" && m.taskId) memory.doneTask(m.taskId);
      if (m.t === "battery" && typeof m.pct === "number") soul.status.keyBattery = { pct: m.pct, t: new Date().toISOString() };
    } catch (e) { reply({ t: "reply", line: "Something went wrong there.", deep: String(e.message || e) }); }
  });
  ws.on("close", () => { const b = clients.get(ws)?.body; clients.delete(ws); soul.log({ kind: "presence", body: b, state: "offline" }); });
});

// ---------- the heartbeat ----------
let last = Date.now();
setInterval(() => {
  const now = Date.now(); soul.tick((now - last) / 1000, { alone: clients.size <= 1 }); last = now;
  life.chores(new Date());
  crew.tick(new Date());
  broadcast(); soul.save();
}, +(process.env.JEEVO_TICK_MS || 5000));

ather.start();
notificationsAdapter(soul, cfg, needsYou);
calendarAdapter(soul, cfg);
emailAdapter(soul, cfg, secrets, needsYou);
tabletAdapter(soul, (line, from) => pushLine(line, from, { important: true }));

server.listen(PORT, "0.0.0.0", () => console.log(`Jeevo hub on :${PORT} · ${crew.list().length} agents · models ${JSON.stringify(router.available())} · app at http://localhost:${PORT}/app/`));
