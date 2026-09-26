// Ather adapter — unofficial, read-only, bring-your-own token.
// Ather has no public API. Community projects (e.g. github.com/paritosh-08/ather-bot) read the app's
// private telemetry with a user-supplied token every ~5 min and warn it can change without notice.
// Fill baseUrl, statusPath and field paths in config.json once you've confirmed them for your scooter.
const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

export function atherAdapter(soul, cfg, secrets) {
  const c = cfg.adapters.ather;
  if (!c.enabled || !secrets.ATHER_TOKEN || !c.baseUrl || !c.statusPath) return null;
  let fails = 0, lastOdo = null, riding = false;
  async function poll() {
    try {
      const r = await fetch(c.baseUrl + c.statusPath, { headers: { authorization: "Bearer " + secrets.ATHER_TOKEN, accept: "application/json" } });
      if (!r.ok) throw new Error("ather " + r.status);
      const j = await r.json(); fails = 0;
      const f = c.fields, sc = {};
      for (const k in f) { const v = get(j, f[k]); if (v != null) sc[k] = v; }
      sc.t = new Date().toISOString();
      sc.tyreWarn = (sc.tyreFront != null && (sc.tyreFront < 25 || sc.tyreFront > 35)) || (sc.tyreRear != null && (sc.tyreRear < 27 || sc.tyreRear > 37));
      const prev = soul.status.scooter || {};
      soul.status.scooter = sc;
      soul.log({ kind: "telemetry", source: "ather", data: sc });
      // feelings the scooter gives the soul
      if (sc.soc != null && sc.soc < 20 && !(prev.soc < 20)) { soul.feel("low_battery"); soul.sensation("keychain", "hungry"); }
      if (sc.tyreWarn && !prev.tyreWarn) soul.sensation("keychain", "worried");
      if (sc.charging && !prev.charging) soul.feel("charging");
      // ride detection from odometer movement
      if (sc.odoKm != null) {
        if (lastOdo != null && sc.odoKm - lastOdo > 0.3 && !riding) { riding = true; soul.log({ kind: "ride", stage: "start", odo: lastOdo }); soul.sensation("keychain", "focused"); }
        else if (riding && sc.odoKm - lastOdo < 0.05) { riding = false; soul.log({ kind: "ride", stage: "end", odo: sc.odoKm, lat: sc.lat, lon: sc.lon }); }
        lastOdo = sc.odoKm;
      }
    } catch (e) {
      fails++;
      if (fails === 3) soul.log({ kind: "adapter", source: "ather", state: "unreachable", error: String(e.message || e) });
    }
  }
  poll();
  return setInterval(poll, Math.max(5, c.everyMin) * 60e3 * Math.min(4, 1 + Math.floor(fails / 3)));
}
