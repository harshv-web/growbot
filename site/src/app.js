(function () {
  "use strict";
  const D = window.JEEVO;
  const C = window.claude;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (let i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(k => add(e, k)); return; }
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem("jeevo:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("jeevo:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const pill = st => h("span", { class: "pill st-" + st, text: D.status[st].label });
  const tag = t => h("span", { class: "tag", text: t });
  const today = () => new Date().toISOString();
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };

  /* ---------------- markdown (safe subset) ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function inline(raw) {
    const codes = [];
    let s = String(raw).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => "<code>" + esc(codes[+i]) + "</code>");
    return s;
  }
  function md(src) {
    const L = String(src || "").replace(/\r/g, "").split("\n");
    const out = [];
    let i = 0;
    const isBlock = l => /^```|^#{1,4}\s|^\s*[-*]\s+|^\s*\d+\.\s+|^>\s?|^\s*\|/.test(l);
    while (i < L.length) {
      const l = L[i];
      if (/^```/.test(l)) {
        const buf = []; i++;
        while (i < L.length && !/^```/.test(L[i])) { buf.push(L[i]); i++; }
        i++; out.push('<pre class="code">' + esc(buf.join("\n")) + "</pre>"); continue;
      }
      const hm = l.match(/^(#{1,4})\s+(.*)$/);
      if (hm) { const n = Math.min(hm[1].length + 1, 4); out.push("<h" + n + ">" + inline(hm[2]) + "</h" + n + ">"); i++; continue; }
      if (/^\s*\|/.test(l) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
        const cells = r => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
        const head = cells(l); i += 2; const rows = [];
        while (i < L.length && /^\s*\|/.test(L[i])) { rows.push(cells(L[i])); i++; }
        out.push('<div class="tbl"><table><thead><tr>' + head.map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>" +
          rows.map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>");
        continue;
      }
      if (/^\s*[-*]\s+/.test(l)) {
        const items = [];
        while (i < L.length && /^\s*[-*]\s+/.test(L[i])) { items.push(L[i].replace(/^\s*[-*]\s+/, "")); i++; }
        out.push("<ul>" + items.map(t => "<li>" + inline(t) + "</li>").join("") + "</ul>"); continue;
      }
      if (/^\s*\d+\.\s+/.test(l)) {
        const items = [];
        while (i < L.length && /^\s*\d+\.\s+/.test(L[i])) { items.push(L[i].replace(/^\s*\d+\.\s+/, "")); i++; }
        out.push("<ol>" + items.map(t => "<li>" + inline(t) + "</li>").join("") + "</ol>"); continue;
      }
      if (/^>\s?/.test(l)) {
        const buf = [];
        while (i < L.length && /^>\s?/.test(L[i])) { buf.push(L[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(buf.join(" ")) + "</blockquote>"); continue;
      }
      if (!l.trim()) { i++; continue; }
      const buf = [];
      while (i < L.length && L[i].trim() && !isBlock(L[i])) { buf.push(L[i]); i++; }
      if (!buf.length) { buf.push(L[i]); i++; }
      out.push("<p>" + inline(buf.join(" ")) + "</p>");
    }
    return out.join("");
  }

  /* ---------------- navigation ---------------- */
  const VIEWS = ["deck", "system", "bodies", "uses", "links", "plan", "lab", "archive"];
  function show(v) {
    if (VIEWS.indexOf(v) < 0) v = "deck";
    $$(".view").forEach(s => { s.hidden = s.dataset.view !== v; });
    $$(".stations a").forEach(a => { if (a.dataset.v === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    store.set("view", v);
    const nav = $(".stations"), a = $('.stations a[data-v="' + v + '"]');
    if (nav && a) nav.scrollLeft = a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2;
  }
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const t = a.getAttribute("href").slice(1);
    if (VIEWS.indexOf(t) < 0) return;
    e.preventDefault();
    if (a.dataset.lab) setLab(a.dataset.lab);
    try { history.replaceState(null, "", "#" + t); } catch (err) {}
    show(t);
    window.scrollTo(0, 0);
  });
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));

  /* ---------------- clock ---------------- */
  function tick() {
    try {
      const f = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
      $("#clock").textContent = f.format(new Date()) + " IST";
    } catch (e) {}
  }
  tick(); setInterval(tick, 20000);

  /* ---------------- budget math (shared) ---------------- */
  function budgetCalc(p, y27, fx) {
    fx = fx || D.meta.fx;
    const rows = p.rows.map(r => {
      const pr = D.prices[r[1]] || D.prices.none;
      const pin = y27 && pr.in27 ? pr.in27 : pr.in, pout = y27 && pr.out27 ? pr.out27 : pr.out;
      let d = r[2] * (r[3] * pin + r[4] * pout) / 1e6;
      if (r[5]) d *= 0.5;
      return { name: r[0], inr: d * 30 * fx };
    });
    const B = D.budget;
    const whisper = Math.max(0, p.listenHours * 60 - B.whisperFreeMinPerDay) * B.whisperPerMin * 30 * fx;
    const kn = p.kannadaEngine === "sarvam" ? p.kannadaMin / 60 * B.sarvamPerHourINR * 30 : p.kannadaMin / 60 * B.geminiAudioPerHour * 30 * fx;
    rows.push({ name: "Transcription", inr: whisper }, { name: "Hinglish speech", inr: kn }, { name: "Domain", inr: B.fixedINR });
    return { rows, total: rows.reduce((a, r) => a + r.inr, 0) };
  }
  const leanTotal = budgetCalc(D.budget.presets.lean, false).total;

  /* ---------------- deck ---------------- */
  add($("#stats"), [
    [D.useCases.length, "use cases"], [D.integrations.length, "integrations"], [D.crew.length, "agents"], [inr(leanTotal), "a month, lean"]
  ].map(s => h("div", null, h("b", { text: s[0] }), s[1])));
  add($("#principles"), D.principles.map(p => h("div", null, h("b", { text: p.k }), h("span", { text: p.v }))));

  const SURF = ["tab", "iph", "key", "alexa", "dock"];
  let mi = Math.max(0, D.moments.findIndex(m => m.t === "08:12"));
  let playTimer = null;
  const trackOl = $("#sim-track ol");
  D.moments.forEach((m, i) => {
    trackOl.append(h("li", null, h("button", { type: "button", "aria-label": m.t + " " + m.title, onclick: () => { stopPlay(); renderMoment(i); } },
      h("span", { class: "d" }), h("span", { class: "t", text: m.t }))));
  });
  function renderMoment(i) {
    mi = (i + D.moments.length) % D.moments.length;
    const m = D.moments[mi];
    $("#sim-time").textContent = m.t;
    $("#sim-title").textContent = m.title;
    $("#sim-trig").textContent = m.trig;
    SURF.forEach(s => {
      const el = $('.surf[data-s="' + s + '"]'), txt = m.out[s];
      el.classList.toggle("on", !!txt);
      $(".msg", el).textContent = txt || "Idle";
    });
    const dr = $("#sim-dream");
    dr.hidden = !m.dream; dr.textContent = m.dream || "";
    $("#sim-why").textContent = m.why;
    const ag = $("#sim-agents"); ag.textContent = "";
    m.agents.forEach(a => ag.append(tag(a)));
    $$("#sim-track button").forEach((b, j) => b.setAttribute("aria-current", String(j === mi)));
  }
  function stopPlay() { if (playTimer) { clearInterval(playTimer); playTimer = null; } $("#sim-play").textContent = "Play the day"; }
  $("#sim-play").addEventListener("click", () => {
    if (playTimer) { stopPlay(); return; }
    $("#sim-play").textContent = "Pause";
    renderMoment(mi + 1);
    playTimer = setInterval(() => renderMoment(mi + 1), 3200);
  });
  $("#sim-prev").addEventListener("click", () => { stopPlay(); renderMoment(mi - 1); });
  $("#sim-next").addEventListener("click", () => { stopPlay(); renderMoment(mi + 1); });
  renderMoment(mi);

  /* ---------------- system ---------------- */
  add($("#orch"), D.orchestration.map(o => h("div", null, h("b", { text: o.k }), h("span", { text: o.v }))));
  add($("#crew"), D.crew.map(a => h("article", { class: "panel agent" },
    h("div", { class: "ah" }, h("h3", { text: a.name }), h("span", { class: "role", text: a.role })),
    h("p", { text: a.does }),
    h("dl", null,
      h("dt", { text: "Models" }), h("dd", { text: a.models }),
      h("dt", { text: "Wakes on" }), h("dd", { text: a.triggers }),
      h("dt", { text: "Tools" }), h("dd", null, h("code", { text: a.tools })),
      h("dt", { text: "Guardrail" }), h("dd", { text: a.guard })))));
  add($("#router"), D.router.map(r => h("tr", null, h("td", null, h("b", { text: r.task })), h("td", { text: r.pick }), h("td", { text: r.why }), h("td", { class: "muted", text: r.fallback }))));
  add($("#modes"), D.listenModes.map(m => h("div", { class: "panel mode m-" + m.id }, h("span", { class: "ring", "aria-hidden": "true" }), h("h4", { text: m.name }), h("p", { text: m.desc }), h("span", { class: "eyebrow", text: "Ring: " + m.light }))));
  add($("#tiers"), D.tiers.map(t => h("tr", null, h("td", null, h("b", { text: t.id + " " + t.name })), h("td", { text: t.ex }), h("td", { text: t.store }), h("td", { text: t.keep }))));
  add($("#streams"), D.streams.map(s => h("tr", null, h("td", null, h("b", { text: s.src })), h("td", { text: s.how }), h("td", null, tag(s.tier)), h("td", { text: s.keep }))));
  add($("#mom"), D.modelOfMe.map(tag));
  add($("#learning"), D.learning.map(o => h("div", null, h("b", { text: o.k }), h("span", { text: o.v }))));

  /* ---------------- bodies ---------------- */
  add($("#bodies"), D.bodies.map(b => h("article", { class: "panel body" },
    h("div", { class: "bh" }, h("h3", { text: b.name }), h("span", { class: "tag", text: b.tag })),
    h("p", { text: b.role }),
    h("div", null, h("span", { class: "eyebrow", text: "Does" }), h("ul", null, b.does.map(x => h("li", { text: x })))),
    h("div", null, h("span", { class: "eyebrow", text: "Build" }), h("ul", null, b.build.map(x => h("li", { text: x })))),
    h("div", { class: "parts" }, b.parts.map(p => h("div", null, h("span", null, p[0], p[2] ? h("em", { text: " · " + p[2] }) : null), h("b", { class: "mono", text: p[1] ? inr(p[1]) : "₹0" })))),
    h("div", { class: "limits" }, h("span", { class: "eyebrow", text: "Limits" }), h("ul", null, b.limits.map(x => h("li", { text: x })))))));
  (function () {
    const t = $("#cap");
    t.append(h("thead", null, h("tr", null, h("th", { text: "Capability" }), D.capability.cols.map(c => h("th", { text: c })))));
    t.append(h("tbody", null, D.capability.rows.map(r => h("tr", null, h("td", null, h("b", { text: r[0] })), r.slice(1).map(v => {
      const cls = v === "no" ? "cap-n" : v === "—" ? "muted" : /^yes/.test(v) ? "cap-y" : "cap-p";
      return h("td", { class: cls, text: v });
    })))));
    const bt = $("#bom"); let tot = 0;
    D.bom.forEach(b => { tot += b.inr; bt.append(h("tr", null, h("td", null, h("b", { text: b.tier })), h("td", { text: b.items }), h("td", { class: "num", text: inr(b.inr) }))); });
    bt.append(h("tr", null, h("td", null, h("b", { text: "Total" })), h("td", { class: "muted", text: "Everything, including optional parts" }), h("td", { class: "num" }, h("b", { text: inr(tot) }))));
  })();

  /* ---------------- use cases ---------------- */
  const F = { q: "", dom: new Set(), st: new Set(), sf: new Set() };
  function chipSet(el, items, set, labelFn, countFn) {
    el.textContent = "";
    items.forEach(it => {
      const b = h("button", { class: "chip", type: "button", "aria-pressed": String(set.has(it)) }, labelFn(it), h("span", { class: "n", text: countFn(it) }));
      b.addEventListener("click", () => { set.has(it) ? set.delete(it) : set.add(it); b.setAttribute("aria-pressed", String(set.has(it))); renderCases(); });
      el.append(b);
    });
  }
  const countBy = (fn) => { const m = {}; D.useCases.forEach(u => [].concat(fn(u)).forEach(k => { m[k] = (m[k] || 0) + 1; })); return m; };
  const cDom = countBy(u => u.d), cSt = countBy(u => u.st), cSf = countBy(u => u.s);
  chipSet($("#uc-dom"), D.domains.filter(d => cDom[d]), F.dom, d => d, d => cDom[d]);
  chipSet($("#uc-st"), Object.keys(D.status), F.st, s => D.status[s].label, s => cSt[s] || 0);
  chipSet($("#uc-sf"), Object.keys(D.surfaces).filter(s => cSf[s]), F.sf, s => D.surfaces[s].name, s => cSf[s]);
  let qTimer;
  $("#uc-q").addEventListener("input", e => { clearTimeout(qTimer); qTimer = setTimeout(() => { F.q = e.target.value.trim().toLowerCase(); renderCases(); }, 120); });
  $("#uc-reset").addEventListener("click", () => {
    F.q = ""; $("#uc-q").value = ""; F.dom.clear(); F.st.clear(); F.sf.clear();
    $$("#v-uses .chip").forEach(c => c.setAttribute("aria-pressed", "false")); renderCases();
  });
  function match(u) {
    if (F.dom.size && !F.dom.has(u.d)) return false;
    if (F.st.size && !F.st.has(u.st)) return false;
    if (F.sf.size && !u.s.some(x => F.sf.has(x))) return false;
    if (F.q) {
      const hay = [u.t, u.d, u.when, u.trig, u.flow, u.edges.join(" "), u.i.join(" "), u.agents.join(" "), u.s.map(s => D.surfaces[s].name).join(" ")].join(" ").toLowerCase();
      return F.q.split(/\s+/).every(w => hay.indexOf(w) >= 0);
    }
    return true;
  }
  function renderCases() {
    const box = $("#cases"); box.textContent = "";
    const list = D.useCases.filter(match);
    $("#uc-count").textContent = list.length + " of " + D.useCases.length + " use cases";
    if (!list.length) { box.append(h("div", { class: "empty", text: "Nothing matches. Clear a filter or try another word." })); return; }
    list.forEach(u => box.append(h("details", { class: "case", id: "uc-" + u.id },
      h("summary", null,
        h("div", { class: "ct" }, h("h3", { text: u.t }), pill(u.st)),
        h("div", { class: "meta" }, h("span", { class: "tag", text: u.d }), h("span", { class: "tag", text: u.when }), h("span", { class: "tag", text: u.ph }), u.s.map(s => h("span", { class: "tag", text: D.surfaces[s].name }))),
        h("p", { class: "trig", text: u.trig }),
        h("span", { class: "more", text: "Flow · " + u.edges.length + " edge cases" })),
      h("div", { class: "det" },
        h("h4", { text: "What happens" }), h("p", { text: u.flow }),
        u.edges.length ? [h("h4", { text: "Edge cases" }), h("ul", null, u.edges.map(e => h("li", { text: e })))] : null,
        h("h4", { text: "Uses" }), h("div", { class: "meta" }, u.i.map(tag)),
        h("h4", { text: "Crew" }), h("div", { class: "meta" }, u.agents.map(tag))))));
  }
  renderCases();

  /* ---------------- integrations ---------------- */
  const cats = ["All"].concat(Array.from(new Set(D.integrations.map(i => i.cat))));
  let catF = "All";
  function renderInts() {
    const cb = $("#int-cat"); cb.textContent = "";
    cats.forEach(c => { const b = h("button", { class: "chip", type: "button", "aria-pressed": String(c === catF), text: c }); b.addEventListener("click", () => { catF = c; renderInts(); }); cb.append(b); });
    const tb = $("#ints"); tb.textContent = "";
    D.integrations.filter(i => catF === "All" || i.cat === catF).forEach(i => tb.append(h("tr", null,
      h("td", null, h("b", { text: i.name }), h("div", { class: "eyebrow", text: i.cat })),
      h("td", null, pill(i.st)),
      h("td", { text: i.how }), h("td", { text: i.cost }), h("td", { class: "muted", text: i.limits }),
      h("td", null, h("a", { href: i.src, target: "_blank", rel: "noopener", text: i.srcLabel })))));
  }
  renderInts();

  /* ---------------- plan ---------------- */
  add($("#phases"), D.phases.map(p => h("div", { class: "stop c-" + p.color },
    h("div", { class: "node", text: p.id }),
    h("div", { class: "panel pc" },
      h("div", { class: "ph" }, h("h3", { text: p.name }), h("span", { class: "w", text: p.weeks + " · " + p.cost })),
      h("p", { style: "color:var(--ink-2)", text: p.goal }),
      h("ul", null, p.build.map(b => h("li", { text: b }))),
      h("div", { class: "demo", text: "Demo: " + p.demo }),
      h("div", { class: "done", text: "Done when: " + p.done })))));
  add($("#plan-cost"), Object.keys(D.budget.presets).map(k => {
    const p = D.budget.presets[k];
    return h("div", { class: "row", style: "justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:6px" },
      h("b", { text: p.label }), h("span", { class: "mono", text: inr(budgetCalc(p, false).total) + " now · " + inr(budgetCalc(p, true).total) + " from Jan 2027" }));
  }));
  add($("#srcs"), D.sources.map(s => h("a", { href: s[1], target: "_blank", rel: "noopener", text: s[0] })));

  /* ---------------- lab tabs ---------------- */
  function setLab(t) {
    $$("#labtabs .chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
    $$("#v-lab .tool").forEach(p => { p.hidden = p.dataset.tool !== t; });
    store.set("lab", t);
  }
  $$("#labtabs .chip").forEach(b => b.addEventListener("click", () => setLab(b.dataset.t)));
  setLab(store.get("lab", "device"));

  /* ---------------- device check ---------------- */
  const DC = { report: null };
  function voicesReady() {
    return new Promise(res => {
      if (!("speechSynthesis" in window)) return res([]);
      let v = speechSynthesis.getVoices();
      if (v && v.length) return res(v);
      const done = () => res(speechSynthesis.getVoices() || []);
      try { speechSynthesis.addEventListener("voiceschanged", done, { once: true }); } catch (e) {}
      setTimeout(done, 1500);
    });
  }
  async function deviceCheck() {
    const n = navigator, ua = n.userAgent || "";
    const iPad = /iPad/.test(ua) || (n.platform === "MacIntel" && n.maxTouchPoints > 1);
    const iPhone = /iPhone/.test(ua);
    const android = /Android ([\d.]+)/.exec(ua);
    const chrome = /(?:Chrome|CriOS)\/(\d+)/.exec(ua);
    const ios = /OS (\d+)[_.](\d+)/.exec(ua);
    const safari = /Version\/([\d.]+).*Safari/.exec(ua);
    let kind = "Computer";
    if (iPhone) kind = "iPhone"; else if (iPad) kind = "iPad"; else if (android) kind = /Mobile/.test(ua) ? "Android phone" : "Android tablet";
    const os = android ? "Android " + android[1] : ios && (iPhone || iPad) ? "iOS/iPadOS " + ios[1] + "." + ios[2] : (n.platform || "");
    const browser = chrome ? (/CriOS/.test(ua) ? "Chrome (iOS) " : "Chrome ") + chrome[1] : safari ? "Safari " + safari[1] : "Other browser";
    const has = {
      "Web Bluetooth": "bluetooth" in n,
      "Web NFC": "NDEFReader" in window,
      "Web Serial": "serial" in n,
      "Screen Wake Lock": "wakeLock" in n,
      "Battery status": "getBattery" in n,
      "Speech recognition": !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      "Speech synthesis": "speechSynthesis" in window,
      "Camera / mic API": !!(n.mediaDevices && n.mediaDevices.getUserMedia),
      "Web Push": "PushManager" in window,
      "Service worker": "serviceWorker" in n,
      "IndexedDB": "indexedDB" in window,
      "WebAssembly": typeof WebAssembly === "object",
      "WebGPU": "gpu" in n,
      "Motion sensors": "DeviceMotionEvent" in window,
      "Vibration": "vibrate" in n,
      "Web Share": "share" in n
    };
    let storage = null;
    try { if (n.storage && n.storage.estimate) { const e = await n.storage.estimate(); storage = e.quota ? Math.round(e.quota / 1e9 * 10) / 10 + " GB quota" : null; } } catch (e) {}
    let battery = null;
    try { if (n.getBattery) { const b = await n.getBattery(); battery = Math.round(b.level * 100) + "%" + (b.charging ? ", charging" : ", on battery"); } } catch (e) {}
    const voices = (await voicesReady()).filter(v => /^(en-IN|hi)/i.test(v.lang)).map(v => v.lang + " · " + v.name);
    const cores = n.hardwareConcurrency || null, mem = n.deviceMemory || null;
    const scr = Math.round(screen.width) + "×" + Math.round(screen.height) + " @" + (window.devicePixelRatio || 1) + "x";
    const hasKn = voices.some(v => /^kn/i.test(v)), hasHi = voices.some(v => /^hi/i.test(v));
    const home = [], pocket = [];
    if (kind === "iPhone") {
      pocket.push("Pocket presence: web app + Shortcuts + Siri. Web Push works once installed to the home screen.", "No Bluetooth or NFC from the web, and listening stops when locked: keychain haptics and NFC run through Shortcuts.");
      home.push("Not the home body. Use the tablet for always-on listening.");
    } else {
      home.push(has["Speech synthesis"] ? "Can speak." + (hasHi ? " Hindi voice installed." : " No Hindi voice: Sarvam Bulbul v3 fills in.") : "No speech synthesis: use Sarvam or Gemini TTS audio.");
      home.push(has["Speech recognition"] ? "Browser speech recognition present: fine for 'On call' mode." : "No browser speech recognition: record audio and send it to the Scribe.");
      home.push(has["Screen Wake Lock"] ? "Wake Lock available: the face can stay on." : "No Wake Lock: use a kiosk browser or the system's stay-awake setting.");
      home.push(has["Web Bluetooth"] ? "Web Bluetooth present: can hear the keychain beacon directly (the dock can too)." : "No Web Bluetooth: the ESP32 dock handles BLE.");
      if (iPad) home.push("iPad: use Guided Access to keep Jeevo full-screen.");
      if (android && parseFloat(android[1]) < 10) home.push("Android " + android[1] + " may be stuck on an older Chrome: prefer Fully Kiosk Browser and check each feature above.");
      pocket.push(kind === "Computer" ? "A computer: good for the Lab and Claude, not a presence." : "Can be a secondary presence.");
    }
    DC.report = { kind, os, browser, cores, mem, scr, storage, battery, has, voices, home, pocket, at: today() };
    renderDC();
  }
  function renderDC() {
    const r = DC.report; if (!r) return;
    const head = $("#dc-head"); head.textContent = "";
    [r.kind, r.os, r.browser, r.scr, r.cores ? r.cores + " cores" : null, r.mem ? r.mem + " GB RAM" : null, r.storage, r.battery].filter(Boolean).forEach(x => head.append(tag(x)));
    const ck = $("#dc-checks"); ck.textContent = "";
    Object.keys(r.has).forEach(k => ck.append(h("div", { class: "check " + (r.has[k] ? "y" : "n") }, h("span", { text: k }), h("b", { text: r.has[k] ? "YES" : "NO" }))));
    const vv = $("#dc-voices"); vv.textContent = "";
    if (r.voices.length) r.voices.forEach(v => vv.append(tag(v))); else vv.append(h("span", { class: "muted", text: "No Indian-language voices reported (some browsers load them late; reopen to re-check)." }));
    const vd = $("#dc-verdict"); vd.textContent = "";
    vd.append(h("div", { class: "panel" }, h("span", { class: "eyebrow", text: "As the home body" }), h("ul", null, r.home.map(x => h("li", { text: x })))));
    vd.append(h("div", { class: "panel" }, h("span", { class: "eyebrow", text: "As a pocket presence" }), h("ul", null, r.pocket.map(x => h("li", { text: x })))));
  }
  function dcMarkdown(r) {
    return "Device check run on " + fmtDate(r.at) + ".\n\n| Field | Value |\n|---|---|\n" +
      [["Device", r.kind], ["OS", r.os], ["Browser", r.browser], ["Screen", r.scr], ["Cores", r.cores || "?"], ["RAM", r.mem ? r.mem + " GB" : "?"], ["Storage", r.storage || "?"], ["Battery", r.battery || "?"]].map(x => "| " + x[0] + " | " + x[1] + " |").join("\n") +
      "\n\n## Features\n\n| Feature | Present |\n|---|---|\n" + Object.keys(r.has).map(k => "| " + k + " | " + (r.has[k] ? "yes" : "no") + " |").join("\n") +
      "\n\n## Indian-language voices\n\n" + (r.voices.length ? r.voices.map(v => "- " + v).join("\n") : "- none reported") +
      "\n\n## As the home body\n\n" + r.home.map(x => "- " + x).join("\n") + "\n\n## As a pocket presence\n\n" + r.pocket.map(x => "- " + x).join("\n");
  }
  deviceCheck();
  $("#dc-save").addEventListener("click", async () => {
    const r = DC.report; if (!r) return;
    if (!db) { $("#dc-msg").textContent = "Saving needs this page open in Claude."; return; }
    $("#dc-save").disabled = true;
    try {
      await db.collection("archive").add({ title: "Device check · " + r.kind + " · " + r.browser, kind: "report", tags: ["device-check", r.kind.toLowerCase()], summary: r.kind + ", " + r.os + ", " + r.browser, body: dcMarkdown(r), author: "you", created: today(), updated: today(), pinned: false });
      $("#dc-msg").textContent = "Saved to the Archive.";
    } catch (e) { $("#dc-msg").textContent = "Couldn't save (" + (e && e.code || "error") + ")."; }
    $("#dc-save").disabled = false;
  });

  /* ---------------- attention router ---------------- */
  const KINDS = {
    leave_now: { label: "Leave now for the metro", u: 3, priv: false, time: true },
    metro_down: { label: "Metro disruption on your line", u: 3, priv: false, time: true },
    delivery: { label: "Instamart order at the gate", u: 2, priv: false, time: true },
    ac_on: { label: "AC still on, you just left", u: 2, priv: false, ask: true },
    power_cut: { label: "Power cut at home", u: 2, priv: false },
    promise: { label: "Promise due tonight", u: 2, priv: true },
    bill: { label: "Credit card bill due in 3 days", u: 1, priv: true },
    family: { label: "No call to Amma in 5 days", u: 1, priv: true },
    wicket: { label: "Wicket! (cricket buddy)", u: 1, priv: false },
    medicine: { label: "Medicine time", u: 3, priv: true, exempt: true },
    security: { label: "Door opened while you're away", u: 4, priv: true },
    idea: { label: "Idea captured from the keychain", u: 0, priv: false }
  };
  const ks = $("#ar-kind");
  Object.keys(KINDS).forEach(k => ks.append(h("option", { value: k, text: KINDS[k].label })));
  function route() {
    const where = $("#ar-where").value, focus = $("#ar-focus").value, phone = $("#ar-phone").value;
    const hour = Math.max(0, Math.min(23, parseInt($("#ar-hour").value, 10) || 0));
    const pings = parseInt($("#ar-pings").value, 10) || 0, guests = $("#ar-guests").value === "yes";
    const k = KINDS[ks.value];
    const home = where.indexOf("home") === 0, night = hour >= 23 || hour < 6;
    const outs = [], why = [];
    let held = null;
    const U = ["log only", "low", "medium", "high", "critical"][k.u];
    if (k.u === 0) { held = "Logged only. It appears in the evening digest."; why.push("Captures never interrupt."); }
    else if ((focus === "sleep" || night) && k.u < 4 && !k.exempt) { held = "Held for the morning brief."; why.push(focus === "sleep" ? "Sleep Focus is on." : "It's between 23:00 and 06:00."); }
    else if (focus === "dnd" && k.u < 3) { held = "Held for the digest."; why.push("Do Not Disturb lets only high-urgency messages through."); }
    else if (focus === "work" && k.u < 3) { held = "Held for the after-work digest."; why.push("Work Focus: only high-urgency messages interrupt."); }
    else if (pings >= 6 && k.u < 3) { held = "Held for the digest."; why.push("Today's interruption budget (6) is used up."); }
    if (!held) {
      if (k.u === 4) {
        outs.push(["iPhone", "Critical alert that breaks through Focus"], ["Keychain", "Buzz ×3"]);
        if (home) outs.push(["Tablet", "Full-screen alert and voice"]); else outs.push(["Alexa", "Announcement at home, in case someone's there"]);
        why.push("Critical: every surface that can reach you.");
      } else if (home) {
        const speakOk = !(k.priv && guests);
        if (where === "home-desk") {
          outs.push(["Tablet", speakOk ? (k.priv ? "On the face, spoken quietly" : "Spoken and shown on the face") : "A neutral hint on the face only"]);
          why.push("You're at the desk, so the tablet is the natural surface.");
        } else if (speakOk && !k.priv) {
          outs.push(["Alexa", "Announced in the room you're in"]);
          why.push("You're away from the desk; the Echo in that room reaches you.");
        } else {
          outs.push(["iPhone", "Notification"]);
          why.push("Private, so it isn't announced aloud.");
        }
        if (!speakOk) { outs.push(["iPhone", "Notification with the details"]); why.push("Guests are here, so nothing private is spoken."); }
        if (k.ask && phone !== "charging") { outs.push(["iPhone", "Question with Yes / No buttons"]); why.push("It needs an answer and the phone is with you."); }
        if (k.time && where !== "home-desk" && phone === "pocket") { outs.push(["Keychain", "Haptic nudge"]); why.push("Time-critical and the phone is in your pocket."); }
      } else {
        if (phone === "charging") {
          outs.push(["Keychain", "Haptic nudge"], ["Telegram", "Message waiting for when you check"]);
          why.push("Your phone is charging at home, so the keychain is all that's on you.");
        } else {
          outs.push(["iPhone", focus === "work" ? "Notification (time-sensitive)" : "Notification"]);
          if (k.time && phone === "pocket") { outs.push(["Keychain", "Haptic nudge: long-short"]); why.push("Time-critical and the phone is in your pocket: a haptic you'll feel."); }
          why.push("You're away from home, so the phone is the main surface.");
        }
      }
    }
    why.push("Logged with a reason trace. What you do next teaches the router.");
    const seen = new Set(), uniq = outs.filter(o => { const key = o[0] + o[1]; if (seen.has(key)) return false; seen.add(key); return true; });
    const box = $("#ar-out"); box.textContent = "";
    box.append(h("div", { class: "row", style: "justify-content:space-between" }, h("b", { style: "font-family:var(--display); font-size:1.3rem", text: k.label }), h("span", { class: "tag", text: "urgency: " + U + (k.priv ? " · private" : "") })));
    const rt = h("div", { class: "route" });
    if (held) rt.append(h("div", { class: "r held" }, h("b", { text: "Held" }), h("span", { text: held })));
    uniq.forEach(o => rt.append(h("div", { class: "r" }, h("b", { text: o[0] }), h("span", { text: o[1] }))));
    box.append(rt, h("div", { class: "reasons" }, why.map(w => h("div", { text: "· " + w }))));
  }
  ["#ar-where", "#ar-focus", "#ar-phone", "#ar-hour", "#ar-pings", "#ar-guests", "#ar-kind"].forEach(s => $(s).addEventListener("input", route));
  route();

  /* ---------------- crew budget ---------------- */
  const BG = { preset: "lean", p: null, y27: false, fx: D.meta.fx };
  function loadPreset(k) {
    BG.preset = k; const src = D.budget.presets[k];
    BG.p = { rows: src.rows.map(r => r.slice()), listenHours: src.listenHours, kannadaMin: src.kannadaMin, kannadaEngine: src.kannadaEngine };
    $("#bg-hours").value = BG.p.listenHours; $("#bg-kn").value = BG.p.kannadaMin; $("#bg-kne").value = BG.p.kannadaEngine;
    renderBGRows(); renderBG();
    $$("#bg-presets .chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
  }
  add($("#bg-presets"), Object.keys(D.budget.presets).map(k => h("button", { class: "chip", type: "button", "data-k": k, text: D.budget.presets[k].label, onclick: () => loadPreset(k) })));
  function renderBGRows() {
    const tb = $("#bg-rows"); tb.textContent = "";
    BG.p.rows.forEach((r, i) => {
      const sel = h("select", { "aria-label": r[0] + " model", id: "bg-m-" + i }, Object.keys(D.prices).map(k => h("option", { value: k, text: D.prices[k].label, selected: k === r[1] })));
      sel.addEventListener("input", () => { r[1] = sel.value; renderBG(); });
      const num = (idx, lbl) => { const e = h("input", { type: "number", min: "0", value: String(r[idx]), "aria-label": r[0] + " " + lbl, id: "bg-" + idx + "-" + i }); e.addEventListener("input", () => { r[idx] = parseFloat(e.value) || 0; renderBG(); }); return e; };
      const cb = h("input", { type: "checkbox", "aria-label": r[0] + " batch", id: "bg-b-" + i }); cb.checked = !!r[5]; cb.addEventListener("input", () => { r[5] = cb.checked; renderBG(); });
      tb.append(h("tr", null, h("td", null, h("b", { text: r[0] })), h("td", null, sel), h("td", null, num(2, "calls")), h("td", null, num(3, "input tokens")), h("td", null, num(4, "output tokens")), h("td", null, cb)));
    });
  }
  function renderBG() {
    BG.p.listenHours = parseFloat($("#bg-hours").value) || 0;
    BG.p.kannadaMin = parseFloat($("#bg-kn").value) || 0;
    BG.p.kannadaEngine = $("#bg-kne").value;
    BG.fx = parseFloat($("#bg-fx").value) || D.meta.fx;
    BG.y27 = $("#bg-27").checked;
    const res = budgetCalc(BG.p, BG.y27, BG.fx);
    const max = Math.max.apply(null, res.rows.map(r => r.inr).concat([1]));
    const out = $("#bg-out"); out.textContent = "";
    out.append(h("span", { class: "eyebrow", text: "Per month · " + (BG.y27 ? "2027 prices" : "Sep 2026 prices") }),
      h("div", { class: "big", text: inr(res.total) }),
      h("span", { class: "muted", style: "font-size:.88rem", text: "≈ " + inr(res.total / 30) + " a day · models, transcription, Hinglish speech and the domain" }),
      h("div", { class: "bars" }, res.rows.slice().sort((a, b) => b.inr - a.inr).map(r => h("div", { class: "bar-row" },
        h("span", { text: r.name }), h("span", { class: "bt" }, h("span", { class: "bf", style: "display:block; width:" + (r.inr / max * 100).toFixed(1) + "%" })), h("span", { class: "bv", text: inr(r.inr) })))),
      h("p", { class: "muted", style: "font-size:.84rem", text: "Free tiers aren't counted for private data: the Guardian keeps your life log off any provider that may train on it. 'Inside your Claude app' costs nothing extra beyond your subscription." }));
  }
  $("#bg-fx").value = D.meta.fx;
  ["#bg-hours", "#bg-kn", "#bg-kne", "#bg-fx", "#bg-27"].forEach(s => $(s).addEventListener("input", renderBG));
  loadPreset("lean");

  /* ---------------- sync lab ---------------- */
  const SY = {};
  function syReset() {
    SY.clock = 100; SY.ver = 0; SY.log = []; SY.facts = {};
    SY.dev = {
      tab: { name: "Tablet", online: true, out: [], seen: 0, l: 0, c: 0, skew: 0, view: {} },
      iph: { name: "iPhone", online: true, out: [], seen: 0, l: 0, c: 0, skew: 2, view: {} }
    };
    syRender();
  }
  function hlc(id) {
    const d = SY.dev[id], wall = SY.clock + d.skew;
    if (wall > d.l) { d.l = wall; d.c = 0; } else d.c++;
    return { l: d.l, c: d.c, d: id };
  }
  const hcmp = (a, b) => a.h.l - b.h.l || a.h.c - b.h.c || a.h.d.localeCompare(b.h.d);
  const hstr = x => x.l + "." + x.c + "@" + x.d;
  function commit(evs) {
    evs.slice().sort(hcmp).forEach(ev => {
      SY.log.push(ev);
      const f = SY.facts[ev.key];
      if (f && !f.conflict && f.ver > ev.seen && f.val !== ev.val && f.dev !== ev.dev) {
        f.conflict = { val: ev.val, dev: ev.dev, h: ev.h };
      } else if (!f || !f.conflict) {
        SY.ver++; SY.facts[ev.key] = { val: ev.val, dev: ev.dev, h: ev.h, ver: SY.ver };
      } else {
        f.conflict = { val: ev.val, dev: ev.dev, h: ev.h };
      }
      SY.log.sort(hcmp);
    });
  }
  function pull(id) {
    const d = SY.dev[id]; if (!d.online) return;
    d.seen = SY.ver; d.view = {};
    Object.keys(SY.facts).forEach(k => { d.view[k] = { val: SY.facts[k].val, pending: false }; });
    const maxL = SY.log.reduce((m, e) => Math.max(m, e.h.l), 0); if (maxL > d.l) { d.l = maxL; d.c = 0; }
  }
  function syWrite(id, key, val) {
    SY.clock++;
    const d = SY.dev[id];
    const ev = { key, val, dev: id, seen: d.seen, h: hlc(id) };
    d.view[key] = { val, pending: !d.online };
    if (d.online) { commit([ev]); pull("tab"); pull("iph"); } else d.out.push(ev);
    syRender();
  }
  function syToggle(id) {
    const d = SY.dev[id]; d.online = !d.online; SY.clock++;
    if (d.online) { const q = d.out; d.out = []; commit(q); pull("tab"); pull("iph"); }
    syRender();
  }
  function syResolve(key, pick) {
    const f = SY.facts[key]; if (!f || !f.conflict) return;
    SY.ver++;
    SY.facts[key] = pick === "theirs" ? { val: f.conflict.val, dev: f.conflict.dev, h: f.conflict.h, ver: SY.ver } : { val: f.val, dev: f.dev, h: f.h, ver: SY.ver };
    pull("tab"); pull("iph"); syRender();
  }
  function devPanel(id) {
    const d = SY.dev[id];
    const inp = h("input", { type: "text", placeholder: "key = value", id: "sy-in-" + id, "aria-label": d.name + " new fact" });
    const go = () => { const m = inp.value.split("="); if (m.length < 2) return; syWrite(id, m[0].trim(), m.slice(1).join("=").trim()); inp.value = ""; };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    return h("div", { class: "panel dev" },
      h("div", { class: "dh" }, h("h4", { text: d.name }), h("button", { class: "btn small" + (d.online ? "" : " danger"), type: "button", onclick: () => syToggle(id), text: d.online ? "Online · go offline" : "Offline · reconnect" })),
      h("div", { class: "row" },
        h("button", { class: "chip", type: "button", onclick: () => syWrite(id, "coffee", "filter, no sugar"), text: "coffee = filter, no sugar" }),
        h("button", { class: "chip", type: "button", onclick: () => syWrite(id, "coffee", "black"), text: "coffee = black" }),
        h("button", { class: "chip", type: "button", onclick: () => syWrite(id, "wake", id === "tab" ? "6:40" : "7:00"), text: "wake = " + (id === "tab" ? "6:40" : "7:00") })),
      h("div", { class: "row" }, inp, h("button", { class: "btn small", type: "button", onclick: go, text: "Write" })),
      h("span", { class: "eyebrow", text: "What this device sees" }),
      Object.keys(d.view).length ? Object.keys(d.view).map(k => h("div", { class: "fact" }, h("span", null, h("b", { text: k }), " = " + d.view[k].val), d.view[k].pending ? h("span", { class: "tag", text: "queued" }) : null)) : h("div", { class: "empty", text: "No facts yet." }),
      d.out.length ? h("div", { class: "log" }, d.out.map(e => h("div", { class: "q", text: "outbox · " + hstr(e.h) + " · " + e.key + " = " + e.val }))) : null);
  }
  function syRender() {
    const g = $("#sy-grid"); g.textContent = "";
    const core = h("div", { class: "panel dev", style: "border-color:color-mix(in srgb, var(--amber) 50%, transparent)" },
      h("div", { class: "dh" }, h("h4", { text: "Soul Core" }), h("span", { class: "tag", text: "version " + SY.ver })),
      h("span", { class: "eyebrow", text: "Facts" }),
      Object.keys(SY.facts).length ? Object.keys(SY.facts).map(k => {
        const f = SY.facts[k];
        if (!f.conflict) return h("div", { class: "fact" }, h("span", null, h("b", { text: k }), " = " + f.val), h("span", { class: "tag", text: SY.dev[f.dev].name }));
        return h("div", { class: "fact conflict", style: "display:grid; gap:6px" },
          h("span", null, h("b", { text: k }), " changed on both devices while apart"),
          h("div", { class: "row" },
            h("button", { class: "btn small", type: "button", onclick: () => syResolve(k, "mine"), text: "Keep “" + f.val + "” (" + SY.dev[f.dev].name + ")" }),
            h("button", { class: "btn small", type: "button", onclick: () => syResolve(k, "theirs"), text: "Keep “" + f.conflict.val + "” (" + SY.dev[f.conflict.dev].name + ")" })));
      }) : h("div", { class: "empty", text: "Write a fact on either device." }),
      h("span", { class: "eyebrow", text: "Event log, ordered by hybrid logical clock" }),
      h("div", { class: "log" }, SY.log.length ? SY.log.map(e => h("div", { text: hstr(e.h) + " · " + e.key + " = " + e.val })) : h("div", { class: "q", text: "empty" })));
    g.append(devPanel("tab"), core, devPanel("iph"));
  }
  $("#sy-reset").addEventListener("click", syReset);
  $("#sy-scenario").addEventListener("click", () => {
    syReset();
    const steps = [
      () => syWrite("tab", "coffee", "filter"),
      () => syToggle("tab"), () => syToggle("iph"),
      () => syWrite("tab", "coffee", "filter, no sugar"),
      () => syWrite("iph", "coffee", "black"),
      () => syToggle("iph"), () => syToggle("tab")
    ];
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { steps.forEach(s => s()); return; }
    steps.forEach((s, i) => setTimeout(s, i * 650));
  });
  syReset();

  /* ---------------- runtime: db, sample, downloads ---------------- */
  let db = null, sample = null;
  const S = { archive: [], tasks: [], sel: store.get("sel", null), kind: "All", q: "", editing: null, phaseF: "All", connecting: true };
  function setSync(t, on) { const s = $("#sync"); s.textContent = t; s.classList.toggle("on", !!on); }

  async function boot() {
    if (!C || typeof C.use !== "function") { offline(); return; }
    try { db = await C.use("db"); } catch (e) { db = null; }
    S.connecting = false;
    if (!db) { offline(); } else {
      setSync("Synced", true);
      db.collection("archive").onSnapshot(snap => { S.archive = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); renderArchive(); },
        e => setSync("Sync stopped · reload", false));
      db.collection("tasks").onSnapshot(snap => { S.tasks = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); renderBoard(); },
        e => setSync("Sync stopped · reload", false));
    }
    try { sample = await C.use("sample"); } catch (e) { sample = null; }
    if (!sample) { $("#ask-ui").hidden = true; $("#ask-off").hidden = false; }
  }
  function offline() {
    S.connecting = false;
    setSync("Offline copy", false);
    $("#tk-off").hidden = false; $("#tk-form").hidden = true;
    $("#ask-ui").hidden = true; $("#ask-off").hidden = false;
    renderArchive(); renderBoard();
  }

  /* ---------------- board ---------------- */
  const PH = D.phases.map(p => p.id);
  add($("#tk-phase"), PH.map(p => h("option", { value: p, text: p + " · " + D.phases.find(x => x.id === p).name })));
  $("#tk-form").addEventListener("submit", async e => {
    e.preventDefault(); if (!db) return;
    const t = $("#tk-title").value.trim(); if (!t) return;
    $("#tk-title").value = "";
    try { await db.collection("tasks").add({ title: t, phase: $("#tk-phase").value, status: "todo", created: today(), order: Date.now() }); } catch (err) { setSync("Couldn't save", false); }
  });
  function armDelete(btn, fn) {
    btn.addEventListener("click", () => {
      if (btn.dataset.arm) { fn(); return; }
      btn.dataset.arm = "1"; btn.textContent = "Confirm delete";
      setTimeout(() => { delete btn.dataset.arm; btn.textContent = "Delete"; }, 3000);
    });
    return btn;
  }
  async function safe(p) { try { await p; } catch (e) { setSync("Couldn't save (" + (e && e.code || "error") + ")", false); } }
  function renderBoard() {
    const fb = $("#tk-filter"); fb.textContent = "";
    ["All"].concat(PH).forEach(p => { const b = h("button", { class: "chip", type: "button", "aria-pressed": String(S.phaseF === p), text: p }); b.addEventListener("click", () => { S.phaseF = p; renderBoard(); }); fb.append(b); });
    const board = $("#tk-board"); board.textContent = "";
    const cols = { todo: "To do", doing: "Doing", done: "Done" };
    const list = S.tasks.filter(t => S.phaseF === "All" || t.phase === S.phaseF).sort((a, b) => (PH.indexOf(a.phase) - PH.indexOf(b.phase)) || ((a.order || 0) - (b.order || 0)));
    Object.keys(cols).forEach(c => {
      const items = list.filter(t => (t.status || "todo") === c);
      board.append(h("div", { class: "panel col" }, h("h4", null, h("span", { text: cols[c] }), h("span", { text: String(items.length) })),
        items.length ? items.map(t => h("div", { class: "task" },
          h("div", null, h("span", { class: "tag", text: t.phase || "—" }), " ", t.title),
          t.notes ? h("div", { class: "muted", style: "font-size:.84rem", text: t.notes }) : null,
          db ? h("div", { class: "acts" },
            c !== "todo" ? h("button", { class: "btn small", type: "button", text: "← Back", onclick: () => safe(db.doc("tasks/" + t.id).update({ status: c === "done" ? "doing" : "todo" })) }) : null,
            c !== "done" ? h("button", { class: "btn small", type: "button", text: c === "todo" ? "Start →" : "Done ✓", onclick: () => safe(db.doc("tasks/" + t.id).update({ status: c === "todo" ? "doing" : "done" })) }) : null,
            armDelete(h("button", { class: "btn small ghost danger", type: "button", text: "Delete" }), () => safe(db.doc("tasks/" + t.id).delete()))) : null))
          : h("div", { class: "empty", text: db ? "Nothing here." : S.connecting ? "Connecting…" : "Available when opened in Claude." })));
    });
  }

  /* ---------------- archive ---------------- */
  const KINDS_A = ["All", "research", "decision", "report", "log", "note", "link"];
  $("#ar-q").addEventListener("input", e => { S.q = e.target.value.trim().toLowerCase(); renderArchive(); });
  $("#ar-new").addEventListener("click", () => { S.editing = { title: "", kind: "note", tags: [], body: "", url: "" }; renderReader(); });
  function archFiltered() {
    return S.archive.filter(d => (S.kind === "All" || d.kind === S.kind) && (!S.q || [d.title, d.summary, d.body, (d.tags || []).join(" ")].join(" ").toLowerCase().indexOf(S.q) >= 0))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.updated || b.created || "").localeCompare(String(a.updated || a.created || "")));
  }
  function renderArchive() {
    const kb = $("#ar-kinds"); kb.textContent = "";
    KINDS_A.forEach(k => { const n = k === "All" ? S.archive.length : S.archive.filter(d => d.kind === k).length; if (k !== "All" && !n) return;
      const b = h("button", { class: "chip", type: "button", "aria-pressed": String(S.kind === k) }, k === "All" ? "All" : k[0].toUpperCase() + k.slice(1), h("span", { class: "n", text: n }));
      b.addEventListener("click", () => { S.kind = k; renderArchive(); }); kb.append(b); });
    const box = $("#ar-items"); box.textContent = "";
    $("#ar-new").disabled = !db;
    if (!db && S.connecting) { box.append(h("div", { class: "empty", text: "Connecting to the archive…" })); renderReader(); return; }
    if (!db) {
      box.append(h("div", { class: "notice", text: "The Archive lives in this page's database, so it syncs across your tablet, iPhone and laptop. It loads when the page is opened in Claude. The same documents are in the project's docs/ folder on GitHub." }));
      renderReader(); return;
    }
    const list = archFiltered();
    if (!list.length) box.append(h("div", { class: "empty", text: S.archive.length ? "No entries match." : "Loading the archive…" }));
    list.forEach(d => box.append(h("button", { class: "item", type: "button", "aria-current": String(d.id === S.sel), onclick: () => { S.sel = d.id; S.editing = null; store.set("sel", d.id); renderArchive(); if (window.innerWidth < 980) $("#ar-reader").scrollIntoView({ behavior: "smooth" }); } },
      h("span", { class: "it", text: (d.pinned ? "★ " : "") + (d.title || "Untitled") }),
      h("span", { class: "im" }, h("span", { class: "pill kind-" + (d.kind || "note"), text: d.kind || "note" }), fmtDate(d.updated || d.created), d.author === "claude" ? "· Claude" : d.author === "you" ? "· You" : ""))));
    if (!S.sel && list.length) S.sel = list[0].id;
    renderReader();
  }
  function renderReader() {
    const r = $("#ar-reader"); r.textContent = "";
    if (S.editing) { r.append(editor(S.editing)); return; }
    const d = S.archive.find(x => x.id === S.sel);
    if (!d) { r.append(h("div", { class: "empty", text: db ? "Pick an entry, or add a new one." : S.connecting ? "Connecting…" : "Open this page in Claude to read the archive." })); return; }
    r.append(h("div", { class: "rh" },
      h("div", { class: "row" }, h("span", { class: "pill kind-" + (d.kind || "note"), text: d.kind || "note" }), h("span", { class: "muted mono", text: fmtDate(d.created) + (d.updated && d.updated !== d.created ? " · updated " + fmtDate(d.updated) : "") }), (d.tags || []).map(tag)),
      h("h2", { text: d.title || "Untitled" }),
      d.summary ? h("p", { class: "muted", text: d.summary }) : null,
      d.url ? h("a", { href: d.url, target: "_blank", rel: "noopener", text: d.url }) : null,
      h("div", { class: "row" },
        h("button", { class: "btn small", type: "button", text: d.pinned ? "Unpin" : "Pin", onclick: () => safe(db.doc("archive/" + d.id).update({ pinned: !d.pinned })) }),
        h("button", { class: "btn small", type: "button", text: "Edit", onclick: () => { S.editing = Object.assign({}, d, { tags: (d.tags || []).slice() }); renderReader(); } }),
        armDelete(h("button", { class: "btn small ghost danger", type: "button", text: "Delete" }), async () => { await safe(db.doc("archive/" + d.id).delete()); S.sel = null; }))));
    r.append(h("div", { class: "md", html: md(d.body || "") }));
    if (d.sources && d.sources.length) r.append(h("div", null, h("span", { class: "eyebrow", text: "Sources" }), h("ul", null, d.sources.map(s => h("li", null, h("a", { href: s.url || s[1], target: "_blank", rel: "noopener", text: s.title || s[0] || s.url }))))));
  }
  function editor(e) {
    const f = h("form", { class: "form" });
    const title = h("input", { type: "text", id: "ed-title", value: e.title || "", placeholder: "Title", required: true });
    const kind = h("select", { id: "ed-kind" }, KINDS_A.slice(1).map(k => h("option", { value: k, text: k, selected: k === e.kind })));
    const tags = h("input", { type: "text", id: "ed-tags", value: (e.tags || []).join(", "), placeholder: "tags, comma separated" });
    const url = h("input", { type: "url", id: "ed-url", value: e.url || "", placeholder: "https://… (optional)" });
    const body = h("textarea", { id: "ed-body", placeholder: "Markdown supported", style: "min-height:260px" }); body.value = e.body || "";
    f.append(h("h3", { text: e.id ? "Edit entry" : "New entry" }),
      h("label", { class: "f" }, h("span", { text: "Title" }), title),
      h("div", { class: "fgrid" }, h("label", { class: "f" }, h("span", { text: "Kind" }), kind), h("label", { class: "f" }, h("span", { text: "Tags" }), tags), h("label", { class: "f" }, h("span", { text: "Link" }), url)),
      h("label", { class: "f" }, h("span", { text: "Body" }), body),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "submit", text: e.id ? "Save changes" : "Add to archive" }), h("button", { class: "btn", type: "button", text: "Cancel", onclick: () => { S.editing = null; renderReader(); } })));
    f.addEventListener("submit", async ev => {
      ev.preventDefault(); if (!db) return;
      const data = { title: title.value.trim() || "Untitled", kind: kind.value, tags: tags.value.split(",").map(s => s.trim()).filter(Boolean), url: url.value.trim(), body: body.value, updated: today() };
      try {
        if (e.id) await db.doc("archive/" + e.id).update(data);
        else { const ref = await db.collection("archive").add(Object.assign(data, { created: today(), author: "you", pinned: false, summary: "" })); S.sel = ref.id; store.set("sel", ref.id); }
        S.editing = null; renderArchive();
      } catch (err) { setSync("Couldn't save (" + (err && err.code || "error") + ")", false); }
    });
    return f;
  }
  $("#ar-export").addEventListener("click", async () => {
    const list = archFiltered();
    const text = "# Jeevo archive\n\nExported " + fmtDate(today()) + " · " + list.length + " entries\n\n" + list.map(d => "---\n\n# " + d.title + "\n\n*" + (d.kind || "note") + " · " + fmtDate(d.created) + ((d.tags || []).length ? " · " + d.tags.join(", ") : "") + "*\n\n" + (d.body || "")).join("\n\n");
    let dl = null;
    try { dl = C && C.use ? await C.use("downloads") : null; } catch (e) { dl = null; }
    if (!dl) { setSync("Export needs Claude", false); return; }
    try { await dl.save({ filename: "jeevo-archive-" + new Date().toISOString().slice(0, 10) + ".md", data: text }); } catch (e) { /* declined or unavailable */ }
  });

  /* ---------------- ask Claude ---------------- */
  const QUICK = [
    "Plan my next 6-hour Saturday build block.",
    "Stress-test the iPhone side. What will break first?",
    "Which 5 use cases give the most daily value for the least build?",
    "Write the bank-SMS Shortcut with the OTP firewall, step by step.",
    "Draft the Dreamer's nightly prompt.",
    "What should I test in Phase 0 on the tablet?"
  ];
  add($("#ask-quick"), QUICK.map(q => h("button", { class: "chip", type: "button", text: q, onclick: () => { $("#ask-q").value = q; $("#ask-q").focus(); } })));
  function context() {
    const lines = [];
    lines.push("PROJECT: Jeevo, Harsh's personal multi-agent AI in Bengaluru (concept v2, personal edition, Sep 2026). One memory (Soul Core: a Cloudflare Durable Object, single writer) and many bodies: an old tablet at home (face, ears, eyes), his iPhone (web app + Shortcuts + Siri + push), a keychain (NFC → BLE beacon → pendant ears), a printed iPhone case (MagSafe dock key, NFC tap-card), an ESP32 dock (radar, IR, lights, BLE, power sense, Swivel motor), Alexa, Telegram/WhatsApp, and Claude/ChatGPT via a Jeevo MCP connector. He is a product/motion designer who codes, has a Bambu 3D printer and a code-CAD engine. Budget-conscious. Personal, not a business.");
    lines.push("PRINCIPLES: " + D.principles.map(p => p.k + " (" + p.v + ")").join("; "));
    lines.push("CREW: " + D.crew.map(a => a.name + " = " + a.role + " [" + a.models + "]").join("; "));
    lines.push("PHASES: " + D.phases.map(p => p.id + " " + p.name + " (" + p.weeks + "): " + p.goal + " Done when: " + p.done).join(" | "));
    lines.push("KEY FACTS: Swiggy MCP (Food/Instamart/Dineout) is COD + Swiggy Money, no cancellations, no third-party apps, so use via Claude/ChatGPT. Alexa+ India launched 16 Sep 2026; MCP Toolkit US-only; classic custom skill + Voice Monkey now. Namma Metro: static GTFS only, no realtime or ticket API. iOS web apps: no Web Bluetooth/NFC, no background audio. Workers AI Whisper ~$0.03/h, ~3.5 h/day free. Lean crew ≈ " + inr(leanTotal) + "/month.");
    const open = S.tasks.filter(t => t.status !== "done").slice(0, 30);
    if (open.length) lines.push("OPEN TASKS: " + open.map(t => "[" + t.phase + "|" + t.status + "] " + t.title).join("; "));
    if (S.archive.length) lines.push("ARCHIVE INDEX: " + S.archive.slice(0, 50).map(d => "“" + d.title + "” (" + d.kind + ", " + fmtDate(d.created) + ")" + (d.summary ? ": " + d.summary : "")).join(" | "));
    return lines.join("\n\n");
  }
  function searchArchive(q) {
    const w = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    return S.archive.map(d => { const hay = [d.title, d.summary, d.body, (d.tags || []).join(" ")].join(" ").toLowerCase(); return { d, s: w.reduce((a, x) => a + (hay.split(x).length - 1), 0) }; })
      .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5)
      .map(x => ({ id: x.d.id, title: x.d.title, kind: x.d.kind, date: fmtDate(x.d.created), excerpt: String(x.d.body || "").slice(0, 600) }));
  }
  let askCtl = null, lastAnswer = "", lastQ = "";
  const ERR = { not_granted: "You declined Claude access for this page.", rate_limited: "Too many requests right now. Try again in a bit.", session_expired: "Sign in to Claude again.", refused: "Claude declined this one; try rephrasing.", prompt_too_large: "Too much context; ask something narrower.", upstream_error: "The connection dropped. Try again." };
  $("#ask-stop").addEventListener("click", () => { if (askCtl) askCtl.abort(); });
  $("#ask-go").addEventListener("click", async () => {
    if (!sample) return;
    const q = $("#ask-q").value.trim(); if (!q) return;
    const out = $("#ask-out"), msg = $("#ask-msg");
    out.innerHTML = "<p class='muted'>Thinking…</p>"; msg.textContent = "";
    $("#ask-go").disabled = true; $("#ask-stop").disabled = false; $("#ask-save").disabled = true;
    askCtl = new AbortController(); lastQ = q; lastAnswer = "";
    const input = context() + "\n\nQUESTION FROM HARSH:\n" + q + "\n\nAnswer in Markdown, specific to his devices, Bengaluru and the phases above. Use the tools to look things up in his archive or the use-case library when useful, and name the archive entries you relied on.";
    const opts = { signal: askCtl.signal, onText: ({ text }) => { lastAnswer = text; out.innerHTML = md(text); } };
    let canTools = false;
    try { const lim = await sample.limits(); canTools = !!(lim && lim.tools); } catch (e) {}
    if (canTools) {
      opts.tools = [
        { name: "search_archive", description: "Search Harsh's Jeevo archive (research, decisions, device reports). Returns up to 5 entries with id, title, kind, date and a 600-character excerpt.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, execute: i => searchArchive(i.query) },
        { name: "read_archive", description: "Read one archive entry in full (up to 12,000 characters) by its id from search_archive.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }, execute: i => { const d = S.archive.find(x => x.id === String(i.id)); if (!d) throw new Error("No entry with that id"); return { title: d.title, kind: d.kind, body: String(d.body || "").slice(0, 12000) }; } },
        { name: "search_use_cases", description: "Search the 74 Jeevo use cases. Returns up to 8 with title, status, phase, trigger, flow and edge cases.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, execute: i => { const w = String(i.query || "").toLowerCase().split(/\s+/).filter(Boolean); return D.useCases.filter(u => { const hay = [u.t, u.d, u.trig, u.flow, u.edges.join(" "), u.i.join(" ")].join(" ").toLowerCase(); return w.some(x => hay.indexOf(x) >= 0); }).slice(0, 8).map(u => ({ title: u.t, status: D.status[u.st].label, phase: u.ph, trigger: u.trig, flow: u.flow, edges: u.edges })); } }
      ];
    } else opts.cache = false;
    try {
      const res = await sample(input, opts);
      lastAnswer = res.text; out.innerHTML = md(res.text);
      if (res.truncated) msg.textContent = "The answer was cut short. Ask for less at a time.";
      $("#ask-save").disabled = !db;
    } catch (e) {
      if (e && e.text) { lastAnswer = e.text; out.innerHTML = md(e.text); $("#ask-save").disabled = !db; } else if (e && e.code !== "cancelled") out.innerHTML = "";
      if (e && e.code !== "cancelled") msg.textContent = ERR[e.code] || ERR.upstream_error;
      if (e && (e.code === "not_granted" || e.code === "sampling_disabled")) { $("#ask-ui").hidden = true; $("#ask-off").hidden = false; }
    } finally { $("#ask-go").disabled = false; $("#ask-stop").disabled = true; askCtl = null; }
  });
  $("#ask-save").addEventListener("click", async () => {
    if (!db || !lastAnswer) return;
    $("#ask-save").disabled = true;
    try {
      await db.collection("archive").add({ title: "Claude: " + lastQ.slice(0, 90), kind: "report", tags: ["ask-claude"], summary: lastQ, body: "**Question:** " + lastQ + "\n\n" + lastAnswer, author: "claude", created: today(), updated: today(), pinned: false });
      $("#ask-msg").textContent = "Saved to the Archive.";
    } catch (e) { $("#ask-msg").textContent = "Couldn't save (" + (e && e.code || "error") + ")."; $("#ask-save").disabled = false; }
  });

  /* ---------------- start ---------------- */
  renderArchive(); renderBoard();
  show((location.hash || "").slice(1) || store.get("view", "deck"));
  boot();
})();
