// Jeevo app. One file, no build step, runs on Chrome 119 (Fire 7) and iOS Safari (Home Screen app).
(() => {
  const $ = s => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  let token = qs.get("token") || localStorage.getItem("jeevo-token") || "";
  if (qs.get("token")) { localStorage.setItem("jeevo-token", token); history.replaceState(null, "", location.pathname + location.hash); }
  const isPhone = () => innerWidth <= 760;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').split("\n").map(l => /^\s*[-•]\s/.test(l) ? "• " + l.replace(/^\s*[-•]\s/, "") : l).join("<br>");
  const TZ = "Asia/Kolkata";
  const when = t => t ? new Date(t).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: TZ }) : "";
  const ago = t => { if (!t) return "never"; const m = (Date.now() - Date.parse(t)) / 60e3; return m < 1 ? "just now" : m < 60 ? Math.round(m) + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
  const ICON = {
    jeevo: '<rect x="4" y="6" width="5" height="9" rx="2.5"/><rect x="15" y="6" width="5" height="9" rx="2.5"/><path d="M9 19c2 1.2 4 1.2 6 0"/>',
    today: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    ride: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-3-8h4M6 17l3-6h3"/>',
    life: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    inbox: '<path d="M4 5h16v14H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
    memory: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    crew: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c1-3 3-4 5-4s4 1 5 4M11 19c1-3 3-4 5-4s4 1 5 4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    more: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>'
  };
  const SCREENS = [["jeevo", "Jeevo"], ["today", "Today"], ["ride", "Ride"], ["inbox", "Inbox"], ["life", "Life", 1], ["memory", "Memory", 1], ["crew", "Crew", 1], ["settings", "Settings", 1]];
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  // ---------- API ----------
  async function api(path, opt = {}) {
    const r = await fetch("/api/" + path, { method: opt.method || (opt.body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (r.status === 401) { toast("Needs your hub token", "Settings"); go("settings"); throw new Error("token"); }
    const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j;
  }

  // ---------- navigation ----------
  let screen = null;
  function nav() {
    const rail = $("#rail"); rail.innerHTML = "";
    for (const [k, label, extra] of SCREENS) { const b = document.createElement("button"); b.dataset.s = k; b.className = extra ? "extra" : ""; b.innerHTML = svg(k) + label; b.onclick = () => go(k); rail.append(b); }
    const more = document.createElement("button"); more.className = "more"; more.innerHTML = svg("more") + "More"; more.onclick = moreSheet; rail.append(more);
  }
  function moreSheet() {
    let s = $(".moresheet"); if (s) return s.remove();
    s = document.createElement("div"); s.className = "moresheet";
    for (const [k, label, extra] of SCREENS) if (extra) { const b = document.createElement("button"); b.innerHTML = svg(k) + label; b.onclick = () => { s.remove(); go(k); }; s.append(b); }
    document.body.append(s);
  }
  function go(k) {
    screen = k; location.hash = k;
    document.querySelectorAll(".screen").forEach(x => x.classList.toggle("on", x.id === "s-" + k));
    document.querySelectorAll(".rail button[data-s]").forEach(b => b.dataset.s === k ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $("#top").style.display = k === "jeevo" && !isPhone() ? "none" : "";
    if (k === "jeevo") dispatchEvent(new Event("resize"));   // the face canvas sizes itself when shown
    // On the tablet, the Jeevo screen is the full face (camera eyes, Look, Talk): the same page as /face/.
    const tabletFace = k === "jeevo" && !isPhone();
    if (tabletFace && !$("#faceFrame")) { const f = document.createElement("iframe"); f.id = "faceFrame"; f.src = "/face/" + (token ? "?token=" + encodeURIComponent(token) : ""); f.allow = "camera; microphone; autoplay"; f.title = "Jeevo's face"; $("#s-jeevo").append(f); }
    $("#ask").hidden = tabletFace;
    render(k);
  }
  const RENDER = {};
  async function render(k = screen) { if (RENDER[k]) { try { await RENDER[k]($("#s-" + k)); } catch (e) { if (e.message !== "token") $("#s-" + k).innerHTML = `<h1>${k}</h1><p class="sub">Couldn't load: ${esc(e.message)}</p>`; } } }

  // ---------- the face ----------
  const face = JeevoFace.create($("#face"), { dpr: 1.5 });
  $("#face").addEventListener("pointerdown", () => { face.poke(); face.react("tickled", 1300); send({ t: "input", kind: "touch", data: {} }); });
  $("#faceLine").onclick = () => lastDeep && showAnswer(lastLine, lastDeep);

  // ---------- live link ----------
  let ws, state = null, lastLine = "", lastDeep = null;
  function connect() {
    ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws?body=" + (isPhone() ? "iphone" : "tablet") + (token ? "&token=" + encodeURIComponent(token) : ""));
    ws.onopen = () => $("#conn").classList.add("on");
    ws.onclose = () => { $("#conn").classList.remove("on"); setTimeout(connect, 2500); };
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === "state") { state = m; face.set(m.bodies.tablet.label); $("#mood").textContent = face.label; }
      if (m.t === "reply") { showAnswer(m.line, m.deep); if (m.line) face.talk(Math.min(6000, 400 + m.line.length * 50)); speak(m.line); }
      if (m.t === "heard") showAnswer("“" + m.text + "”", null, true);
      if (m.t === "nudge") { toast(m.line, m.from, m.deep); $("#faceLine").textContent = m.line; if (screen === "today") render("today"); }
    };
  }
  const send = o => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
  setInterval(() => { if (screen && screen !== "jeevo" && document.visibilityState === "visible") render(); }, 30000);

  // ---------- ask ----------
  function showAnswer(line, deep, pending) {
    lastLine = line; lastDeep = deep;
    $("#faceLine").innerHTML = esc(line || "") + (deep ? "<small>Tap for more</small>" : "");
    const a = $("#answer"); a.hidden = false;
    a.innerHTML = `<button class="x" aria-label="Close">×</button><div class="line">${esc(line || "…")}</div>${deep ? `<div class="deep">${md(deep)}</div>` : ""}`;
    a.querySelector(".x").onclick = () => a.hidden = true;
    if (!pending && !deep) setTimeout(() => { if (lastLine === line) a.hidden = true; }, 9000);
  }
  $("#askForm").onsubmit = e => { e.preventDefault(); const v = $("#askInput").value.trim(); if (!v) return; $("#askInput").value = ""; ask(v, "text"); };
  async function ask(text, kind) {
    showAnswer("…", null, true); face.react("thinking", 3000);
    if (send({ t: "input", kind, text })) return;
    try {   // no live link: plain HTTP
      const r = await fetch("/input", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ kind, text, from: isPhone() ? "iphone" : "tablet" }) });
      const j = await r.json(); showAnswer(j.line || "Done.", j.deep);
    } catch { showAnswer("I can't reach the hub right now.", null); }
  }
  const speakOn = () => localStorage.getItem("jeevo-speak") !== "0" && !isPhone();
  function speak(line) { if (!line || !speakOn() || !("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(line); u.lang = /[ऀ-ॿ]/.test(line) ? "hi-IN" : "en-IN"; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  // voice: the browser's own recognition where it works (iPhone Safari), else record and let the hub transcribe (Fire 7)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let ear = localStorage.getItem("jeevo-ear") || (SR ? "sr" : "rec"), rec = null, lang = localStorage.getItem("jeevo-lang") || "en-IN";
  $("#mic").onclick = () => {
    if (rec) return rec.stop();
    send({ t: "sense", name: "listening" }); face.react("listening", 8000);
    if (ear === "sr" && SR) {
      const r = new SR(); r.lang = lang; r.interimResults = false; let failed = false;
      $("#mic").classList.add("rec");
      r.onresult = e => ask(e.results[0][0].transcript, "voice");
      r.onerror = e => { if (/network|service-not-allowed|language-not-supported/.test(e.error)) { failed = true; ear = "rec"; localStorage.setItem("jeevo-ear", "rec"); } };
      r.onend = () => { $("#mic").classList.remove("rec"); if (failed) record(); };
      r.start();
    } else record();
  };
  $("#mic").oncontextmenu = e => { e.preventDefault(); lang = lang === "en-IN" ? "hi-IN" : "en-IN"; localStorage.setItem("jeevo-lang", lang); toast(lang === "hi-IN" ? "Hindi" : "English", "voice"); };
  async function record() {
    if (!window.MediaRecorder) return $("#askInput").focus();
    let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast("Microphone not allowed", "voice"); }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(m => MediaRecorder.isTypeSupported(m)) || "";
    rec = new MediaRecorder(st, mime ? { mimeType: mime } : {}); const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => { st.getTracks().forEach(t => t.stop()); $("#mic").classList.remove("rec"); const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" }); rec = null; const fr = new FileReader(); fr.onload = () => { showAnswer("…", null, true); send({ t: "hear", audio: String(fr.result).split(",")[1], mime: blob.type }); }; fr.readAsDataURL(blob); };
    rec.start(); $("#mic").classList.add("rec"); showAnswer("Listening… tap ● again when done.", null, true);
    setTimeout(() => rec && rec.state === "recording" && rec.stop(), 15000);
  }

  // ---------- toast ----------
  let toastT;
  function toast(line, from, deep) {
    const t = $("#toast"); t.hidden = false; t.innerHTML = `<small>${esc(from || "Jeevo")}</small>${esc(line)}`;
    t.onclick = () => { t.hidden = true; if (deep) showAnswer(line, deep); };
    clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 7000);
  }

  // ---------- screens ----------
  RENDER.jeevo = async () => {};

  RENDER.today = async el => {
    const d = await api("today"), p = d.plan;
    const chips = [];
    if (d.weather) chips.push(`<span class="chip ${d.weather.rainSoon ? "warn" : ""}">${Math.round(d.weather.tempC)}°C${d.weather.rainAt ? " · rain ~" + d.weather.rainAt : ""}</span>`);
    if (d.scooter) chips.push(`<span class="chip ${d.scooter.soc < 30 ? "warn" : "ok"}">Scooter ${d.scooter.soc ?? "?"}%${d.scooter.rangeKm != null ? " · " + d.scooter.rangeKm + " km" : ""}${d.scooter.charging ? " · charging" : ""}</span>`);
    if (d.money) chips.push(`<span class="chip">₹${d.money.today} today · ₹${d.money.month} month</span>`);
    if (d.needsYou) chips.push(`<span class="chip warn">${d.needsYou} need you</span>`);
    if (d.dnd && d.dnd.until > Date.now()) chips.push(`<span class="chip">Quiet till ${new Date(d.dnd.until).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ })}</span>`);
    el.innerHTML = `
      <p class="sub">${esc(d.now)}</p>
      <h1>${esc(p?.headline || "Good to see you.")}</h1>
      <div class="chips" style="margin:12px 0">${chips.join("")}</div>
      ${p?.headsUp?.length ? `<div class="card" style="margin-bottom:12px">${p.headsUp.map(h => `<p>• ${esc(h)}</p>`).join("")}</div>` : ""}
      <h2>Plan</h2>
      <div class="list">${p ? p.blocks.map(b => `<div class="row ${esc(b.kind)}"><span class="t">${esc(b.time)}</span><span class="grow">${esc(b.title)}</span></div>`).join("") : `<div class="row"><span class="grow">No plan yet today.</span><button class="btn small primary" id="planNow">Plan my day</button></div>`}</div>
      ${p ? `<p class="muted" style="margin-top:6px">Planned by ${esc(p.by)} · <a href="#" id="replan">plan again</a></p>` : ""}
      <h2>Tasks</h2>
      <form class="field" id="addTask"><input id="taskTitle" placeholder="Add a task… e.g. pay rent tomorrow 10am"><button class="btn primary">Add</button></form>
      <div class="list" id="tasks">${d.tasks.map(t => `<div class="row"><button class="check" data-id="${t.id}" aria-label="Done"></button><span class="grow">${esc(t.title)}<small>${t.due ? when(t.due) : ""}</small></span></div>`).join("") || '<p class="muted">Nothing open. Nice.</p>'}</div>
      <h2>Calendar</h2>
      <div class="list">${d.calendar.map(e => `<div class="row meeting"><span class="t">${esc(e.time)}</span><span class="grow">${esc(e.summary)}${e.location ? `<small>${esc(e.location)}</small>` : ""}</span></div>`).join("") || '<p class="muted">Nothing on the calendar (or not connected).</p>'}</div>
      ${d.ordersToday.length ? `<h2>Orders today</h2><div class="list">${d.ordersToday.map(o => `<div class="row"><span class="grow">${esc(o.app)}${o.items ? `<small>${esc(o.items)}</small>` : ""}</span><span class="pill">${esc(o.stage.replace(/_/g, " "))}</span>${o.amount ? `<b>₹${o.amount}</b>` : ""}</div>`).join("")}</div>` : ""}
      ${d.chores.length ? `<h2>Chores due</h2><div class="chips">${d.chores.map(c => `<button class="chip" data-chore="${esc(c)}">${esc(c)} ✓</button>`).join("")}</div>` : ""}
      <h2>What the crew said today</h2>
      <div class="list">${d.nudges.slice(0, 12).map(n => `<div class="row"><span class="t">${new Date(n.t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ })}</span><span class="grow">${esc(n.line)}<small>${esc(n.from)}</small></span></div>`).join("") || '<p class="muted">Quiet so far.</p>'}</div>`;
    el.querySelector("#addTask").onsubmit = async e => { e.preventDefault(); const v = el.querySelector("#taskTitle").value.trim(); if (!v) return; const r = await api("tasks", { body: { title: v } }); toast(r.line, "tasks"); render("today"); };
    el.querySelectorAll(".check").forEach(b => b.onclick = async () => { b.classList.add("on"); await api(`tasks/${b.dataset.id}/done`, { body: {} }); face.react("proud", 1800); setTimeout(() => render("today"), 400); });
    el.querySelectorAll("[data-chore]").forEach(b => b.onclick = () => { ask(`did ${b.dataset.chore}`, "text"); setTimeout(() => render("today"), 800); });
    const plan = async () => { toast("Planning…", "planner"); await api("crew/planner/run", { body: {} }); render("today"); };
    el.querySelector("#planNow") && (el.querySelector("#planNow").onclick = plan);
    el.querySelector("#replan") && (el.querySelector("#replan").onclick = e => { e.preventDefault(); plan(); });
  };

  RENDER.ride = async el => {
    const d = await api("ather"), sc = d.scooter, s = d.status;
    if (!s.connected) {
      el.innerHTML = `<h1>Your Ather</h1><p class="sub">Log in once with the phone number on your Ather account. Jeevo then reads battery, range, tyres and location every 5 minutes. Read-only; unofficial (Ather has no public API), so it can break if Ather changes its app.</p>
      <div class="card" style="max-width:460px"><form id="otpF"><div class="field"><input id="phone" inputmode="tel" placeholder="Phone number (10 digits)"><button class="btn primary">Send OTP</button></div></form>
      <form id="verF" hidden><div class="field"><input id="otp" inputmode="numeric" placeholder="OTP from SMS"><button class="btn primary">Log in</button></div></form><p class="muted" id="atherMsg"></p></div>`;
      el.querySelector("#otpF").onsubmit = async e => { e.preventDefault(); try { await api("ather/otp", { body: { phone: el.querySelector("#phone").value } }); el.querySelector("#verF").hidden = false; el.querySelector("#atherMsg").textContent = "OTP sent."; } catch (x) { el.querySelector("#atherMsg").textContent = "Couldn't send: " + x.message; } };
      el.querySelector("#verF").onsubmit = async e => { e.preventDefault(); try { const r = await api("ather/verify", { body: { phone: el.querySelector("#phone").value, otp: el.querySelector("#otp").value } }); toast(`Connected · ${r.scooters.length} scooter`, "ather"); render("ride"); } catch (x) { el.querySelector("#atherMsg").textContent = "Login failed: " + x.message; } };
      return;
    }
    const soc = sc?.soc ?? 0, C = 2 * Math.PI * 70, col = soc < 20 ? "var(--red)" : soc < 40 ? "var(--amber)" : "var(--green)";
    el.innerHTML = `<h1>Ride</h1><p class="sub">${sc ? "Updated " + ago(sc.t) : "Waiting for the first reading"}${s.error ? " · " + esc(s.error) : ""}</p>
      <div class="hero"><svg class="ring" viewBox="0 0 170 170"><circle cx="85" cy="85" r="70" stroke="#222" stroke-width="12" fill="none"/><circle cx="85" cy="85" r="70" stroke="${col}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - soc / 100)}" transform="rotate(-90 85 85)"/><text x="85" y="92" text-anchor="middle" fill="#fff" font-size="36" font-weight="300">${sc?.soc ?? "—"}%</text></svg>
      <div class="stats" style="flex:1;min-width:240px"><div class="stat"><b>${sc?.rangeKm ?? "—"}</b><span>km range</span></div><div class="stat"><b>${sc?.charging ? "Yes" : "No"}</b><span>charging</span></div><div class="stat"><b>${sc?.tyreFront ?? "—"}</b><span>front psi</span></div><div class="stat"><b>${sc?.tyreRear ?? "—"}</b><span>rear psi</span></div><div class="stat"><b>${sc?.odoKm != null ? Math.round(sc.odoKm) : "—"}</b><span>odometer km</span></div><div class="stat"><b>${d.charging?.kmPerPct ?? "—"}</b><span>km per 1%</span></div></div></div>
      <div class="chips" style="margin-top:14px">${sc?.tyreWarn ? '<span class="chip warn">Check tyre pressure</span>' : ""}${d.parked ? `<a class="chip" target="_blank" rel="noopener" href="https://maps.google.com/?q=${d.parked.lat},${d.parked.lon}">Parked ${ago(d.parked.t)}</a>` : ""}<button class="chip" id="refresh">Refresh now</button><button class="chip" id="logout">Log out of Ather</button></div>
      <h2>Rides</h2><div class="list">${d.rides.filter(r => r.stage === "end").map(r => `<div class="row ride"><span class="grow">${when(r.t)}<small>${r.km ? r.km + " km" : ""}${r.socUsed ? " · " + r.socUsed + "% used" : ""} · via ${esc(r.via || "phone")}</small></span></div>`).join("") || '<p class="muted">Rides appear from the Ather\'s odometer and the iPhone ride Shortcut.</p>'}</div>
      <details><summary>Every signal the scooter reports (${Object.keys(d.signals).length})</summary><div class="kv">${Object.entries(d.signals).map(([k, v]) => `<span>${esc(k)}</span><span>${esc(JSON.stringify(v))}</span>`).join("")}</div></details>`;
    el.querySelector("#refresh").onclick = async () => { await api("ather/refresh", { body: {} }); render("ride"); };
    el.querySelector("#logout").onclick = async () => { if (confirm("Log out of Ather on this hub?")) { await api("ather/logout", { body: {} }); render("ride"); } };
  };

  RENDER.inbox = async el => {
    const list = await api("inbox"), open = list.filter(m => !m.done && m.needsYou), rest = list.filter(m => !(m.needsYou && !m.done)).slice(0, 40);
    const item = m => `<div class="row"><span class="grow"><b>${esc(m.from || m.app)}</b> <span class="pill">${esc(m.app)}</span><small>${esc(m.summary || "")} · ${ago(m.t)}</small>${m.draft ? `<small style="color:#cfd2d6;margin-top:4px">Draft: ${esc(m.draft)} <a href="#" data-copy="${esc(m.draft)}">copy</a></small>` : ""}</span>${m.needsYou && !m.done ? `<button class="btn small" data-done="${m.id}">Done</button>` : ""}</div>`;
    el.innerHTML = `<h1>Inbox</h1><p class="sub">From WhatsApp, Gmail and other apps on the tablet, and your email. Jeevo drafts; you send.</p><h2>Needs you (${open.length})</h2><div class="list">${open.map(item).join("") || '<p class="muted">Nothing needs you.</p>'}</div><h2>Everything else</h2><div class="list">${rest.map(item).join("") || '<p class="muted">No messages yet. Turn on notification access for Termux:API on the tablet.</p>'}</div>`;
    el.querySelectorAll("[data-done]").forEach(b => b.onclick = async () => { await api("inbox/" + b.dataset.done, { body: {} }); render("inbox"); });
    el.querySelectorAll("[data-copy]").forEach(a => a.onclick = e => { e.preventDefault(); navigator.clipboard?.writeText(a.dataset.copy); toast("Copied", "inbox"); });
  };

  RENDER.life = async el => {
    const d = await api("life"), days = Object.keys(d.mood).sort().slice(-7);
    const cats = Object.entries(d.spendCats), max = Math.max(1, ...cats.map(c => c[1]));
    const h = d.health || {};
    el.innerHTML = `<h1>Life</h1><p class="sub">What Jeevo sees in your days. All of it stays on the tablet.</p>
      <div class="stats"><div class="stat"><b>${h.steps ?? "—"}</b><span>steps today</span></div><div class="stat"><b>${h.sleepHours ?? "—"}</b><span>hours sleep</span></div><div class="stat"><b>₹${d.money.month ?? 0}</b><span>spent this month</span></div><div class="stat"><b>${d.rides.length}</b><span>rides, 2 weeks</span></div><div class="stat"><b>${d.insights?.workHours?.week ?? "—"}</b><span>office hours / week</span></div><div class="stat"><b>${d.insights?.focusToday?.hours ?? "—"}</b><span>focus hours today</span></div></div>
      <h2>Mood, last 7 days</h2><div class="mood7">${days.map(k => { const v = d.mood[k].sum / d.mood[k].n; return `<i title="${k}: ${v.toFixed(2)}" style="height:${Math.round(20 + (v + 1) * 18)}px;background:${v > 0.2 ? "var(--green)" : v < -0.2 ? "var(--amber)" : "var(--blue)"}"></i>`; }).join("") || '<p class="muted">Talk to Jeevo for a few days.</p>'}</div>
      ${d.week ? `<h2>This week</h2><div class="card"><h3>${esc(d.week.line || "")}</h3>${(d.week.nextWeek || []).map(x => `<p>• ${esc(x)}</p>`).join("")}</div>` : ""}
      <h2>Money by category</h2><div class="list">${cats.map(([k, v]) => `<div><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(k)}</span><span>₹${v}</span></div><div class="bar"><i style="width:${v / max * 100}%"></i></div></div>`).join("") || '<p class="muted">Forward bank SMS from the iPhone to see this.</p>'}</div>
      ${d.subscriptions.length ? `<h2>Subscriptions</h2><div class="list">${d.subscriptions.map(s => `<div class="row"><span class="grow">${esc(s.name)}<small>next ${esc(s.next)}</small></span><b>₹${s.amount}</b><span class="pill">${s.every}</span></div>`).join("")}</div>` : ""}
      <h2>Your rhythm</h2><div class="chips">${Object.entries(d.routine).map(([k, v]) => `<span class="chip">${esc(k)} ${esc(v)}</span>`).join("") || '<span class="muted">Learned after a week or two.</span>'}</div>
      ${d.habits?.lines?.length ? `<h2>Habits</h2><div class="card">${d.habits.lines.map(l => `<p>• ${esc(l)}</p>`).join("")}</div>` : ""}
      ${d.people.length ? `<h2>People</h2><div class="chips">${d.people.map(p => `<span class="chip" title="${esc(p.via)}">${esc(p.name)} · ${ago(p.last)}</span>`).join("")}</div>` : ""}
      ${d.diary.length ? `<h2>Jeevo's diary</h2><div class="list">${d.diary.map(x => `<div class="row"><span class="t">${esc(x.day.slice(5))}</span><span class="grow">${esc(x.line)}</span></div>`).join("")}</div>` : ""}
      ${d.identity.length ? `<h2>Who Jeevo is becoming</h2><div class="card"><p>${esc(d.identity.join(" "))}</p></div>` : ""}
      ${d.ideas.length ? `<h2>Ideas</h2><div class="list">${d.ideas.map(i => `<div class="row"><span class="grow">${esc(i.text)}<small>${ago(i.t)}</small></span></div>`).join("")}</div>` : ""}
      ${d.content.length ? `<h2>Reel ideas</h2><div class="grid">${d.content.map(c => `<div class="card"><h3>${esc(c.hook)}</h3><p>${esc(c.shot)}</p><p class="muted">${esc(c.caption)}</p></div>`).join("")}</div>` : ""}
      ${d.standup ? `<h2>Today's standup</h2><div class="card"><p>${md(d.standup.text)}</p></div>` : ""}`;
  };

  RENDER.memory = async el => {
    const d = await api("memory"), groups = {};
    for (const f of d.facts) (groups[f.cat] ||= []).push(f);
    el.innerHTML = `<h1>Memory</h1><p class="sub">Everything Jeevo has learned about you: ${d.facts.length} facts. Delete anything, any time.</p>
      <form class="field" id="memQ"><input id="q" placeholder="Search your life: coffee, Priya, tyres, last Zepto order…"><button class="btn">Search</button></form><div class="list" id="hits"></div>
      <h2>Teach it something</h2><form class="field" id="memAdd"><select id="cat">${["preference", "people", "places", "food", "routine", "health", "work", "money", "scooter", "home", "goal", "identity", "other"].map(c => `<option>${c}</option>`).join("")}</select><input id="fact" placeholder="e.g. my sister Aditi's birthday is 12 March"><button class="btn primary">Save</button></form>
      ${Object.entries(groups).map(([cat, fs]) => `<h2>${esc(cat)} (${fs.length})</h2><div class="list">${fs.map(f => `<div class="row"><span class="grow">${esc(f.value)}<small>${esc(f.key)} · from ${esc(f.source)} · ${Math.round(f.confidence * 100)}%</small></span><button class="btn small ghost" data-del="${f.id}">Forget</button></div>`).join("")}</div>`).join("") || '<p class="muted">Nothing yet. Talk to Jeevo: "I love filter coffee", "my sister is Aditi"…</p>'}`;
    el.querySelector("#memQ").onsubmit = async e => { e.preventDefault(); const hits = await api("memory?q=" + encodeURIComponent(el.querySelector("#q").value)); el.querySelector("#hits").innerHTML = hits.map(h => `<div class="row"><span class="pill">${esc(h.type)}</span><span class="grow">${esc(h.text)}<small>${ago(h.t)}</small></span></div>`).join("") || '<p class="muted">Nothing found.</p>'; };
    el.querySelector("#memAdd").onsubmit = async e => { e.preventDefault(); const v = el.querySelector("#fact").value.trim(); if (!v) return; await api("memory", { body: { category: el.querySelector("#cat").value, fact: v } }); render("memory"); };
    el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { await api("memory/" + b.dataset.del, { method: "DELETE", body: {} }); render("memory"); });
  };

  RENDER.crew = async el => {
    const [c, u] = await Promise.all([api("crew"), api("usage")]);
    const pct = Math.min(100, u.usd / u.budgetUSD * 100), on = c.agents.filter(a => a.enabled).length;
    el.innerHTML = `<h1>Crew</h1><p class="sub">${c.agents.length} agents in ${Object.keys(c.depts).length} departments · ${on} on · ${c.running} running, ${c.queue} queued. Most work on rules for free; the ones marked with a model call Claude or Gemini inside your budget.</p>
      <div class="card" style="margin:12px 0"><div style="display:flex;justify-content:space-between"><b>AI spend today</b><span>$${u.usd.toFixed(3)} of $${u.budgetUSD} · ${u.calls} calls</span></div><div class="bar" style="margin:8px 0"><i style="width:${pct}%;background:${pct > 90 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--blue)"}"></i></div>
      <p class="muted">Background agents may use ${Math.round(u.backgroundShare * 100)}% of the budget ($${u.bgUsd.toFixed(3)} used); your own questions get the rest.${u.lastBlock ? ` Last limit hit: ${esc(u.lastBlock.why)} (${ago(u.lastBlock.t)}).` : ""}</p>
      <div class="kv" style="margin-top:8px">${Object.entries(u.byModel).map(([m, v]) => `<span>${esc(m)}</span><span>${v.calls}/${v.rpd} calls · $${v.usd.toFixed(3)} · ${v.rpm}/min</span>`).join("") || "<span>No model calls yet today</span><span></span>"}</div></div>
      ${Object.entries(c.depts).map(([k, name]) => `<h2>${esc(name)}</h2><div class="grid">${c.agents.filter(a => a.dept === k).map(a => `<div class="card agent"><div class="head"><span class="s ${a.ok === false ? "bad" : a.lastRun ? "ok" : ""}"></span><h3 style="margin:0">${esc(a.title)}</h3><button class="switch ${a.enabled ? "on" : ""}" data-toggle="${a.name}" aria-label="On/off"></button></div><p>${esc(a.role)}</p><div class="sum">${esc(a.summary || "—")}</div><div class="foot"><span class="pill">${esc(a.schedule)}</span>${a.tier !== "rules" ? `<span class="pill">${esc(a.tier)} model</span>` : ""}${a.model && a.model !== "rules" ? `<span class="pill">${esc(a.model)}</span>` : ""}<span class="muted">${a.lastRun ? ago(a.lastRun) : "not run yet"}</span><button class="btn small ghost" data-run="${a.name}" style="margin-left:auto">Run</button></div></div>`).join("")}</div>`).join("")}`;
    el.querySelectorAll("[data-run]").forEach(b => b.onclick = async () => { b.textContent = "…"; const r = await api(`crew/${b.dataset.run}/run`, { body: {} }); toast(r.summary || "Nothing to do right now", r.agent?.title); render("crew"); });
    el.querySelectorAll("[data-toggle]").forEach(b => b.onclick = async () => { await api(`crew/${b.dataset.toggle}/toggle`, { body: { on: !b.classList.contains("on") } }); render("crew"); });
  };

  RENDER.settings = async el => {
    let c = null; try { c = await api("connections"); } catch (e) { if (e.message !== "token") throw e; }
    const row = (ok, name, detail, action = "") => `<div class="row"><span class="s" style="width:9px;height:9px;border-radius:50%;background:${ok ? "var(--green)" : "#555"};flex:none"></span><span class="grow">${name}<small>${detail}</small></span>${action}</div>`;
    const mcpUrl = c ? location.origin + c.mcp.path : "";
    el.innerHTML = `<h1>Settings</h1>
      <h2>Hub token</h2><form class="field" id="tok"><input id="tokIn" type="password" placeholder="HUB_TOKEN from secrets.json" value="${esc(token)}"><button class="btn">Save</button></form>
      ${c ? `<h2>Connections</h2><div class="list">
        ${row(c.models.claude, "Claude", c.models.claude ? `agent ${esc(c.models.config.agent)} · deep ${esc(c.models.config.deep)} · fast ${esc(c.models.config.classify)}` : "Add ANTHROPIC_API_KEY to secrets.json")}
        ${row(c.models.gemini, "Gemini", c.models.gemini ? `chat + hearing · ${esc(c.models.config.chat)}` : "Add GEMINI_API_KEY (needed to hear you on the Fire 7)", '<button class="btn small" id="testM">Test</button>')}
        ${row(c.ather.connected, "Ather", c.ather.connected ? `scooter ${esc(c.ather.scooter)} · last ${ago(c.ather.last)}${c.ather.expires ? " · login valid till " + new Date(c.ather.expires * 1000).toLocaleDateString("en-IN") : ""}` : "Log in on the Ride screen")}
        ${row(!!c.notifications.last, "Notifications (tablet)", c.notifications.last ? "last " + ago(c.notifications.last) : "Give Termux:API notification access")}
        ${row(c.email.on, "Email", c.email.on ? esc(c.email.user) : "config.json → adapters.email + app password")}
        ${row(c.calendar.on, "Calendar", c.calendar.on ? `${c.calendar.events ?? 0} events today` : "config.json → adapters.calendar.icsUrl")}
        ${row(!!c.iphone.lastSync, "iPhone Daily Sync", c.iphone.lastSync ? "last " + ago(c.iphone.lastSync) : "Set up the Shortcuts (shortcuts/README.md)")}
        ${row(c.iphone.push.devices.length > 0, "Push notifications", c.iphone.push.devices.length ? c.iphone.push.devices.length + " device(s)" : "Turn on for this device ↓", '<button class="btn small primary" id="pushOn">Enable here</button>')}
        ${row(c.camera.facesWithEyes > 0, "Camera eyes", c.camera.facesWithEyes ? "on" : "Open the face on the tablet and tap Eyes")}
        ${row(!!c.tablet, "Tablet body", c.tablet ? `${c.tablet.pct}% · ${Math.round(c.tablet.temp)}°C` : "Termux:API battery")}
        ${row(!!c.weather, "Weather", c.weather ? `${Math.round(c.weather.tempC)}°C · Open-Meteo` : "Open-Meteo, no key needed")}
        ${row(!c.work.enabled, "Work data", c.work.enabled ? "ON (make sure your employer allows it)" : "Off — only if your employer's policy allows it")}
      </div>
      <h2>Your Claude, connected</h2><div class="card"><p>Add Jeevo to Claude (web, iPhone app, desktop): Settings → Connectors → Add custom connector, and paste this URL. Claude can then read your day, search your memory, add reminders and remember things. Keep it private: the long code in it is the key.</p>
      <pre class="code" id="mcpUrl">${esc(mcpUrl)}</pre><button class="btn small" id="copyMcp">Copy</button> <span class="muted">Needs an https address that Claude can reach: see the guide (Tailscale Funnel).</span></div>
      <h2>Quiet</h2><div class="chips"><button class="chip" data-dnd="60">Quiet 1 hour</button><button class="chip" data-dnd="180">3 hours</button><button class="chip" data-dnd="0">Resume</button></div>
      <h2>This device</h2><div class="chips"><button class="chip" id="speak">${localStorage.getItem("jeevo-speak") === "0" ? "Voice replies: off" : "Voice replies: on"}</button><button class="chip" id="lang">Voice language: ${lang === "hi-IN" ? "Hindi" : "English"}</button><a class="chip" href="/face/">Full-screen face (tablet)</a></div>
      <p class="muted" style="margin-top:14px">Install: on iPhone, open this page in Safari → Share → Add to Home Screen. On the Fire 7, Chrome ⋮ → Add to Home screen.</p>` : ""}`;
    el.querySelector("#tok").onsubmit = e => { e.preventDefault(); token = el.querySelector("#tokIn").value.trim(); localStorage.setItem("jeevo-token", token); ws && ws.close(); render("settings"); };
    if (!c) return;
    el.querySelector("#testM").onclick = async () => { const r = await api("test-models", { body: {} }); toast(Object.entries(r).map(([k, v]) => `${k}: ${v.ok ? "ok" : v.error}`).join(" · ") || "No keys set", "models"); };
    el.querySelector("#pushOn").onclick = enablePush;
    el.querySelector("#copyMcp").onclick = () => { navigator.clipboard?.writeText(mcpUrl); toast("Copied the connector URL", "Claude"); };
    el.querySelectorAll("[data-dnd]").forEach(b => b.onclick = async () => { await api("dnd", { body: { minutes: +b.dataset.dnd } }); toast(+b.dataset.dnd ? "Holding non-urgent nudges" : "Nudges back on", "quiet"); });
    el.querySelector("#speak").onclick = () => { localStorage.setItem("jeevo-speak", localStorage.getItem("jeevo-speak") === "0" ? "1" : "0"); render("settings"); };
    el.querySelector("#lang").onclick = () => { lang = lang === "en-IN" ? "hi-IN" : "en-IN"; localStorage.setItem("jeevo-lang", lang); render("settings"); };
  };

  // ---------- push (iPhone: needs https + added to Home Screen, iOS 16.4+) ----------
  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return toast(/iPhone|iPad/.test(navigator.userAgent) ? "Add Jeevo to your Home Screen first (Share → Add to Home Screen), open it from there, then try again." : "This browser can't do push.", "push");
      if (location.protocol !== "https:" && location.hostname !== "localhost") return toast("Push needs the https address (Tailscale Serve). See the guide.", "push");
      const perm = await Notification.requestPermission(); if (perm !== "granted") return toast("Notifications not allowed", "push");
      const reg = await navigator.serviceWorker.ready, { publicKey } = await api("push/key");
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((publicKey.length + 3) % 4)), c => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await api("push/subscribe", { body: { subscription: sub.toJSON(), device: isPhone() ? "iphone" : "tablet" } });
      await api("push/test", { body: {} }); toast("Push is on for this device", "push"); render("settings");
    } catch (e) { toast("Push failed: " + e.message, "push"); }
  }

  // ---------- start ----------
  nav(); connect();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  addEventListener("hashchange", () => { const k = location.hash.slice(1); if (k && k !== screen && SCREENS.some(s => s[0] === k)) go(k); });
  const start = location.hash.slice(1);
  go(SCREENS.some(s => s[0] === start) ? start : isPhone() ? "today" : "jeevo");
})();
