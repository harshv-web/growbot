// The soul: shared mood (emotion engine) + per-body sensations + an append-only event log.
import { createRequire } from "node:module";
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const { Emotion } = require(join(here, "../../prototypes/soul/emotion.js"));

// Sensations a single body feels on its own, layered over the soul's mood.
// [label shown, seconds it lasts, face overrides]
export const SENSATIONS = {
  dizzy:   ["Dizzy",   6,  { eyes: "spiral", mouth: -0.2 }],
  tickled: ["Tickled", 4,  { eyes: "squint", mouth: 1 }],
  cosy:    ["Cosy",    20, { eyes: "soft",   mouth: 0.4, eyeOpen: 0.35 }],
  hungry:  ["Hungry",  600,{ eyes: "sad",    mouth: -0.3 }],
  worried: ["Worried", 600,{ eyes: "sad",    mouth: -0.4 }],
  focused: ["Focused", 1800,{ eyes: "narrow", mouth: 0 }],
  hot:     ["Too hot", 300,{ eyes: "tired",  mouth: -0.2 }],
  love:    ["Love",    6,  { eyes: "heart",  mouth: 1 }],
  listening:["Listening",8,{ eyes: "wide",   mouth: 0 }],
  thinking:["Thinking",8,  { eyes: "up",     mouth: 0 }],
  talking: ["Talking", 6,  { eyes: "happy",  mouth: 0.5, talk: true }],
  surprised:["Surprised",3,{ eyes: "wide",   mouth: -0.1, o: true }]
};

export class Soul {
  constructor(dataDir) {
    this.dir = dataDir; mkdirSync(dataDir, { recursive: true });
    this.stateFile = join(dataDir, "soul.json");
    this.logFile = join(dataDir, "events.jsonl");
    const saved = existsSync(this.stateFile) ? JSON.parse(readFileSync(this.stateFile, "utf8")) : {};
    this.emotion = new Emotion(saved.emotion);
    this.sense = {};            // body -> {name, until}
    this.facts = saved.facts || {};
    this.lease = saved.lease || "tablet";
    this.status = saved.status || {};   // scooter, calendar, messages, etc. (latest snapshot per adapter)
    this.recent = [];
    if (existsSync(this.logFile)) {
      const lines = readFileSync(this.logFile, "utf8").trim().split("\n").filter(Boolean);
      this.recent = lines.slice(-400).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    }
  }
  log(ev) {
    const e = Object.assign({ id: "ev_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: new Date().toISOString() }, ev);
    appendFileSync(this.logFile, JSON.stringify(e) + "\n");
    this.recent.push(e); if (this.recent.length > 400) this.recent.shift();
    return e;
  }
  feel(appraisal, strength = 1) { return this.emotion.appraise(appraisal, strength); }
  sensation(body, name) {
    const s = SENSATIONS[name]; if (!s) return;
    this.sense[body] = { name, until: Date.now() + s[1] * 1000 };
  }
  tick(dtSec, ctx) { this.emotion.tick(dtSec, ctx); }
  // What a given body should show right now.
  expressFor(body) {
    const ex = this.emotion.express();
    const s = this.sense[body];
    if (s && s.until > Date.now()) {
      const [label, , o] = SENSATIONS[s.name];
      return Object.assign({}, ex, { label: s.name, text: label, sensation: true }, o.eyeOpen ? { eyeOpen: o.eyeOpen } : {}, { mouth: o.mouth ?? ex.mouth, eyes: o.eyes, talk: !!o.talk, o: !!o.o });
    }
    return Object.assign({ eyes: ex.label === "sleepy" ? "tired" : ex.label === "grumpy" ? "angry" : ex.label === "joyful" || ex.label === "proud" || ex.label === "excited" ? "happy" : ex.label === "lonely" ? "sad" : ex.label === "curious" ? "wide" : "normal" }, ex);
  }
  snapshot() {
    return { emotion: this.emotion.toJSON(), mood: this.emotion.express(), lease: this.lease, status: this.status, facts: this.facts,
      bodies: Object.fromEntries(["tablet", "keychain", "desk", "scooter"].map(b => [b, this.expressFor(b)])) };
  }
  save() { writeFileSync(this.stateFile, JSON.stringify({ emotion: this.emotion.toJSON(), facts: this.facts, lease: this.lease, status: this.status })); }
  since(ms) { const cut = Date.now() - ms; return this.recent.filter(e => Date.parse(e.t) >= cut); }
}
