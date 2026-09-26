// Personal email over IMAP (Gmail: turn on 2-step verification, create an app password).
// Read-only: headers + a short preview of unseen mail from the last day. imapflow is optional.
import { detectOrder } from "../orders.mjs";

export async function emailAdapter(soul, cfg, secrets, brainClassify) {
  const c = cfg.adapters.email; if (!c.enabled || !c.user || !secrets.EMAIL_APP_PASSWORD) return null;
  let ImapFlow; try { ({ ImapFlow } = await import("imapflow")); } catch { soul.log({ kind: "adapter", source: "email", state: "imapflow not installed" }); return null; }
  const seen = new Set();
  async function poll() {
    const client = new ImapFlow({ host: c.host, port: 993, secure: true, auth: { user: c.user, pass: secrets.EMAIL_APP_PASSWORD }, logger: false });
    try {
      await client.connect(); const lock = await client.getMailboxLock("INBOX");
      try {
        for await (const m of client.fetch({ since: new Date(Date.now() - 864e5), seen: false }, { envelope: true, uid: true })) {
          if (seen.has(m.uid)) continue; seen.add(m.uid);
          const from = m.envelope.from?.[0]?.name || m.envelope.from?.[0]?.address || "?", subject = m.envelope.subject || "";
          const order = detectOrder(subject, from);
          if (order) { soul.log({ kind: "order", order, source: "email: " + from }); continue; }
          const needsYou = await brainClassify(`Email from ${from}: ${subject}`);
          soul.log({ kind: "message", app: "Email", title: from, summary: subject, needsYou });
        }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) { soul.log({ kind: "adapter", source: "email", state: "error", error: String(e.message || e) }); }
  }
  poll(); return setInterval(poll, c.everyMin * 60e3);
}
