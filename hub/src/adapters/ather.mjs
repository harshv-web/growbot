// Ather: your scooter's live data, read with your own Ather login. Unofficial and read-only.
// Ather publishes no developer API. This uses the same private endpoints as the Ather app, as community
// projects do (MIT: github.com/paritosh-08/ather-bot for telemetry, anbuchelva's ev-log-bot auth script for the OTP login):
//   POST {base}/auth/v2/generate-login-otp       {email:"", contact_no, country_code:"IN"}
//   POST {base}/auth/v2/verify-login-otp          {email:"", contact_no, userOtp, is_mobile_login:"true", country_code:"IN"} → {token}
//   GET  {base}/api/v1/auth/user/scooters/firebase-dbs            → {scooterDatabases:[{scooter}]}
//   GET  {base}/api/v1/devices/shadows/telemetry?uuid=<scooter>   → {data:{state:{reported:{bike:{battery_soc}, tpms:{…}, …}}}}
// It can stop working whenever Ather changes its app. The token lives only in hub/data/ather.json (never in git).
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";

const HEADERS = { "Source": "ATHER_APP/11.3.0", "User-Agent": "Ktor client", "Accept": "application/json", "Content-Type": "application/json" };
export const jwtExp = tok => { try { return JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()).exp || null; } catch { return null; } };

// Flatten the scooter's "shadow" into dotted keys, so every signal it reports is visible and searchable.
export function flatten(o, pre = "", out = {}) {
  if (o && typeof o === "object" && !Array.isArray(o)) { for (const [k, v] of Object.entries(o)) flatten(v, pre ? pre + "." + k : k, out); }
  else if (o !== undefined) out[pre] = o;
  return out;
}
const num = v => (v === null || v === "" || isNaN(+v)) ? null : +v;
const pick = (flat, res) => { for (const re of res) { const k = Object.keys(flat).find(k => re.test(k) && num(flat[k]) != null); if (k) return num(flat[k]); } return null; };
export function normalize(reported) {
  const flat = flatten(reported);
  const sc = {
    soc: num(reported?.bike?.battery_soc) ?? pick(flat, [/battery_soc$/i, /\bsoc$/i]),
    tyreFront: num(reported?.tpms?.front_tyre_pressure) ?? pick(flat, [/front.*pressure/i]),
    tyreRear: num(reported?.tpms?.rear_tyre_pressure) ?? pick(flat, [/rear.*pressure/i]),
    rangeKm: pick(flat, [/(^|\.)(estimated_)?range(_km)?$/i, /range/i]),
    odoKm: pick(flat, [/odo/i]),
    lat: pick(flat, [/(^|\.)lat(itude)?$/i]), lon: pick(flat, [/(^|\.)(lon|lng|longitude)$/i]),
    speed: pick(flat, [/(^|\.)speed$/i])
  };
  const ch = Object.keys(flat).find(k => /charg/i.test(k) && (typeof flat[k] === "boolean" || /^(true|false|charging|not_charging|0|1)$/i.test(String(flat[k]))));
  if (ch) sc.charging = /^(true|charging|1)$/i.test(String(flat[ch]));
  sc.tyreWarn = (sc.tyreFront != null && (sc.tyreFront < 25 || sc.tyreFront > 35)) || (sc.tyreRear != null && (sc.tyreRear < 27 || sc.tyreRear > 37));
  for (const k in sc) if (sc[k] === null) delete sc[k];
  return { sc, signals: Object.fromEntries(Object.entries(flat).slice(0, 120)) };
}

export class Ather {
  constructor(soul, cfg, secrets, dataDir) {
    this.soul = soul; this.c = Object.assign({ enabled: true, everyMin: 5, baseUrl: "https://cerberus.ather.io" }, cfg.adapters?.ather || {});
    this.file = join(dataDir, "ather.json");
    const saved = existsSync(this.file) ? JSON.parse(readFileSync(this.file, "utf8")) : {};
    this.token = saved.token || secrets.ATHER_TOKEN || null; this.scooter = saved.scooter || this.c.scooterId || null;
    this.fails = 0; this.timer = null; this.riding = null; this.lastOdo = null;
    if (this.token) this.soul.status.atherTokenExp = jwtExp(this.token);
  }
  persist() { writeFileSync(this.file, JSON.stringify({ token: this.token, scooter: this.scooter })); try { chmodSync(this.file, 0o600); } catch {} }
  async req(method, path, body, auth = true) {
    const r = await fetch(this.c.baseUrl + path, { method, headers: { ...HEADERS, ...(auth ? { Authorization: "Bearer " + this.token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    if (!r.ok) { const e = new Error("Ather HTTP " + r.status); e.status = r.status; throw e; }
    return r.json();
  }
  // ---- login, from the app's Settings screen ----
  async sendOtp(phone) { await this.req("POST", "/auth/v2/generate-login-otp", { email: "", contact_no: String(phone).replace(/\D/g, "").slice(-10), country_code: "IN" }, false); return { sent: true }; }
  async verifyOtp(phone, otp) {
    const j = await this.req("POST", "/auth/v2/verify-login-otp", { email: "", contact_no: String(phone).replace(/\D/g, "").slice(-10), userOtp: String(otp).trim(), is_mobile_login: "true", country_code: "IN" }, false);
    if (!j.token) throw new Error("No token in Ather's reply");
    this.token = j.token; this.soul.status.atherTokenExp = jwtExp(j.token);
    const list = await this.scooters(); this.scooter = list[0] || null; this.persist();
    this.soul.log({ kind: "adapter", source: "ather", state: "logged-in", scooters: list.length });
    this.start(true);
    return { ok: true, scooters: list, expires: this.soul.status.atherTokenExp };
  }
  logout() { this.token = null; this.scooter = null; this.persist(); delete this.soul.status.scooter; delete this.soul.status.atherTokenExp; this.stop(); return { ok: true }; }
  async scooters() { const j = await this.req("GET", "/api/v1/auth/user/scooters/firebase-dbs"); return (j.scooterDatabases || []).map(x => x && x.scooter).filter(Boolean).map(String); }
  async telemetry() {
    if (!this.scooter) { this.scooter = (await this.scooters())[0]; if (!this.scooter) throw new Error("No scooter on this Ather account"); this.persist(); }
    const j = await this.req("GET", "/api/v1/devices/shadows/telemetry?uuid=" + encodeURIComponent(this.scooter));
    const reported = j?.data?.state?.reported; if (!reported) throw new Error("Unexpected telemetry shape");
    return normalize(reported);
  }
  status() { return { connected: !!this.token, scooter: this.scooter ? this.scooter.slice(0, 4) + "…" : null, expires: this.soul.status.atherTokenExp || null, fails: this.fails, last: this.soul.status.scooter?.t || null, error: this.lastError || null }; }

  // ---- polling ----
  async poll() {
    if (!this.token) return;
    try {
      const { sc, signals } = await this.telemetry(); this.fails = 0; this.lastError = null;
      sc.t = new Date().toISOString();
      const prev = this.soul.status.scooter || {};
      this.soul.status.scooter = sc; this.soul.status.scooterSignals = signals;
      this.soul.log({ kind: "telemetry", source: "ather", data: sc });
      if (sc.soc != null && sc.soc < 20 && !(prev.soc < 20)) { this.soul.feel("low_battery"); this.soul.sensation("keychain", "hungry"); }
      if (sc.tyreWarn && !prev.tyreWarn) this.soul.sensation("keychain", "worried");
      if (sc.charging && !prev.charging) { this.soul.feel("charging"); this.soul.log({ kind: "charge", stage: "start", soc: sc.soc }); }
      if (!sc.charging && prev.charging) this.soul.log({ kind: "charge", stage: "end", soc: sc.soc, from: prev.soc });
      // rides from odometer movement (ride start/end also arrive from the iPhone's Bluetooth Shortcut)
      if (sc.odoKm != null) {
        if (this.lastOdo != null && sc.odoKm - this.lastOdo > 0.3 && !this.riding) { this.riding = { odo: this.lastOdo, soc: prev.soc, t: prev.t }; this.soul.log({ kind: "ride", stage: "start", odo: this.lastOdo, soc: prev.soc, via: "ather" }); this.soul.sensation("keychain", "focused"); }
        else if (this.riding && sc.odoKm - this.lastOdo < 0.05) { const km = +(sc.odoKm - this.riding.odo).toFixed(1); this.soul.log({ kind: "ride", stage: "end", km, socUsed: this.riding.soc != null && sc.soc != null ? +(this.riding.soc - sc.soc).toFixed(1) : null, lat: sc.lat, lon: sc.lon, via: "ather" }); if (sc.lat) this.soul.status.parked = { t: sc.t, lat: sc.lat, lon: sc.lon }; this.riding = null; }
        this.lastOdo = sc.odoKm;
      }
    } catch (e) {
      this.fails++; this.lastError = e.message;
      if (e.status === 401 || e.status === 403) this.soul.status.atherAuthError = new Date().toISOString();
      if (this.fails === 3) this.soul.log({ kind: "adapter", source: "ather", state: "unreachable", error: String(e.message || e) });
    }
  }
  start(now = false) {
    this.stop(); if (!this.token || this.c.enabled === false) return;
    const loop = async () => { await this.poll(); this.timer = setTimeout(loop, Math.max(1, this.c.everyMin) * 60e3 * Math.min(6, 1 + Math.floor(this.fails / 3))); };
    this.timer = setTimeout(loop, now ? 0 : 2000);
  }
  stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
}
