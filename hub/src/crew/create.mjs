// CREATE: agents for the maker in you: build-in-public content, the Jeevo build log, things you learn.
import { DAY, insight, texts, sameDay, week } from "./util.mjs";
import { readJSON } from "../router.mjs";

const BUILD = /\b(jeevo|esp32|xiao|oled|solder|print(ed|ing)?|firmware|flash(ed)?|3d|stl|render|reel|motion|blender|after effects|figma|shipped|built|made)\b/i;

export default [
  { name: "content", dept: "create", title: "Content scout", role: "Each night, turns the day's build moments into one reel idea (hook, shot, caption).", at: ["21:15"], tier: "fast",
    async run(ctx) {
      const moments = ctx.soul.since(DAY).filter(e => (e.text && BUILD.test(e.text)) || e.kind === "win").map(e => e.text || e.line).filter(Boolean);
      if (!moments.length) return "no build moments today";
      let idea = { hook: moments[0].slice(0, 80), shot: "Screen + hands, 3 cuts", caption: moments[0].slice(0, 120) };
      const r = await ctx.router.text("fast", `Harsh builds a personal AI creature (Jeevo) in public. From today's build moments, give ONE short-form reel idea. Reply ONLY JSON {"hook":"first 2 seconds, max 8 words","shot":"what to film","caption":"max 20 words"}.`, moments.slice(-20).join("\n"), { agent: "content" });
      const j = readJSON(r?.text); if (j?.hook) { idea = j; ctx.model = r.model; }
      const list = ctx.soul.status.contentIdeas ||= []; list.push({ ...idea, day: new Date().toISOString().slice(0, 10) }); ctx.soul.status.contentIdeas = list.slice(-40);
      return "Reel: " + idea.hook;
    } },
  { name: "build-log", dept: "create", title: "Build log", role: "Tracks the Jeevo build itself: tasks, prints, firmware flashes, what's next.", at: ["21:20"],
    run(ctx) {
      const open = ctx.memory.open().filter(t => BUILD.test(t.title)), done = ctx.memory.tasks.filter(t => t.done && BUILD.test(t.title));
      const today = ctx.soul.since(DAY).filter(e => e.text && BUILD.test(e.text)).length;
      return insight(ctx, "build", { open: open.length, done: done.length, today, next: open[0]?.title || null, line: `${done.length} build tasks done, ${open.length} open${open[0] ? "; next: " + open[0].title : ""}` }).line;
    } },
  { name: "learnings", dept: "create", title: "Learnings", role: "Keeps what you learn (\"TIL…\", \"learned that…\") as a searchable list.", on: ["input"],
    run(ctx, ev) {
      if (!ev.text || ["notification", "email", "sms"].includes(ev.via)) return null;
      const m = ev.text.match(/^(?:til[:\s]+|today i learned\s+|i learned (?:that )?|learned[:\s]+)(.+)/i); if (!m) return null;
      ctx.memory.remember({ cat: "other", key: "learned: " + m[1].slice(0, 40), value: m[1], source: "learnings", confidence: 0.9 });
      return "Saved: " + m[1].slice(0, 60);
    } }
];
