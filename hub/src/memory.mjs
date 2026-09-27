// Model of Me + tasks. Everything Jeevo learns about you, in one small file you can read, edit and delete.
//   facts: {id, cat, key, value, source, confidence, t, seen}      tasks: {id, title, due, done, from, t, remindAt, reminded}
// Categories: identity, people, places, food, routine, preference, health, work, money, scooter, home, goal, other.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const CATS = ["identity", "people", "places", "food", "routine", "preference", "health", "work", "money", "scooter", "home", "goal", "other"];
const id = p => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const words = s => String(s || "").toLowerCase().normalize("NFKD").match(/[\p{L}\p{N}]+/gu) || [];

export class Memory {
  constructor(dir) {
    this.file = join(dir, "memory.json");
    const s = existsSync(this.file) ? JSON.parse(readFileSync(this.file, "utf8")) : {};
    this.facts = s.facts || []; this.tasks = s.tasks || []; this.diary = s.diary || []; this.identity = s.identity || [];
  }
  save() { writeFileSync(this.file, JSON.stringify({ facts: this.facts, tasks: this.tasks, diary: this.diary.slice(-400), identity: this.identity })); }

  // ---- facts ----
  remember({ cat = "other", key, value, source = "you", confidence = 0.8 }) {
    if (!value) return null;
    cat = CATS.includes(cat) ? cat : "other";
    key = (key || value).toString().slice(0, 80);
    const same = this.facts.find(f => f.cat === cat && f.key.toLowerCase() === key.toLowerCase());
    if (same) { same.value = value; same.seen = new Date().toISOString(); same.confidence = Math.min(1, Math.max(same.confidence, confidence) + 0.05); same.source = source; this.save(); return same; }
    const f = { id: id("f"), cat, key, value: String(value).slice(0, 400), source, confidence, t: new Date().toISOString(), seen: new Date().toISOString() };
    this.facts.push(f); this.save(); return f;
  }
  forget(fid) { const n = this.facts.length; this.facts = this.facts.filter(f => f.id !== fid); this.save(); return n !== this.facts.length; }
  // Keyword search across facts, tasks and the event log. Good enough on a 1 GB tablet; no embeddings needed.
  search(q, events = [], limit = 12) {
    const qs = words(q).filter(w => w.length > 1 && !STOP.has(w)); if (!qs.length) return [];
    const score = text => { const ws = words(text); let s = 0; for (const w of qs) if (ws.some(x => x === w || (w.length > 3 && x.startsWith(w)))) s++; return s / qs.length; };
    const hits = [];
    for (const f of this.facts) { const s = score(`${f.cat} ${f.key} ${f.value}`); if (s > 0) hits.push({ type: "fact", s: s + 0.3 * f.confidence, id: f.id, text: `${f.key}: ${f.value}`, cat: f.cat, t: f.seen }); }
    for (const tk of this.tasks) { const s = score(tk.title); if (s > 0) hits.push({ type: "task", s, id: tk.id, text: tk.title + (tk.done ? " (done)" : ""), t: tk.t }); }
    for (const e of events) {
      const text = e.text || e.line || e.summary || e.title || (e.order ? `${e.order.app} ${e.order.items || ""} ${e.order.amount || ""}` : "");
      if (!text) continue; const s = score(`${e.kind} ${e.app || ""} ${text}`);
      if (s > 0) hits.push({ type: e.kind, s: s * 0.9, id: e.id, text: String(text).slice(0, 200), t: e.t });
    }
    return hits.sort((a, b) => b.s - a.s || Date.parse(b.t) - Date.parse(a.t)).slice(0, limit);
  }
  profile() {   // the Model of Me, grouped
    const out = {}; for (const f of this.facts.slice().sort((a, b) => b.confidence - a.confidence)) (out[f.cat] ||= []).push(`${f.key}: ${f.value}`);
    return out;
  }

  // ---- tasks and reminders ----
  addTask({ title, due = null, remindAt = null, from = "you" }) {
    const t = { id: id("t"), title: String(title).slice(0, 200), due, remindAt: remindAt || due, done: false, from, t: new Date().toISOString(), reminded: false };
    this.tasks.push(t); this.save(); return t;
  }
  doneTask(tid, done = true) { const t = this.tasks.find(x => x.id === tid || x.title.toLowerCase() === String(tid).toLowerCase()); if (!t) return null; t.done = done; t.doneAt = done ? new Date().toISOString() : null; this.save(); return t; }
  open() { return this.tasks.filter(t => !t.done).sort((a, b) => (a.due ? Date.parse(a.due) : 9e15) - (b.due ? Date.parse(b.due) : 9e15)); }
  dueReminders(now = Date.now()) { return this.tasks.filter(t => !t.done && !t.reminded && t.remindAt && Date.parse(t.remindAt) <= now); }

  // ---- dreams (GrowBot): one diary line a night, identity grows by at most one sentence, capped at 800 characters ----
  dream(line, identitySentence) {
    const day = new Date().toISOString().slice(0, 10);
    if (this.diary.some(d => d.day === day)) return false;
    this.diary.push({ day, line: String(line).slice(0, 300) });
    if (identitySentence) {
      const s = String(identitySentence).trim().slice(0, 200);
      if (s && !this.identity.includes(s)) { this.identity.push(s); while (this.identity.join(" ").length > 800) this.identity.shift(); }
    }
    this.save(); return true;
  }
}
const STOP = new Set("the a an and or of to in on at is are was were do did does i me my you your it this that what when where who how which for with from about any have has had be been will can should would could today yesterday tomorrow kya hai ka ki ke se ko mein aur".split(" "));

// ---- natural-ish time parsing for reminders (English + a little Hindi), IST ----
// "remind me to call mom at 6pm", "tomorrow 9am pay rent", "in 30 min stretch", "tonight laundry", "kal subah 8 baje"
export function parseWhen(text, now = new Date()) {
  const s = text.toLowerCase(); const d = new Date(now); let set = false, dayShift = 0;
  if (/\b(tomorrow|kal)\b/.test(s)) { dayShift = 1; set = true; }
  if (/\bday after tomorrow|parso\b/.test(s)) { dayShift = 2; set = true; }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dm = s.match(/\b(?:on |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dm) { dayShift = (days.indexOf(dm[1]) - now.getDay() + 7) % 7 || 7; set = true; }
  const rel = s.match(/\bin (\d+|an?|half an?)\s*(min|minute|minutes|mins|hour|hours|hr|hrs)\b/);
  if (rel) { const n = /half/.test(rel[1]) ? 0.5 : /^an?$/.test(rel[1]) ? 1 : +rel[1]; return new Date(now.getTime() + n * (/^h/.test(rel[2]) ? 3600e3 : 60e3)).toISOString(); }
  d.setDate(d.getDate() + dayShift);
  const tm = s.match(/\b(?:at |by |@)?(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm|baje)?\b(?!\s*(?:min|hour|%|km|rs|₹))/);
  let h = null, m = 0;
  if (tm && (tm[3] || tm[2] || /\b(at|by|@)\s*\d/.test(s))) { h = +tm[1]; m = +(tm[2] || 0); if (tm[3] === "pm" && h < 12) h += 12; if (tm[3] === "am" && h === 12) h = 0; if (!tm[3] && h < 8) h += 12; }
  if (h == null) {
    if (/\b(morning|subah)\b/.test(s)) h = 9; else if (/\b(afternoon|dopahar)\b/.test(s)) h = 14; else if (/\b(evening|shaam)\b/.test(s)) h = 18; else if (/\b(tonight|night|raat)\b/.test(s)) h = 21;
  }
  if (h == null && !set) return null;
  if (/\b(subah)\b/.test(s) && h > 12) h -= 12;
  if (/\b(shaam|raat)\b/.test(s) && h < 12) h += 12;
  d.setHours(h ?? 9, m, 0, 0);
  if (d <= now && !dayShift) d.setDate(d.getDate() + 1);
  return d.toISOString();
}
export function taskTitle(text) {
  return text.replace(/^(please\s+)?(remind me( to)?|add (a )?(task|todo)( to)?|todo:?|task:?|yaad dilana|mujhe yaad dila(na)?)\s*/i, "")
    .replace(/\b(at|by|@)\s*\d{1,2}([:.]\d{2})?\s*(am|pm|baje)?\b/gi, "").replace(/\b\d{1,2}([:.]\d{2})?\s*(am|pm|baje)\b/gi, "").replace(/\bin (\d+|an?|half an?)\s*(min|minute|minutes|mins|hour|hours|hr|hrs)\b/gi, "")
    .replace(/\b(tomorrow|tonight|today|this (morning|evening|afternoon)|kal|aaj|subah|shaam|raat|(on |next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/gi, "")
    .replace(/\s{2,}/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "").replace(/^to\s+/i, "").replace(/\s+(by|at|on|before|till|until)$/i, "") || text;
}
