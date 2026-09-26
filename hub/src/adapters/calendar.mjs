// Calendar from a private ICS link (Google Calendar → Settings → "Secret address in iCal format").
export function parseICS(ics, day = new Date()) {
  const events = [];
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const get = k => { const m = block.match(new RegExp("^" + k + "[^:\\n]*:(.*)$", "m")); return m ? m[1].trim() : null; };
    const start = get("DTSTART"), summary = get("SUMMARY");
    if (!start) continue;
    const d = start.length === 8 ? new Date(+start.slice(0, 4), +start.slice(4, 6) - 1, +start.slice(6, 8))
      : new Date(Date.UTC(+start.slice(0, 4), +start.slice(4, 6) - 1, +start.slice(6, 8), +start.slice(9, 11), +start.slice(11, 13)) - (start.endsWith("Z") ? 0 : 5.5 * 3600e3));
    events.push({ start: d, summary: (summary || "Busy").replace(/\\,/g, ","), location: get("LOCATION") });
  }
  const key = day.toDateString();
  return events.filter(e => e.start.toDateString() === key).sort((a, b) => a.start - b.start)
    .map(e => ({ time: e.start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }), summary: e.summary, location: e.location }));
}

export function calendarAdapter(soul, cfg) {
  const c = cfg.adapters.calendar; if (!c.enabled || !c.icsUrl) return null;
  async function poll() {
    try { const r = await fetch(c.icsUrl); if (!r.ok) return; const today = parseICS(await r.text()); soul.status.calendar = { today, t: new Date().toISOString() }; } catch {}
  }
  poll(); return setInterval(poll, c.everyMin * 60e3);
}
