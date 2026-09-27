// Model router: many models, one door. Picks a model per job, respects rate limits and the daily budget,
// falls back to the next model when one is busy or missing, and returns null so callers use rules.
// Claude via the official SDK; Gemini via its REST API. Model ids come from config.json → models.
//   jobs: fast (sort, extract) · chat (talk) · agent (tools, planning) · deep (dreams, weekly review) · vision · audio
import Anthropic from "@anthropic-ai/sdk";
import { claudeTools, runTool } from "./tools.mjs";
import { Limiter } from "./limits.mjs";

export class Router {
  constructor(cfg, secrets, dataDir) {
    this.cfg = { fast: cfg.models.classify, ...cfg.models };
    this.claude = secrets.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: secrets.ANTHROPIC_API_KEY, maxRetries: 1 }) : null;
    this.gemini = secrets.GEMINI_API_KEY || null;
    this.limits = new Limiter(cfg.limits || {}, dataDir);
    this.spend = { calls: 0 }; this.lastBlock = null;
  }
  available() { return { claude: !!this.claude, gemini: !!this.gemini }; }
  has(p) { return p === "claude" ? !!this.claude : p === "gemini" ? !!this.gemini : false; }
  order(job) {
    const m = this.cfg;
    return ({
      fast:   [["claude", m.classify], ["gemini", m.chat]],
      classify: [["claude", m.classify], ["gemini", m.chat]],
      chat:   [["gemini", m.chat], ["claude", m.agent], ["claude", m.classify]],
      agent:  [["claude", m.agent], ["gemini", m.chat]],
      deep:   [["claude", m.deep], ["claude", m.agent], ["gemini", m.chat]],
      vision: [["claude", m.agent], ["gemini", m.chat]],
      audio:  [["gemini", m.audio || m.chat]]
    })[job] || [["claude", m.agent]];
  }
  // First model in the job's order that has a key and room under the limits.
  pick(job, o = {}) {
    for (const [p, model] of this.order(job)) {
      if (!this.has(p) || !model) continue;
      const a = this.limits.allow(model, o.prio || "background", o.agent);
      if (a.ok) return [p, model];
      this.lastBlock = { model, why: a.why, t: new Date().toISOString() };
    }
    return null;
  }
  noteClaude(model, res, o) {
    this.spend.calls++;
    const u = res.usage || {};
    return this.limits.record(model, { in: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), cached: u.cache_read_input_tokens || 0, out: u.output_tokens || 0 }, o.prio || "background", o.agent);
  }

  async claudeText(model, system, user, maxTokens, deep, o) {
    const req = { model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] };
    // Opus 5 for deep work: adaptive thinking; refusals are routed server-side to a fallback model.
    const res = deep ? await this.claude.beta.messages.create({ ...req, thinking: { type: "adaptive" }, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
                     : await this.claude.messages.create(req);
    this.noteClaude(model, res, o);
    if (res.stop_reason === "refusal") throw new Error("refused");
    return res.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  async geminiParts(model, system, parts, o = {}) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.gemini}`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }] })
    });
    if (!r.ok) throw new Error("gemini " + r.status);
    const j = await r.json(); this.spend.calls++;
    const u = j.usageMetadata || {};
    this.limits.record(model, { in: u.promptTokenCount || 0, out: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) }, o.prio || "background", o.agent);
    return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  }

  // One-shot text. o = {prio: "user"|"live"|"background", agent, maxTokens}
  async text(job, system, user, o = {}) {
    const tried = new Set();
    for (let i = 0; i < 3; i++) {
      const pk = this.pick(job, o); if (!pk || tried.has(pk[1])) break; tried.add(pk[1]);
      const [p, model] = pk;
      try {
        if (p === "claude") return { text: await this.claudeText(model, system, user, o.maxTokens || (job === "fast" || job === "classify" ? 400 : job === "deep" ? 8000 : 3000), job === "deep" && model === this.cfg.deep, o), model };
        if (p === "gemini") return { text: await this.geminiParts(model, system, [{ text: user }], o), model };
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) this.limits.minute[model] = Array(99).fill(Date.now());   // back off this model for a minute
        this.lastBlock = { model, why: String(e.message || e).slice(0, 120), t: new Date().toISOString() };
        this.order(job).forEach(([, m]) => m === model && tried.add(m));
      }
    }
    return null;   // caller uses its rule-based path
  }

  // Agent loop with tools (manual loop: tool_use → run → tool_result, all results in one user message).
  // Every turn goes through the limiter. Returns {text, model, calls} or null when no model is available.
  async claudeAgent(system, user, ctx, { tools = null, job = "agent", maxTurns = 8, maxTokens = 4000, prio = "background", agent = ctx?.source } = {}) {
    const o = { prio, agent };
    const pk = this.pick(job, o); if (!pk) return null;
    const [p, model] = pk;
    if (p !== "claude") { const r = await this.text(job, system, user + "\n\nCONTEXT:\n" + JSON.stringify(await runTool("today", {}, ctx)), o); return r && { ...r, calls: [] }; }
    const defs = claudeTools(tools), messages = [{ role: "user", content: user }], calls = [];
    for (let turn = 0; turn < maxTurns; turn++) {
      if (turn > 0 && !this.limits.allow(model, prio, agent).ok) break;
      const res = await this.claude.messages.create({ model, max_tokens: maxTokens, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], tools: defs, messages });
      this.noteClaude(model, res, o);
      if (res.stop_reason === "refusal") throw new Error("refused");
      const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
      if (res.stop_reason !== "tool_use") return { text, model, calls };
      messages.push({ role: "assistant", content: res.content });
      const results = [];
      for (const b of res.content.filter(b => b.type === "tool_use")) {
        const out = await runTool(b.name, b.input, ctx);
        calls.push(b.name);
        results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out ?? null).slice(0, 12000), ...(out && out.error ? { is_error: true } : {}) });
      }
      messages.push({ role: "user", content: results });
    }
    return { text: "", model, calls };
  }

  // Sight: one JPEG + a question.
  async vision(system, question, jpegB64, o = { prio: "user" }) {
    const pk = this.pick("vision", o); if (!pk) return null;
    const [p, model] = pk;
    try {
      if (p === "claude") {
        const res = await this.claude.messages.create({ model, max_tokens: 800, system, messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegB64 } }, { type: "text", text: question }] }] });
        this.noteClaude(model, res, o);
        return { text: res.content.filter(b => b.type === "text").map(b => b.text).join(""), model };
      }
      return { text: await this.geminiParts(model, system, [{ inline_data: { mime_type: "image/jpeg", data: jpegB64 } }, { text: question }], o), model };
    } catch { return null; }
  }
  // Hearing: speech → text on devices with no Google speech service (the Fire 7). Gemini takes audio inline.
  async transcribe(audioB64, mime, o = { prio: "user" }) {
    const pk = this.pick("audio", o); if (!pk) return null;
    try {
      const t = await this.geminiParts(pk[1], "Transcribe the speech exactly. It is English, Hindi or a mix; write Hindi in Devanagari. Reply with only the transcript, or nothing if there is no speech.", [{ inline_data: { mime_type: mime.split(";")[0], data: audioB64 } }], o);
      return t.trim();
    } catch { return null; }
  }
  // Settings → "Test": one tiny call per provider.
  async test() {
    const out = {};
    if (this.claude) { try { const r = await this.claudeText(this.cfg.classify, "Reply with the word ok.", "ping", 10, false, { prio: "user", agent: "setup" }); out.claude = { ok: /ok/i.test(r), model: this.cfg.classify }; } catch (e) { out.claude = { ok: false, error: String(e.message || e).slice(0, 140) }; } }
    if (this.gemini) { try { const r = await this.geminiParts(this.cfg.chat, "Reply with the word ok.", [{ text: "ping" }], { prio: "user", agent: "setup" }); out.gemini = { ok: /ok/i.test(r), model: this.cfg.chat }; } catch (e) { out.gemini = { ok: false, error: String(e.message || e).slice(0, 140) }; } }
    return out;
  }
}

// Models are asked for JSON; this reads it even when wrapped in a code fence or prose.
export function readJSON(text) {
  if (!text) return null;
  const t = text.replace(/^```(json)?|```$/gm, "").trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
