// Model router: picks a model per job, falls back when a key is missing, and always has a no-model path.
// Claude via the official SDK; Gemini via its REST API. Model ids come from config.json.
import Anthropic from "@anthropic-ai/sdk";

export class Router {
  constructor(cfg, secrets) {
    this.cfg = cfg.models; this.secrets = secrets;
    this.claude = secrets.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: secrets.ANTHROPIC_API_KEY }) : null;
    this.gemini = secrets.GEMINI_API_KEY || null;
    this.spend = { calls: 0 };
  }
  available() { return { claude: !!this.claude, gemini: !!this.gemini }; }

  async claudeText(model, system, user, maxTokens = 2000, deep = false) {
    const req = { model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] };
    let res;
    if (deep) {
      // Opus 5: adaptive thinking by default; route refusals to a fallback model server-side.
      res = await this.claude.beta.messages.create({ ...req, thinking: { type: "adaptive" }, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
    } else {
      res = await this.claude.messages.create(req);
    }
    this.spend.calls++;
    if (res.stop_reason === "refusal") throw new Error("refused");
    return res.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  async geminiText(model, system, user) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.gemini}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }] })
    });
    if (!r.ok) throw new Error("gemini " + r.status);
    const j = await r.json(); this.spend.calls++;
    return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  }
  // job: "chat" | "classify" | "agent" | "deep"
  async text(job, system, user) {
    const order = {
      chat: [["gemini", this.cfg.chat], ["claude", this.cfg.agent]],
      classify: [["claude", this.cfg.classify], ["gemini", this.cfg.chat]],
      agent: [["claude", this.cfg.agent], ["gemini", this.cfg.chat]],
      deep: [["claude", this.cfg.deep], ["claude", this.cfg.agent]]
    }[job];
    for (const [p, model] of order) {
      try {
        if (p === "claude" && this.claude) return { text: await this.claudeText(model, system, user, job === "classify" ? 300 : 4000, job === "deep"), model };
        if (p === "gemini" && this.gemini) return { text: await this.geminiText(model, system, user), model };
      } catch (e) { /* try the next one */ }
    }
    return null;   // caller uses its rule-based path
  }
}
