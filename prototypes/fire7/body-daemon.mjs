// Jeevo body daemon for the rooted Fire 7 (LineageOS) — runs in Termux with Node 20+.
// Holds the WebSocket to the Soul Core, bridges the Strider's Pico over USB-OTG serial,
// reports battery/temperature (Termux:API), enforces the charge window, and runs the
// motor learner (GaitLearner + ForwardModel) when this body holds the embodiment lease.
// Prototype sketch: fill SOUL_URL/TOKEN in ~/.jeevo.env; check your serial device path.
import { spawnSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { GaitLearner, ForwardModel, strideScore } = require("../legs/learner.js");
const { Emotion } = require("../soul/emotion.js");

const env = Object.fromEntries((existsSync(process.env.HOME + "/.jeevo.env") ? readFileSync(process.env.HOME + "/.jeevo.env", "utf8") : "")
  .split("\n").filter(Boolean).map(l => l.split("=")));
const SOUL_URL = env.SOUL_URL || "wss://soul.example.workers.dev/ws";
const TOKEN = env.TOKEN || "";
const SERIAL = env.SERIAL || "/dev/ttyACM0";            // Pico over USB-OTG (root: chmod 666)

const sh = (cmd, args = []) => { const r = spawnSync(cmd, args, { encoding: "utf8" }); return r.stdout || ""; };
const su = cmd => sh("su", ["-c", cmd]);

// ---- body truth this presence announces ----
const BODY = { id: "fire7", kind: "tablet", screen: [1024, 600], sensors: ["mic", "cam", "accel", "light"], legs: null, massG: 290 };

// ---- battery guardian (root) ----
function battery() {
  try { return JSON.parse(sh("termux-battery-status")); } catch { return {}; }
}
function chargeWindow(b) {
  // Prefer ACC (Magisk module) if installed: `acc 80 40` once. Fallback: sysfs toggle (device-specific).
  const node = "/sys/class/power_supply/battery/charging_enabled";
  if (b.percentage >= 80) su(`[ -w ${node} ] && echo 0 > ${node}`);
  if (b.percentage <= 40) su(`[ -w ${node} ] && echo 1 > ${node}`);
}

// ---- legs over serial ----
let pico = null;
function openLegs() {
  if (!existsSync(SERIAL)) return null;
  su(`chmod 666 ${SERIAL}; stty -F ${SERIAL} 115200 raw -echo`);
  const out = createWriteStream(SERIAL);
  createReadStream(SERIAL).on("data", d => d.toString().split("\n").filter(Boolean).forEach(line => {
    try { const m = JSON.parse(line); if (m.t === "hello" || m.t === "body") BODY.legs = m.body; } catch {}
  }));
  const send = m => out.write(JSON.stringify(m) + "\n");
  send({ t: "body?" });
  return { send };
}

// ---- soul link ----
const emotion = new Emotion();
let ws, lease = false, learner = null, fm = new ForwardModel();
function connect() {
  ws = new WebSocket(SOUL_URL + "?token=" + encodeURIComponent(TOKEN));
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", presence: "fire7", body: BODY, caps: ["face", "speak", "listen", "see", "legs"] }));
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.t === "lease") {                                   // embodiment lease granted/revoked
      lease = m.holder === "fire7";
      if (lease) { emotion.appraise("transfer_in"); learner = new GaitLearner(m.gaitPrior); }
      else pico?.send({ t: "stop" });
    }
    if (m.t === "emotion") Object.assign(emotion, m.state);
    if (m.t === "intent" && m.do === "walk" && lease && pico) walkEpisode(m.seconds || 20);
    if (m.t === "intent" && m.do === "pose" && pico) pico.send({ t: "pose", v: m.v });
  };
  ws.onclose = () => setTimeout(connect, 3000);
}

// ---- one learning episode: propose gait, walk a stride window, score it ----
async function walkEpisode(seconds) {
  const cand = learner.propose(g => g.amp < 40 || fm.errEMA < 0.02);   // forward model vetoes big swings while it's unsure
  const ex = emotion.express();
  pico.send({ t: "gait", amp: cand.amp * ex.gait.ampScale, freq: cand.freq * ex.gait.freqScale, phase: cand.phase, bias: cand.bias, on: true });
  const keep = setInterval(() => pico.send({ t: "gait", on: true }), 300);   // heartbeat under the 500 ms dead-man
  // TODO: progress from camera optical flow (face UI posts it), tilt variance from termux-sensor accel
  const metrics = await new Promise(r => setTimeout(() => r({ progress: 0, tiltVar: 0, fell: false, effort: cand.amp / 45 }), seconds * 1000));
  clearInterval(keep); pico.send({ t: "stop" });
  const score = strideScore(metrics), won = learner.report(cand, score);
  if (won) emotion.appraise("learned_step");
  ws.send(JSON.stringify({ t: "learn", body: "strider", gait: learner.best, score, trials: learner.trials }));
}

pico = openLegs();
connect();
setInterval(() => {
  const b = battery(); chargeWindow(b);
  emotion.tick(30, { charging: b.status === "CHARGING" });
  if (b.temperature > 40) ws?.send(JSON.stringify({ t: "event", e: "hot", temp: b.temperature }));
  ws?.readyState === 1 && ws.send(JSON.stringify({ t: "presence", device: "fire7", battery: b.percentage / 100, temp: b.temperature, lease }));
}, 30000);
