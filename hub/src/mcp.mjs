// Jeevo as a remote MCP server, so your own Claude (claude.ai on the web, the Claude iPhone app, Claude Desktop)
// can use Jeevo's memory, tasks, day, scooter, orders and inbox as tools, and add to them.
// Transport: Streamable HTTP, stateless, JSON responses (POST only). Add it in Claude → Settings → Connectors →
// "Add custom connector" with the URL https://<your-hub>/mcp/<MCP_SECRET>. The secret in the path is the lock:
// keep the URL private (it's shown in the app's Settings, never logged).
import { TOOLS, runTool } from "./tools.mjs";

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS = "Jeevo is Harsh's personal AI that lives on his tablet in Bengaluru and keeps his life log. Use `today` for his day, `search_memory` and `profile` before saying you don't know something about him, `add_task` for reminders (they reach his tablet, iPhone and keychain), and `remember` for lasting facts he tells you.";

export function mcpTools(extra = []) {
  return [...TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.input_schema })), ...extra.map(t => ({ name: t.name, description: t.description, inputSchema: t.input_schema }))];
}

// Handles one JSON-RPC message; returns a response object, or null for notifications.
export async function mcpHandle(msg, ctx, extra = []) {
  const { id, method, params = {} } = msg || {};
  const ok = result => ({ jsonrpc: "2.0", id, result }), err = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return err(-32600, "Invalid request");
  if (id === undefined) return null;                                         // notifications (e.g. notifications/initialized)
  switch (method) {
    case "initialize":
      return ok({ protocolVersion: VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[1], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "jeevo", title: "Jeevo", version: "1.0.0" }, instructions: INSTRUCTIONS });
    case "ping": return ok({});
    case "tools/list": return ok({ tools: mcpTools(extra) });
    case "tools/call": {
      const name = params.name, args = params.arguments || {};
      const x = extra.find(t => t.name === name);
      const out = x ? await x.run(args, ctx) : TOOLS.some(t => t.name === name) ? await runTool(name, args, { ...ctx, source: "claude-app" }) : undefined;
      if (out === undefined) return err(-32602, "Unknown tool: " + name);
      const isError = !!(out && out.error);
      ctx.soul.log({ kind: "mcp", tool: name });
      return ok({ content: [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out, null, 1).slice(0, 60000) }], isError });
    }
    case "resources/list": return ok({ resources: [] });
    case "prompts/list": return ok({ prompts: [] });
    default: return err(-32601, "Method not found: " + method);
  }
}
