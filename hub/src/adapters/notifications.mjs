// Reads every notification on the Fire 7 via Termux:API (grant Termux:API notification access once).
// WhatsApp (linked as a companion device), Gmail, Zepto, Swiggy, Ather, bank apps — whatever is installed.
import { spawnSync } from "node:child_process";
import { detectOrder } from "../orders.mjs";

const APPS = {
  "com.whatsapp": ["WhatsApp", "chat"], "org.telegram.messenger": ["Telegram", "chat"], "com.google.android.gm": ["Gmail", "mail"],
  "com.zeptoconsumerapp": ["Zepto", "shop"], "in.swiggy.android": ["Swiggy", "shop"], "com.grofers.customerapp": ["Blinkit", "shop"],
  "com.application.zomato": ["Zomato", "shop"], "com.athermobileapp": ["Ather", "vehicle"], "com.google.android.calendar": ["Calendar", "cal"]
};

export function notificationsAdapter(soul, cfg, brainClassify) {
  if (!cfg.adapters.notifications.enabled) return null;
  const probe = spawnSync("sh", ["-c", "command -v termux-notification-list"], { encoding: "utf8" });
  if (!probe.stdout.trim()) return null;          // not on Termux: adapter stays off
  const seen = new Set();
  async function poll() {
    let list = [];
    try { list = JSON.parse(spawnSync("termux-notification-list", { encoding: "utf8", timeout: 15000 }).stdout || "[]"); } catch { return; }
    for (const n of list) {
      const key = n.key + "|" + n.when; if (seen.has(key)) continue; seen.add(key);
      const [app, type] = APPS[n.packageName] || [n.packageName, "other"];
      const text = `${n.title || ""} ${n.content || ""}`.trim();
      if (!text) continue;
      const order = detectOrder(text, app);
      if (order) { soul.log({ kind: "order", order, source: app + " notification" }); continue; }
      if (type === "chat" || type === "mail") {
        const needsYou = await brainClassify(`${app} from ${n.title}: ${n.content}`);
        soul.log({ kind: "message", app, title: n.title, summary: (n.content || "").slice(0, 160), needsYou });
        if (needsYou) soul.feel("new_thing", 0.5);
      } else if (type === "vehicle") {
        soul.log({ kind: "vehicle", app, text });
      }
    }
    if (seen.size > 5000) seen.clear();
  }
  poll();
  return setInterval(poll, cfg.adapters.notifications.everySec * 1000);
}
