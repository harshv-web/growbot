// One set of tools, used two ways: by the crew's Claude calls (tool use) and by your own Claude app
// through the MCP connector (hub/src/mcp.mjs). Each tool: {name, description, input_schema, run(args, ctx)}.
import { orders, habits } from "./orders.mjs";
import { parseWhen, taskTitle, CATS } from "./memory.mjs";

const DAY = 24 * 3600e3;
const isToday = t => new Date(t).toDateString() === new Date().toDateString();
const obj = (props = {}, required = []) => ({ type: "object", properties: props, required, additionalProperties: false });
const str = description => ({ type: "string", description });

export function today(ctx) {
  const { soul, memory } = ctx, st = soul.status;
  const os = orders(soul.since(2 * DAY)).filter(o => isToday(o.t));
  return {
    now: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
    mood: soul.expressFor("tablet").text,
    plan: st.plan || null,
    tasks: memory.open().slice(0, 12).map(t => ({ id: t.id, title: t.title, due: t.due })),
    calendar: st.calendar?.today || [],
    chores: (st.chores || []).filter(c => c.due).map(c => c.name),
    ordersToday: os.map(o => ({ app: o.app, amount: o.amount, stage: o.stage, items: o.items })),
    scooter: st.scooter ? { soc: st.scooter.soc, rangeKm: st.scooter.rangeKm, charging: st.scooter.charging, tyreWarn: st.scooter.tyreWarn, t: st.scooter.t } : null,
    needsYou: (st.inbox || []).filter(m => m.needsYou && !m.done).length,
    health: st.health || null,
    place: st.place || null
  };
}

export const TOOLS = [
  { name: "today", description: "Harsh's day right now: plan, open tasks, calendar, chores due, today's orders, scooter, messages needing him, health, mood.",
    input_schema: obj(), run: (a, ctx) => today(ctx) },
  { name: "search_memory", description: "Search everything Jeevo knows: learned facts about Harsh, tasks, notes, messages, orders, rides and past answers. Use before saying you don't know.",
    input_schema: obj({ query: str("words to search for") }, ["query"]), run: (a, ctx) => ctx.memory.search(a.query, ctx.soul.recent) },
  { name: "profile", description: "The Model of Me: every learned fact about Harsh, grouped by category, plus his profile and identity lines from nightly dreams.",
    input_schema: obj(), run: (a, ctx) => ({ facts: ctx.memory.profile(), identity: ctx.memory.identity, about: ctx.profile?.about, rhythm: ctx.profile?.rhythm }) },
  { name: "remember", description: "Save a durable fact about Harsh (a preference, a person, a place, a routine, a goal). Keep it short and specific.",
    input_schema: obj({ fact: str("the fact, e.g. 'likes filter coffee, no sugar'"), category: { type: "string", enum: CATS }, key: str("short label, e.g. 'coffee'") }, ["fact", "category"]),
    run: (a, ctx) => ctx.memory.remember({ cat: a.category, key: a.key || a.fact, value: a.fact, source: ctx.source || "claude" }) },
  { name: "forget", description: "Delete a learned fact by id (from search_memory or profile).",
    input_schema: obj({ id: str("fact id") }, ["id"]), run: (a, ctx) => ({ forgotten: ctx.memory.forget(a.id) }) },
  { name: "add_task", description: "Add a task or reminder. 'when' is natural language in IST, e.g. 'tomorrow 9am', 'in 30 min', 'friday'. Jeevo reminds him on the tablet, iPhone and keychain.",
    input_schema: obj({ title: str("what to do"), when: str("optional time, natural language") }, ["title"]),
    run: (a, ctx) => { const when = a.when ? parseWhen(a.when) : null; const t = ctx.memory.addTask({ title: taskTitle(a.title), due: when, from: ctx.source || "claude" }); ctx.soul.log({ kind: "task", id: t.id, title: t.title, due: t.due }); return t; } },
  { name: "complete_task", description: "Mark a task done, by id or exact title.",
    input_schema: obj({ task: str("task id or title") }, ["task"]), run: (a, ctx) => ctx.memory.doneTask(a.task) || { error: "no such task" } },
  { name: "list_tasks", description: "Open tasks and reminders, soonest first.",
    input_schema: obj(), run: (a, ctx) => ctx.memory.open() },
  { name: "scooter", description: "Ather scooter: battery %, range, charging, tyre pressures, where it's parked, recent rides.",
    input_schema: obj(), run: (a, ctx) => ({ now: ctx.soul.status.scooter || null, parked: ctx.soul.status.parked || null, rides: ctx.soul.since(7 * DAY).filter(e => e.kind === "ride").slice(-10) }) },
  { name: "orders", description: "Orders from Zepto, Swiggy, Instamart, Blinkit, Amazon etc. over the last N days, plus habits (how often, when, how much).",
    input_schema: obj({ days: { type: "integer", minimum: 1, maximum: 90 } }), run: (a, ctx) => { const ev = ctx.soul.since((a.days || 7) * DAY); return { orders: orders(ev), habits: habits(ctx.soul.since(30 * DAY)) }; } },
  { name: "inbox", description: "Messages and emails that need Harsh's reply or action.",
    input_schema: obj(), run: (a, ctx) => (ctx.soul.status.inbox || []).filter(m => !m.done).slice(-25) },
  { name: "recent", description: "Raw recent events (inputs, notes, rides, places, orders, messages, nudges). Filter by kind if useful.",
    input_schema: obj({ hours: { type: "integer", minimum: 1, maximum: 168 }, kind: str("optional event kind, e.g. note, ride, order, message, place, health") }),
    run: (a, ctx) => ctx.soul.since((a.hours || 24) * 3600e3).filter(e => !a.kind || e.kind === a.kind).slice(-60).map(({ data, ...e }) => e) },
  { name: "note", description: "Log a note in Harsh's life log (something that happened, a thought, a decision).",
    input_schema: obj({ text: str("the note") }, ["text"]), run: (a, ctx) => ctx.soul.log({ kind: "note", text: a.text, from: ctx.source || "claude" }) },
  { name: "nudge", description: "Show a one-line message on Harsh's tablet, keychain and iPhone right now. Use sparingly.",
    input_schema: obj({ text: str("one short sentence") }, ["text"]), run: (a, ctx) => { ctx.push?.(a.text, ctx.source || "claude", { important: true }); return { sent: true }; } }
];

export const toolByName = Object.fromEntries(TOOLS.map(t => [t.name, t]));
export async function runTool(name, args, ctx) {
  const t = toolByName[name]; if (!t) return { error: "unknown tool " + name };
  try { return await t.run(args || {}, ctx); } catch (e) { return { error: String(e.message || e) }; }
}
// Tool definitions in the Messages API shape (name, description, input_schema).
export const claudeTools = (names) => TOOLS.filter(t => !names || names.includes(t.name)).map(({ name, description, input_schema }) => ({ name, description, input_schema }));
