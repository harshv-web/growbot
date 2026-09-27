// Jeevo hub: the local soul. HTTP + WebSocket on one port.
//   GET  /            → tablet face (hub/face)
//   GET  /api/state   → soul snapshot
//   POST /input       → one input, many ways {kind, text?, data?, from}
//   WS   /ws          → faces and ESP32 bodies (hello, input, state pushes)
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { Soul } from "./soul.mjs";
import { Router } from "./router.mjs";
import { Brain } from "./brain.mjs";
import { atherAdapter } from "./adapters/ather.mjs";
import { notificationsAdapter } from "./adapters/notifications.mjs";
import { calendarAdapter } from "./adapters/calendar.mjs";
import { emailAdapter } from "./adapters/email.mjs";
import { Life } from "./life.mjs";
import { snap } from "./adapters/camera.mjs";
import { tabletAdapter } from "./adapters/tablet.mjs";

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const readJSON = f => existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
const cfg = readJSON(join(root, "config.json")) || readJSON(join(root, "config.example.json"));
const secrets = Object.assign({}, readJSON(join(root, "secrets.json")) || {}, Object.fromEntries(Object.entries(process.env).filter(([k]) => /API_KEY|TOKEN|PASSWORD/.test(k))));
const PORT = +(process.env.PORT || cfg.port || 8047);

const soul = new Soul(join(root, "data"));
const router = new Router(cfg, secrets);
const profile = readJSON(join(root, "profile.json")) || readJSON(join(root, "profile.example.json"));
// A picture on request: ask an open face whose camera is on (it already holds the camera), else termux-camera-photo.
const frames = new Map();
function faceSnap() {
  const face = [...clients].find(([ws, c]) => c.eyes && ws.readyState === 1);
  if (!face) return Promise.resolve(null);
  const id = Math.random().toString(36).slice(2);
  face[0].send(JSON.stringify({ t: "snap", id }));
  return new Promise(res => { frames.set(id, res); setTimeout(() => frames.delete(id) && res(null), 5000); });
}
const brain = new Brain(soul, router, cfg, profile, async () => (await faceSnap()) || snap(cfg));
const toFaces = (line, from) => { for (const [ws, c] of clients) if (ws.readyState === 1 && !c.compact) ws.send(JSON.stringify({ t: "nudge", line, from })); };
const life = new Life(soul, profile, (line, from) => { soul.log({ kind: "nudge", line, from }); toFaces(line, from); });
const needsYou = async text => {
  if (/\?|urgent|asap|call me|please|kab|kaha|reply/i.test(text)) return true;
  const r = await router.text("classify", "Does this message need the owner's reply or action today? Answer yes or no.", text);
  return /^yes/i.test(r?.text?.trim() || "no");
};

// ---------- HTTP ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
// Localhost is trusted by default so the tablet's own face needs no token. With Tailscale in userspace mode,
// connections from your other devices also arrive from 127.0.0.1: set "trustLocalhost": false to require the token everywhere.
const local = req => cfg.trustLocalhost !== false && req.socket.remoteAddress?.includes("127.0.0.1");
const authed = req => !secrets.HUB_TOKEN || req.headers.authorization === "Bearer " + secrets.HUB_TOKEN || new URL(req.url, "http://x").searchParams.get("token") === secrets.HUB_TOKEN || local(req);
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, body, type = "application/json") => { res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*" }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
  if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type" }); return res.end(); }
  if (url.pathname.startsWith("/api/") && !authed(req)) return send(401, { error: "token" });
  if (url.pathname === "/api/state") return send(200, soul.snapshot());
  if (url.pathname === "/input" && req.method === "POST") {
    if (!authed(req)) return send(401, { error: "token" });
    let body = ""; for await (const c of req) { body += c; if (body.length > 8e6) return send(413, { error: "too big" }); }
    let inp; try { inp = JSON.parse(body || "{}"); } catch { inp = { kind: "text", text: body }; }
    const out = await brain.input(inp);
    broadcast(); soul.save();
    return send(200, out);
  }
  if (url.pathname === "/api/log") return send(200, soul.since(+(url.searchParams.get("h") || 24) * 3600e3).slice(-200));
  // static face
  const file = join(root, "face", url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, ""));
  if (file.startsWith(join(root, "face")) && existsSync(file)) return send(200, readFileSync(file), MIME[extname(file)] || "application/octet-stream");
  send(404, { error: "not found" });
});

// ---------- WebSocket: faces + ESP32 bodies ----------
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Map();   // ws -> {body}
function broadcast() {
  const snap = soul.snapshot();
  for (const [ws, c] of clients) {
    if (ws.readyState !== 1) continue;
    // ESP32s get a compact frame for their own body; faces get everything
    if (c.compact) ws.send(JSON.stringify({ t: "mood", ...pick(snap.bodies[c.body] || snap.bodies.keychain) }));
    else ws.send(JSON.stringify({ t: "state", ...snap }));
  }
}
const pick = e => ({ label: e.label, text: e.text, eyes: e.eyes, eyeOpen: +e.eyeOpen.toFixed(2), mouth: +e.mouth.toFixed(2), hue: e.hue, glow: !!e.glow, talk: !!e.talk });
wss.on("connection", (ws, req) => {
  const q = new URL(req.url, "http://x").searchParams;
  if (secrets.HUB_TOKEN && q.get("token") !== secrets.HUB_TOKEN && !local(req)) { ws.close(4001, "token"); return; }
  clients.set(ws, { body: q.get("body") || "tablet", compact: q.get("compact") === "1" });
  soul.log({ kind: "presence", body: q.get("body") || "tablet", state: "online" });
  broadcast();
  ws.on("message", async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const body = clients.get(ws).body;
    if (m.t === "input") { const out = await brain.input({ ...m, from: m.from || body }); ws.send(JSON.stringify({ t: "reply", ...out })); broadcast(); }
    if (m.t === "sense") { soul.sensation(body, m.name); if (m.name === "dizzy") soul.feel("played", 0.6); if (m.name === "tickled") soul.feel("petted", 0.6); broadcast(); }
    if (m.t === "look") { const out = await brain.look(m.q || "What do you see?", m.image || null); ws.send(JSON.stringify({ t: "reply", ...out })); broadcast(); }
    if (m.t === "hear") {
      const text = m.audio ? await router.transcribe(m.audio, m.mime || "audio/webm") : null;
      if (!text) { ws.send(JSON.stringify({ t: "reply", line: router.available().gemini ? "I didn't catch that." : "I need a Gemini key to hear on this tablet. Type for now?", deep: null })); return; }
      ws.send(JSON.stringify({ t: "heard", text }));
      const out = await brain.input({ kind: "voice", text, from: body }); ws.send(JSON.stringify({ t: "reply", ...out })); broadcast();
    }
    if (m.t === "eyes") clients.get(ws).eyes = !!m.on;
    if (m.t === "frame" && frames.has(m.id)) { frames.get(m.id)(m.image || null); frames.delete(m.id); }
    if (m.t === "room" && typeof m.what === "string") { const line = brain.room(m.what); if (line) { soul.log({ kind: "nudge", line, from: "eyes" }); toFaces(line, "eyes"); } broadcast(); }
    if (m.t === "lease") { soul.lease = body; soul.feel("transfer_in"); broadcast(); }
  });
  ws.on("close", () => { const b = clients.get(ws)?.body; clients.delete(ws); soul.log({ kind: "presence", body: b, state: "offline" }); });
});

// ---------- life loop ----------
let last = Date.now();
setInterval(() => {
  const now = Date.now(); soul.tick((now - last) / 1000, { alone: clients.size <= 1 }); last = now;
  life.tick(new Date());
  broadcast(); soul.save();
}, 5000);

atherAdapter(soul, cfg, secrets);
notificationsAdapter(soul, cfg, needsYou);
calendarAdapter(soul, cfg);
emailAdapter(soul, cfg, secrets, needsYou);
tabletAdapter(soul, (line, from) => { soul.log({ kind: "nudge", line, from }); toFaces(line, from); });

server.listen(PORT, "0.0.0.0", () => console.log(`Jeevo hub on :${PORT} · models ${JSON.stringify(router.available())} · face at http://localhost:${PORT}/`));
