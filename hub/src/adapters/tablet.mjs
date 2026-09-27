// Body truth for the Fire 7 itself: battery, charging and temperature via termux-battery-status.
// An always-plugged 2017 battery can swell: it gets worried when warm and tells you once.
import { spawnSync } from "node:child_process";

export function tabletAdapter(soul, push) {
  const probe = spawnSync("sh", ["-c", "command -v termux-battery-status"], { encoding: "utf8" });
  if (!probe.stdout.trim()) return null;
  let warned = 0;
  function poll() {
    let b; try { b = JSON.parse(spawnSync("termux-battery-status", { encoding: "utf8", timeout: 10000 }).stdout); } catch { return; }
    const prev = soul.status.tablet;
    soul.status.tablet = { pct: b.percentage, plugged: b.plugged !== "UNPLUGGED", temp: b.temperature, health: b.health, t: new Date().toISOString() };
    if (prev && !prev.plugged && soul.status.tablet.plugged) soul.feel("charging");
    if (b.percentage < 20 && b.plugged === "UNPLUGGED") { soul.feel("low_battery", 0.5); soul.sensation("tablet", "hungry"); }
    if (b.temperature >= 42 && Date.now() - warned > 6 * 3600e3) { warned = Date.now(); soul.sensation("tablet", "hot"); push(`I'm warm (${Math.round(b.temperature)}°C). Unplug me for a bit?`, "tablet"); }
    if (b.health && b.health !== "GOOD" && Date.now() - warned > 24 * 3600e3) { warned = Date.now(); push(`My battery says "${b.health.toLowerCase()}". Check it for swelling.`, "tablet"); }
  }
  poll(); return setInterval(poll, 5 * 60e3);
}
