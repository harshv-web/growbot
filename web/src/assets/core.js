/* Jeevo site core: shared soul (one writer across tabs/pages), face renderer, transitions. */
(function () {
  "use strict";
  const E = window.JeevoEmotion;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- the shared soul ---------- */
  const tabId = Math.random().toString(36).slice(2, 8);
  const PAGE = window.JEEVO_PAGE || "home";
  const soul = new E.Emotion(store.get("jeevo:soul") || undefined);
  const listeners = new Set();
  let chan = null; try { chan = new BroadcastChannel("jeevo-soul"); } catch (e) {}
  const lease = () => store.get("jeevo:lease") || { holder: null, until: 0, page: null };
  const isHolder = () => { const l = lease(); return l.holder === tabId && l.until > Date.now(); };
  function claim(force) {
    const l = lease();
    if (force || !l.holder || l.until < Date.now() || l.holder === tabId) {
      const was = l.holder;
      store.set("jeevo:lease", { holder: tabId, until: Date.now() + 4000, page: PAGE });
      if (was && was !== tabId) { soul.appraise("transfer_in"); publish("transfer"); }
      return true;
    }
    return false;
  }
  function publish(why) {
    store.set("jeevo:soul", soul.toJSON());
    if (chan) chan.postMessage({ t: "soul", state: soul.toJSON(), glowUntil: soul.glowUntil, from: tabId, page: PAGE, why });
    notify(why);
  }
  function notify(why) { listeners.forEach(fn => { try { fn(soul, why); } catch (e) {} }); }
  if (chan) chan.onmessage = ev => {
    const m = ev.data || {};
    if (m.t === "soul" && m.from !== tabId) {
      Object.assign(soul, { valence: m.state.valence, arousal: m.state.arousal, drives: m.state.drives, traits: m.state.traits, lastEvent: m.state.lastEvent, glowUntil: m.glowUntil || 0 });
      notify(m.why || "sync");
    }
    if (m.t === "event" && isHolder()) { soul.appraise(m.name); publish(m.name); }
  };
  // Any page can raise an event; the lease holder applies it (one writer).
  function event(name) {
    if (isHolder()) { soul.appraise(name); publish(name); }
    else if (chan && lease().until > Date.now()) chan.postMessage({ t: "event", name });
    else { claim(); soul.appraise(name); publish(name); }
  }
  let lastTick = Date.now();
  setInterval(() => {
    claim(false);
    if (isHolder()) {
      const now = Date.now(); soul.tick((now - lastTick) / 1000 * 20, { alone: document.hidden, active: false }); lastTick = now; // 20× time so it feels alive
      publish("tick");
    } else { lastTick = Date.now(); notify("tick"); }
  }, 1500);
  claim(false);

  /* ---------- face renderer (color / round / epaper) ---------- */
  const blinkState = { last: 0 };
  function drawFace(ctx, w, h, ex, t, o = {}) {
    const style = o.style || "color";
    const s = Math.min(w, h), cx = w / 2, cy = h / 2 + (o.dy || 0) * s;
    const hue = ex.hue, epaper = style === "epaper";
    const fg = epaper ? "#111" : `hsl(${hue} 90% ${ex.glow ? 72 : 64}%)`;
    const bg = epaper ? "#e9e6dc" : o.bg || "#05070d";
    ctx.save(); ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    if (style === "round") { ctx.beginPath(); ctx.arc(cx, h / 2, s / 2 - 1, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = bg; ctx.fill(); }
    if (!epaper && ex.glow) { const g = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 0.55); g.addColorStop(0, `hsla(${hue},90%,60%,.28)`); g.addColorStop(1, "transparent"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    // blink
    const period = ex.blinkEvery * 1000, ph = (t % period) / 160;
    const blink = ph < 1 ? Math.sin(ph * Math.PI) : 0;
    const open = Math.max(0.06, ex.eyeOpen * (1 - blink));
    const bob = reduce ? 0 : Math.sin(t / 1000 * Math.PI * ex.tempo) * s * 0.012 * (0.4 + ex.bounce);
    const ew = s * 0.2, eh = s * 0.27 * open, gap = s * 0.16, ey = cy - s * 0.06 + bob;
    const look = o.look || { x: Math.sin(t / 2300) * 0.4, y: Math.cos(t / 3100) * 0.2 };
    [-1, 1].forEach(side => {
      const ex0 = cx + side * (gap + ew / 2) - ew / 2;
      ctx.fillStyle = fg;
      rr(ctx, ex0, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2); ctx.fill();
      const pr = ew * 0.2 * ex.pupil;
      if (eh > pr * 2.4) { ctx.fillStyle = epaper ? bg : "#05070d"; ctx.beginPath(); ctx.arc(ex0 + ew / 2 + look.x * ew * 0.22, ey + look.y * eh * 0.22, pr, 0, Math.PI * 2); ctx.fill(); }
      // lids (brows) for grumpy / sad
      const tilt = ex.lidTilt * side;
      ctx.fillStyle = bg; ctx.beginPath();
      ctx.moveTo(ex0 - 4, ey - eh / 2 - 2 + tilt * eh * 0.5); ctx.lineTo(ex0 + ew + 4, ey - eh / 2 - 2 - tilt * eh * 0.5); ctx.lineTo(ex0 + ew + 4, ey - eh); ctx.lineTo(ex0 - 4, ey - eh); ctx.closePath(); ctx.fill();
    });
    // mouth
    ctx.strokeStyle = epaper ? "#111" : `hsl(${hue} 70% 70%)`; ctx.lineWidth = s * 0.022; ctx.lineCap = "round";
    ctx.beginPath(); const mw = s * 0.13, my = cy + s * 0.2 + bob, c = ex.mouth * s * 0.06;
    ctx.moveTo(cx - mw, my - c * 0.3); ctx.quadraticCurveTo(cx, my + c, cx + mw, my - c * 0.3); ctx.stroke();
    if (epaper && o.line) { ctx.fillStyle = "#111"; ctx.font = `600 ${Math.round(s * 0.07)}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = "center"; ctx.fillText(ex.text.toUpperCase(), cx, h - s * 0.14); ctx.font = `${Math.round(s * 0.055)}px "Geist Mono", ui-monospace, monospace`; ctx.fillText(o.line, cx, h - s * 0.06); }
    ctx.restore();
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // 1-bit ordered dither for the e-paper look
  function dither(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data, B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, v = l > (B[(y & 3) * 4 + (x & 3)] + .5) / 16 ? 233 : 17; d[i] = d[i + 1] = d[i + 2] = v; }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------- OLED face (128x64, 1-bit), matching firmware/keychain-oled ---------- */
  function oledFace(ctx, ex, t, sense) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
    let st = ex.label === "sleepy" ? "tired" : ex.label === "grumpy" ? "angry" : /joyful|proud|excited/.test(ex.label) ? "happy" : ex.label === "lonely" || ex.label === "uneasy" ? "sad" : ex.label === "curious" ? "wide" : "normal";
    let open = ex.eyeOpen, mouth = ex.mouth;
    if (sense === "tickled") { st = "squint"; mouth = 1; } if (sense === "cosy") { st = "soft"; mouth = .5; } if (sense === "dizzy") { st = "spiral"; mouth = -.2; }
    const ph = (t % 4200) / 140; if (st === "normal" && ph < 1) open *= 1 - Math.sin(ph * Math.PI);
    const eye = (cx, side) => {
      const w = 26, h = Math.max(2, 30 * open), r = (x, y, w, h, rr) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, rr) : ctx.rect(x, y, w, h); ctx.fill(); };
      if (st === "happy") { ctx.beginPath(); ctx.arc(cx, 34, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); return; }
      if (st === "spiral") { ctx.lineWidth = 1.5; ctx.beginPath(); for (let a = 0; a < 14; a += .25) ctx.lineTo(cx + Math.cos(a + t / 150) * a * .9, 26 + Math.sin(a + t / 150) * a * .9); ctx.stroke(); ctx.lineWidth = 3; return; }
      if (st === "tired") return r(cx - 13, 28, 26, 5, 2);
      if (st === "squint") return r(cx - 13, 23, 26, 7, 3);
      if (st === "soft") return r(cx - 13, 22, 26, 10, 5);
      if (st === "wide") return r(cx - 15, 8, 30, 36, 12);
      r(cx - w / 2, 26 - h / 2, w, h, Math.min(w, h) / 3);
      if (st === "sad" || st === "angry") { ctx.fillStyle = "#000"; ctx.beginPath(); const l = st === "sad" ? side > 0 : side < 0; ctx.moveTo(cx - 14, 26 - h / 2 - 1); ctx.lineTo(cx + 14, 26 - h / 2 - 1); ctx.lineTo(l ? cx + 14 : cx - 14, 26 - h / 2 + 10); ctx.fill(); ctx.fillStyle = "#fff"; }
    };
    eye(40, -1); eye(88, 1);
    ctx.lineWidth = 2; ctx.beginPath(); for (let x = -9; x <= 9; x++) ctx.lineTo(64 + x, 52 - mouth * 5 * (1 - x * x / 81)); ctx.stroke();
  }

  /* ---------- live mood → CSS + nav pill ---------- */
  function paint() {
    const ex = soul.express();
    document.documentElement.style.setProperty("--soul-h", ex.hue);
    $$("[data-mood]").forEach(el => { el.textContent = ex.text; });
    $$("[data-lease]").forEach(el => { const l = lease(); el.textContent = isHolder() ? "The soul is in this tab" : "The soul is in another tab (" + (l.page || "?") + ")"; });
  }
  listeners.add(paint); paint();

  /* ---------- transitions ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
    const href = a.getAttribute("href");
    if (!/^[a-z-]+\.html(#.*)?$/.test(href)) return;
    e.preventDefault();
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = href; }, reduce ? 0 : 320);
  });
  window.addEventListener("pageshow", () => document.body.classList.remove("leaving"));
  $$(".nav a").forEach(a => { if (a.getAttribute("href") === PAGE + ".html" || (PAGE === "home" && a.getAttribute("href") === "index.html")) a.setAttribute("aria-current", "page"); });

  /* ---------- scroll reveal (content is visible at rest; this only adds lift) ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".lift").forEach(el => { el.classList.add("pre"); io.observe(el); });
  }

  window.Jeevo = { oledFace, soul, event, claim: () => { claim(true); publish("claim"); }, isHolder, lease, onChange: fn => listeners.add(fn), drawFace, dither, reduce, $, $$ };
})();
