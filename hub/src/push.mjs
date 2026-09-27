// Web Push to the iPhone (and any browser that installed the Jeevo app). iOS 16.4+ delivers push to a web app
// added to the Home Screen and served over HTTPS (Tailscale Serve gives the hub a real https://…ts.net address).
// VAPID keys are made once and kept in hub/data/push.json with the subscriptions.
import webpush from "web-push";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";

export class Push {
  constructor(dataDir, cfg = {}) {
    this.file = join(dataDir, "push.json");
    const s = existsSync(this.file) ? JSON.parse(readFileSync(this.file, "utf8")) : {};
    this.vapid = s.vapid || webpush.generateVAPIDKeys(); this.subs = s.subs || [];
    webpush.setVapidDetails(cfg.push?.contact || "mailto:jeevo@example.com", this.vapid.publicKey, this.vapid.privateKey);
    if (!s.vapid) this.save();
    this.sent = 0; this.lastError = null;
  }
  save() { writeFileSync(this.file, JSON.stringify({ vapid: this.vapid, subs: this.subs })); try { chmodSync(this.file, 0o600); } catch {} }
  publicKey() { return this.vapid.publicKey; }
  subscribe(sub, device = "iphone") {
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("bad subscription");
    this.subs = this.subs.filter(x => x.sub.endpoint !== sub.endpoint).concat({ sub, device, t: new Date().toISOString() }); this.save();
    return { ok: true, devices: this.subs.length };
  }
  unsubscribe(endpoint) { this.subs = this.subs.filter(x => x.sub.endpoint !== endpoint); this.save(); return { ok: true }; }
  async send(msg) {
    const payload = JSON.stringify({ title: msg.title || "Jeevo", body: msg.body, tag: msg.tag || msg.from || "jeevo", url: msg.url || "/app#today" });
    const dead = [];
    await Promise.all(this.subs.map(async x => {
      try { await webpush.sendNotification(x.sub, payload, { TTL: msg.ttl || 3600, urgency: msg.important ? "high" : "normal" }); this.sent++; }
      catch (e) { this.lastError = String(e.statusCode || e.message); if (e.statusCode === 404 || e.statusCode === 410) dead.push(x.sub.endpoint); }
    }));
    if (dead.length) { this.subs = this.subs.filter(x => !dead.includes(x.sub.endpoint)); this.save(); }
    return { sent: this.subs.length - dead.length };
  }
  status() { return { devices: this.subs.map(s => ({ device: s.device, t: s.t })), sent: this.sent, lastError: this.lastError }; }
}
