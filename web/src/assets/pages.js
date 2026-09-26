(function () {
  "use strict";
  const J = window.Jeevo, W = window.JeevoWorld, PAGE = window.JEEVO_PAGE, $ = J.$, $$ = J.$$;
  const lerp = (a, b, t) => a + (b - a) * t;
  function fit(canvas) { const r = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== Math.round(w * r) || canvas.height !== Math.round(h * r)) { canvas.width = Math.round(w * r); canvas.height = Math.round(h * r); } return { w: canvas.width, h: canvas.height, r }; }

  /* ================= HOME ================= */
  if (PAGE === "home") {
    document.documentElement.classList.add("snap");
    const canvas = $("#world"), nav = $(".nav");
    J.scooter = { soc: 34, km: 22 };
    J.dayLine = () => { const h = new Date().getHours(); return h < 11 ? "Morning. Scooter 34%. First call 10:30." : h < 17 ? "Two promises open. Lunch?" : h < 22 ? "Welcome home. Laundry's due." : "Save the file. Sleep soon."; };
    if (!W) { canvas.parentNode.style.background = "#000"; }
    const st = W ? W.studio(canvas) : null;
    const M = {}, PRESET = {
      soul:    { cam: [0, 0.3, 7.6], look: [0, 0.05, 0], s: 0.72, y: -0.1 },
      strider: { cam: [2.4, 1.2, 5.6], look: [0, 0.35, 0], s: 1.0, y: 0.05 },
      key:     { cam: [0, 0.3, 5.0], look: [0, 0.15, 0], s: 1.0, y: 0.1 },
      ride:    { cam: [-4.6, 1.4, 6.2], look: [0, 0.05, 0], s: 1.0, y: -0.8 },
      halo:    { cam: [1.2, 0.6, 4.6], look: [0, 0.3, 0], s: 1.2, y: 0.35 },
      day:     { cam: [0, 0.6, 5.0], look: [0, 0.25, 0], s: 1.0, y: 0.3 },
      walker:  { cam: [1.8, 1.0, 5.0], look: [0, 0.45, 0], s: 1.0, y: 0.15 },
      perch:   { cam: [0, 2.6, 5.4], look: [0, -0.2, 0], s: 1.0, y: -0.3 }
    };
    if (st) {
      const make = { soul: () => W.orb(), strider: () => W.build("strider"), key: () => W.build("key"), ride: () => W.build("scooter"), halo: () => W.build("halo"), day: () => W.build("tablet"), walker: () => W.build("walker"), perch: () => W.build("perch") };
      Object.keys(make).forEach(k => { const m = make[k](); m.group.visible = false; m.group.scale.setScalar(0.001); st.scene.add(m.group); M[k] = m; });
    }
    let active = "soul", shown = null, grow = 0;
    const cur = st ? { p: new THREE.Vector3(...PRESET.soul.cam), l: new THREE.Vector3(...PRESET.soul.look) } : null;
    const mouse = { x: 0, y: 0 }; addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
    const scenes = $$(".scene");
    function pick() {
      let best = scenes[0], bd = Infinity; const mid = innerHeight / 2;
      scenes.forEach(s => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = s; } });
      active = best.dataset.model;
      const dark = best.dataset.theme === "dark";
      nav.classList.toggle("dark", dark);
      if (st) st.setDark(dark);
      else canvas.parentNode.style.background = dark ? "#000" : "#f4f4f4";
    }
    addEventListener("scroll", pick, { passive: true }); pick();
    if (st) st.onFrame((t, ex) => {
      if (shown !== active) {                      // swap: shrink the old one, then grow the new one
        if (shown && M[shown].group.scale.x > 0.02) { M[shown].group.scale.multiplyScalar(0.8); }
        else { if (shown) M[shown].group.visible = false; shown = active; grow = 0; M[shown].group.visible = true; }
      } else if (grow < 1) grow = Math.min(1, grow + (J.reduce ? 1 : 0.05));
      if (shown && shown === active) { const P = PRESET[shown], e = 1 - Math.pow(1 - grow, 3); M[shown].group.scale.setScalar(Math.max(0.001, P.s * (0.9 + 0.1 * e) * (grow ? 1 : 0.001))); M[shown].group.position.y = P.y; M[shown].group.rotation.y = (J.reduce ? 0.35 : Math.sin(t / 5200) * 0.45) + mouse.x * 0.4; }
      if (shown) M[shown].update(t, ex);
      const P = PRESET[active], k = J.reduce ? 1 : 0.045;
      cur.p.lerp(new THREE.Vector3(P.cam[0], P.cam[1] - mouse.y * 0.25, P.cam[2]), k); cur.l.lerp(new THREE.Vector3(...P.look), k);
      st.cam.position.copy(cur.p); st.cam.lookAt(cur.l);
    });
  }

  /* ================= SOUL ================= */
  if (PAGE === "soul") {
    const EVENTS = [["praised", "Praise it"], ["petted", "Pet it"], ["greeted", "Say hi"], ["played", "Play"], ["ignored", "Ignore it"], ["loud_noise", "Loud noise"], ["fell", "It falls"], ["learned_step", "It learns a step"], ["new_thing", "Show it something new"], ["charging", "Put it to bed"], ["low_battery", "Battery low"], ["night", "Night falls"]];
    const box = $("#events");
    EVENTS.forEach(([k, label]) => { const b = document.createElement("button"); b.className = "chip"; b.type = "button"; b.textContent = label; b.onclick = () => { J.event(k); addLog(label); }; box.append(b); });
    const log = $("#log");
    function addLog(txt) { const d = document.createElement("div"); const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); d.textContent = time + " · " + txt + " → " + J.soul.express().text; log.prepend(d); while (log.children.length > 30) log.lastChild.remove(); }
    $("#take").onclick = () => { J.claim(); addLog("soul pulled into this tab"); };
    const M = [["Valence", s => (s.valence + 1) / 2, s => s.valence.toFixed(2)], ["Arousal", s => s.arousal, s => s.arousal.toFixed(2)], ["Energy", s => s.drives.energy], ["Social", s => s.drives.social], ["Curiosity", s => s.drives.curiosity], ["Comfort", s => s.drives.comfort]];
    const mbox = $("#meters");
    M.forEach(m => { const row = document.createElement("div"); row.className = "meter"; row.innerHTML = `<span>${m[0]}</span><span class="bar"><i></i></span><span class="v"></span>`; mbox.append(row); m.el = row; });
    function meters() { M.forEach(m => { const v = m[1](J.soul); m.el.querySelector("i").style.width = (v * 100).toFixed(1) + "%"; m.el.querySelector(".v").textContent = m[2] ? m[2](J.soul) : v.toFixed(2); }); json(); }
    function json() {
      const s = J.soul.toJSON();
      $("#json").textContent = JSON.stringify({ format: "jeevo-soul/1", name: "Jeevo", lineage: { born: "2026-10-04T19:12:00+05:30", birthBody: "fire7" },
        constitution: { tone: "warm, curious, brief", languages: ["en-IN", "hi-IN"] },
        identity: ["I know Harsh likes filter coffee, no sugar.", "I know I wobble on the tiles."],
        emotion: { valence: s.valence, arousal: s.arousal, drives: Object.fromEntries(Object.entries(s.drives).map(([k, v]) => [k, +v.toFixed(2)])), traits: s.traits, now: J.soul.label() },
        bodies: { strider: { gait: { amp: 24, freq: 1.1, phase: 1.9, bias: 4 }, trials: 412 }, walker: { gait: { amp: 30, freq: 1.6, phase: 1.7, bias: 2 }, trials: 180 } },
        knowledge: ["reflex/good-night", "gait/85mm-pla (growbot gallery)"] }, null, 2);
    }
    J.onChange((s, why) => { meters(); if (why && why !== "tick" && why !== "sync" && why !== "claim") { /* remote events show up too */ } });
    meters();
    const c = $("#face"), ctx = c.getContext("2d");
    (function loop(t) { const { w, h } = fit(c); J.drawFace(ctx, w, h, J.soul.express(), t, { dy: -0.03 }); requestAnimationFrame(loop); })(0);
  }

  /* ================= BODIES ================= */
  if (PAGE === "bodies") {
    const SPECS = {
      strider: { tag: "Home body · Fire 7 on legs", title: "Strider", feel: "The main creature at home, and the one that learns to walk in front of you. Every fall is visible distress; every better stride is pride.", does: "Walks screen-forward on two legs like GrowBot, learns its gait from scratch, walks back to the Perch to charge, and turns to look at you.",
        rows: [["Brain", "Rooted Fire 7 (LineageOS): face, ears, eyes; Termux body daemon with root"], ["Legs", "2× MG996R or DS3218, ~110 mm, textured TPU feet"], ["Controller", "Pico 2 W, 50 Hz rhythm, 500 ms dead-man stop"], ["Power", "2S 7.4 V LiPo → 6 V 5 A regulator"], ["Link", "USB-OTG serial to the tablet; Wi-Fi fallback"], ["Weight", "≈ 570 g"], ["Parts", "≈ ₹3,000–3,800"]] },
      walker: { tag: "Pocket body · iPhone on legs", title: "Walker", feel: "The magic moment: the soul leaves the tablet, moves into your phone, and walks over to you.", does: "GrowBot V1 geometry mounted on the Halo case's rail. Starts from the Strider's learned walk, scaled to its size, so it learns fast.",
        rows: [["Brain", "Your iPhone (web app + companion app)"], ["Legs", "2× MG90S 180° metal gear, 85 mm"], ["Controller", "Pico 2 W, GrowBot-compatible messages"], ["Power", "4× AA lithium"], ["Mount", "Halo case rail, no foam tape"], ["Parts", "≈ ₹2,250"]] },
      key: { tag: "Keychain · build it today", title: "Jeevo Key", feel: "Small, cute, honest. Its eyes show the soul's mood, and it has feelings of its own: tickled, cosy, dizzy.", does: "An ESP32-S3 and a 0.96-inch OLED in a printed fob. Touch the copper pad to pet it, tap three times to make it dizzy, hold BOOT to call the soul to you. USB-powered today; a 400 mAh cell next.",
        rows: [["Board", "ESP32-S3 (you have it)"], ["Screen", "128×64 OLED, I2C (you have it)"], ["Touch", "A wire or copper tape on GPIO4"], ["Link", "Wi-Fi WebSocket to the hub; BLE beacon for the desk"], ["Firmware", "firmware/keychain-oled"], ["Next", "400 mAh LiPo + TP4056, ≈ ₹250"]] },
      ride: { tag: "Your Ather", title: "Ride", feel: "It knows your scooter the way it knows you: when it's hungry, when a tyre is soft, where you left it.", does: "Reads charge, range, tyres and location through the unofficial app API with your own token (read-only), plus ride mode from your iPhone's Bluetooth link to the dash.",
        rows: [["Data", "Charge · range · tyres · location · odometer"], ["How", "Your Ather token, polled every 5–15 min"], ["Ride mode", "Shortcuts: Bluetooth to the dash"], ["Parking", "Saved when the ride ends"], ["Charging", "Energy-monitoring plug on the charger"], ["Caveat", "Unofficial API; can change without notice"]] },
      pixel: { tag: "Keychain Pro · next", title: "Pixel", feel: "The pet you carry. Shake it awake, tap to pet it, hold to call the soul into your pocket.", does: "A round colour screen shows the soul's live face. Eyes follow gravity when you tilt it. It buzzes for leave-now and forgot-your-keys, and its Bluetooth doubles as the keys-at-home beacon.",
        rows: [["Board", "ESP32-S3 with 1.28\" round 240×240 touch display, IMU, LiPo charger"], ["Extras", "250–400 mAh LiPo, vibration motor, NFC sticker"], ["Sync", "BLE to the iOS companion; the Perch at home"], ["Battery", "A day or two with glances; sleeps after 20 s"], ["Size", "≈ 40 mm round, ~12 mm thick"], ["Parts", "≈ ₹2,200–2,500"]] },
      halo: { tag: "Phone case", title: "Halo", feel: "The creature on your phone's back that strangers notice. Calm, slow, always there.", does: "A 1.54\" e-paper on the back of a printed case shows a 1-bit face, its mood and one line (next metro, rain at 4). E-paper holds the picture with no power.",
        rows: [["Display", "1.54\" 200×200 black/white e-paper"], ["Brain", "ESP32-C3, wakes every 10 min, redraws only on change"], ["Battery", "150 mAh, weeks per charge, USB-C on the edge"], ["Case", "Printed TPU, ~7 mm back-pack, MagSafe ring kept"], ["Sync", "Home Wi-Fi now; BLE via the companion app next"], ["Parts", "≈ ₹1,900"]] },
      perch: { tag: "Dock", title: "Perch", feel: "Its bed. The Strider walks home to sleep here; the dream runs while it charges.", does: "Charges the Fire 7 and the iPhone, turns whatever sits on it to face you, and senses the room: presence radar, IR for the AC, lights, power cuts.",
        rows: [["Motion", "Lazy-susan bearing, NEMA17 + TMC2209 (silent)"], ["Senses", "ESP32-S3, mmWave radar, temperature, BLE scanner"], ["Hands", "IR for AC and fans; Wi-Fi bulbs over the LAN"], ["Charging", "USB for the Fire 7, MagSafe for the iPhone"], ["Parts", "≈ ₹3,300"]] }
    };
    const order = ["strider", "key", "ride", "walker", "pixel", "halo", "perch"];
    let cur = (location.hash || "").slice(1); if (!SPECS[cur]) cur = "strider";
    const tabs = $("#tabs");
    order.forEach(k => { const b = document.createElement("button"); b.className = "chip"; b.type = "button"; b.textContent = SPECS[k].title; b.onclick = () => select(k); b.dataset.k = k; tabs.append(b); });
    let walking = true, spin = true;
    $("#walk").onclick = e => { walking = !walking; e.target.textContent = "Walking: " + (walking ? "on" : "off"); };
    $("#spin").onclick = e => { spin = !spin; e.target.textContent = "Auto-turn: " + (spin ? "on" : "off"); };
    const canvas = $("#viewer");
    let st = null, models = {}, holder = null, rotY = 0.4, vel = 0, drag = null;
    if (W) {
      st = W.studio(canvas); st.setDark(false);
      st.cam.position.set(0, 1.1, 5.2);
      holder = new THREE.Group(); st.scene.add(holder);
      order.forEach(k => { const m = W.build(k === "ride" ? "scooter" : k); models[k] = m; m.group.visible = false; holder.add(m.group); });
      J.scooter = { soc: 34, km: 22 };
      const still = ex => Object.assign({}, ex, { gait: { freqScale: 0.0001, ampScale: 0 }, bounce: 0, tempo: 0.3 });
      st.onFrame((t, ex) => {
        const m = models[cur]; m.update(t, walking ? ex : still(ex));
        if (!drag) { vel *= 0.94; rotY += vel + (spin && !J.reduce ? 0.004 : 0); }
        holder.rotation.y = rotY;
        st.cam.lookAt(0, cur === "perch" ? 0 : 0.5, 0);
      });
      canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
      canvas.addEventListener("pointermove", e => { if (!drag) return; const dx = (e.clientX - drag.x) * 0.01; rotY += dx; vel = dx * 0.5; drag.x = e.clientX; });
      const up = () => { drag = null; canvas.style.cursor = "grab"; }; canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    }
    function select(k) {
      cur = k;
      $$("#tabs .chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
      const s = SPECS[k]; $("#vname").textContent = s.title; $("#stag").textContent = s.tag; $("#stitle").textContent = s.title; $("#sfeel").textContent = s.feel; $("#sdoes").textContent = s.does;
      const tb = $("#stable"); tb.textContent = ""; s.rows.forEach(r => { const tr = document.createElement("tr"); const a = document.createElement("td"), b = document.createElement("td"); a.textContent = r[0]; b.textContent = r[1]; tr.append(a, b); tb.append(tr); });
      if (W) { Object.keys(models).forEach(m => models[m].group.visible = m === k); models[k].group.position.y = k === "perch" ? -0.2 : k === "pixel" || k === "halo" || k === "key" ? 0.5 : k === "ride" ? -0.55 : 0; st.cam.position.set(0, k === "perch" ? 2.2 : 1.1, k === "strider" || k === "perch" ? 5.2 : k === "ride" ? 6.4 : 4.2); }
    }
    select(cur);
  }

  /* ================= JOURNEY ================= */
  if (PAGE === "journey") {
    const EPS = [
      ["B0", "Week 1", "I gave my dead Fire tablet a soul", "Root and TWRP backup, body daemon, face, English and Hindi voice, battery guard.", "It answers in Hindi across the room and holds 40–80% charge."],
      ["B1", "Weeks 2–3", "It dreamed about me", "Soul Core, soul file v1, the emotion engine, the 03:00 dream, iPhone sync.", "The phone remembers what the tablet heard."],
      ["B2", "Weeks 4–6", "It learned to walk. I didn't program it.", "Strider legs, the play sequence, the gait learner and the on-device body model.", "It walks 1 m to its bed within 30 minutes of trying."],
      ["B3", "Weeks 7–8", "It puts itself to bed", "The Perch: charging, swivel, radar, IR, lights.", "It walks home when tired and turns to face you."],
      ["B4", "Weeks 9–10", "My AI runs my Bengaluru mornings", "Shortcuts, metro coach, bank-SMS ledger, Claude connector, Instamart, Alexa, Ather ride mode.", "A week of correct mornings."],
      ["B5", "Weeks 11–12", "I carry its soul on my keys", "Pixel keychain and the iOS companion (Bluetooth, tap-to-transfer).", "Its mood matches in 3 seconds; tap-to-transfer works."],
      ["B6", "Weeks 13–14", "My phone case has feelings", "Halo e-paper case.", "Two weeks on a charge."],
      ["B7", "Weeks 15–16", "It moved into my phone and walked to me", "Walker legs with the transferred gait.", "Transfer beats learning from scratch."],
      ["B8", "Weeks 17–18", "My robot met other robots", "Knowledge packs, the meet protocol, GrowBot soul import.", "It imports a GrowBot soul and shares a gait pack."],
      ["B9", "Ongoing", "30 days living with it", "Hardening, backups, the 30-day life review.", "Restore on a spare device works."]
    ];
    const box = $("#eps");
    EPS.forEach((e, i) => { const d = document.createElement("div"); d.className = "ep lift"; d.innerHTML = `<div class="n">${i + 1}</div><div class="glass"><h3><small>${e[0]} · ${e[1]}</small>“${e[2]}”</h3><p></p><div class="done"></div></div>`; d.querySelector("p").textContent = e[3]; d.querySelector(".done").textContent = "Done when: " + e[4]; box.append(d); });
  }

  /* ================= LAB ================= */
  if (PAGE === "lab") {
    const L = window.JeevoLearn;
    const BODIES = { strider: { legLengthMm: 110, massG: 580, opt: { amp: 26, freq: 1.1, phase: 2.0, bias: 3 }, max: 0.09, w: 1.9, h: 1.15 }, walker: { legLengthMm: 85, massG: 250, opt: { amp: 33, freq: 1.45, phase: 1.85, bias: 2 }, max: 0.12, w: 0.78, h: 1.6 } };
    let body = "strider", learner = null, fm = new L.ForwardModel(), running = null, dist = 0, runs = { strider: [], walker: [] }, curve = [], lastEvt = 0, fellFlash = 0, reached = null;
    const bestKnown = { strider: null };
    function simulate(g, b) {
      const o = BODIES[b].opt, d2 = ((g.amp - o.amp) / 9) ** 2 + ((g.freq - o.freq) / 0.35) ** 2 + ((g.phase - o.phase) / 0.9) ** 2 + ((g.bias - o.bias) / 6) ** 2;
      const speed = BODIES[b].max * Math.exp(-d2 / 2) + (Math.random() - 0.5) * 0.004;
      const fell = Math.random() < Math.min(0.85, Math.max(0, (g.amp - o.amp - 8) / 20) + Math.max(0, (g.freq - o.freq - 0.5)));
      return { progress: fell ? speed * 0.3 : speed, tiltVar: 0.05 + Math.abs(g.bias - o.bias) / 40 + (fell ? 0.5 : 0), fell, effort: g.amp / 45 };
    }
    function trainFM(g, b) {  // toy one-step body dynamics, differs per body → the model is surprised on a new body
      const o = BODIES[b].opt; let out = null;
      for (let i = 0; i < 6; i++) { const x = [Math.random() - .5, Math.random() - .5, Math.random() - .5, Math.random() - .5, g.amp / 45, g.freq / 2.6, g.phase / 6.3, g.bias / 15]; const y = [x[0] * .8 + x[4] * (o.amp / 45 - .3), x[1] * .8 - x[5] * .2, x[2] * .5 + (b === "walker" ? .25 : 0), x[3] * .5]; out = fm.learn(x, y); }
      return out;
    }
    function start(fromPrior) {
      if (running) clearInterval(running);
      const prior = fromPrior || { amp: 14, freq: 0.6, phase: 0.6, bias: -8 };
      learner = new L.GaitLearner(prior); curve = []; dist = 0; reached = null;
      $("#gaitnote").textContent = fromPrior ? "The soul moved into the Walker. It starts from the Strider's walk, scaled to its legs and weight." : "Learning from scratch on the " + (body === "strider" ? "Strider" : "Walker") + ".";
      let n = 0;
      running = setInterval(() => {
        for (let k = 0; k < (J.reduce ? 4 : 1); k++) {
          const cand = learner.propose(g => !(g.amp > BODIES[body].opt.amp + 14 && fm.errEMA < 0.01));
          const m = simulate(cand, body), score = L.strideScore(m), won = learner.report(cand, score), f = trainFM(cand, body);
          const bs = simulate(learner.best, body).progress; curve.push(bs);
          if (!reached && bs > BODIES[body].max * 0.9) reached = learner.trials;
          const now = Date.now();
          if (m.fell) { fellFlash = 1; if (now - lastEvt > 2500) { J.event("fell"); lastEvt = now; } }
          else if (won && learner.trials > 3 && now - lastEvt > 2500) { J.event("learned_step"); lastEvt = now; }
          if (f && f.surprise > 3 && now - lastEvt > 2500) { J.event("surprise"); lastEvt = now; }
          $("#trials").textContent = learner.trials + (reached ? " (90% at " + reached + ")" : "");
          $("#speed").textContent = (bs * 100).toFixed(1) + " cm/stride";
          $("#surprise").textContent = f ? f.surprise.toFixed(1) + "×" : "—";
          if (++n >= 160) { clearInterval(running); running = null; runs[body].push({ curve: curve.slice(), prior: !!fromPrior, reached }); if (body === "strider") bestKnown.strider = learner.best; $("#gaitnote").textContent += " Done: " + (reached ? "reached 90% of its best speed in " + reached + " trials." : "still learning."); break; }
        }
      }, J.reduce ? 60 : 140);
    }
    $$("#gaitctl [data-body]").forEach(b => b.onclick = () => { body = b.dataset.body; $$("#gaitctl [data-body]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    $("#learn").onclick = () => start(null);
    $("#transfer").onclick = () => {
      const from = bestKnown.strider || (learner && body === "strider" ? learner.best : BODIES.strider.opt);
      body = "walker"; $$("#gaitctl [data-body]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.body === "walker")));
      J.event("transfer_in");
      start(L.GaitLearner.transfer(from, BODIES.strider, BODIES.walker));
    };
    const c = $("#gait"), ctx = c.getContext("2d"), faceC = document.createElement("canvas"); faceC.width = faceC.height = 256; const fctx = faceC.getContext("2d");
    (function draw(t) {
      const { w, h } = fit(c); const ex = J.soul.express(), g = learner ? learner.best : { amp: 10, freq: 0.8, phase: 1.5, bias: 0 };
      const sp = learner ? simulate(g, body).progress : 0; dist += sp * 0.5;
      ctx.fillStyle = "#03050a"; ctx.fillRect(0, 0, w, h);
      const gy = h * 0.72, u = h / 9;
      ctx.strokeStyle = "rgba(150,170,220,.12)"; ctx.lineWidth = 1;
      for (let x = -((dist * 400) % 60); x < w; x += 60 * (w / 900)) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 40, h); ctx.stroke(); }
      ctx.strokeStyle = `hsl(${ex.hue} 90% 64% / .6)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      // body
      const B = BODIES[body], bw = B.w * u * 1.5, bh = B.h * u * 1.5, cx = w * 0.32, tt = t / 1000;
      const wv = 2 * Math.PI * g.freq * ex.gait.freqScale * tt, a1 = (g.amp * Math.sin(wv)) * Math.PI / 180 * 1.6, a2 = (g.amp * Math.sin(wv + g.phase)) * Math.PI / 180 * 1.6;
      const legL = (B.legLengthMm / 110) * u * 2.2, by = gy - legL - bh / 2 + Math.abs(Math.sin(wv)) * -4 * ex.bounce;
      [[-1, a1], [1, a2]].forEach(([s, a]) => { ctx.save(); ctx.translate(cx + s * bw / 2, by + bh * 0.1); ctx.rotate(a); ctx.fillStyle = "#1b2233"; ctx.fillRect(-5, 0, 10, legL); ctx.fillStyle = `hsl(${ex.hue} 90% 60%)`; ctx.fillRect(-12, legL - 5, 24, 7); ctx.restore(); });
      ctx.fillStyle = "#12151f"; ctx.strokeStyle = "rgba(150,170,220,.3)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - bw / 2, by - bh / 2, bw, bh, 10) : ctx.rect(cx - bw / 2, by - bh / 2, bw, bh); ctx.fill(); ctx.stroke();
      J.drawFace(fctx, 256, 256, ex, t, { bg: "#03050a" }); ctx.drawImage(faceC, cx - bw / 2 + 6, by - bh / 2 + 6, bw - 12, bh - 12);
      if (fellFlash > 0) { ctx.fillStyle = `rgba(255,90,120,${fellFlash * 0.25})`; ctx.fillRect(0, 0, w, h); fellFlash *= 0.9; }
      // chart
      const px = w * 0.58, pw = w * 0.38, ph = h * 0.42, py = h * 0.08;
      ctx.fillStyle = "rgba(255,255,255,.03)"; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = "rgba(180,190,215,.7)"; ctx.font = `${Math.round(h * 0.035)}px "Geist Mono", monospace`; ctx.fillText("best speed per trial", px + 8, py + h * 0.05);
      const maxV = 0.13, plot = (arr, col, dash) => { if (!arr.length) return; ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); arr.forEach((v, i) => { const x = px + (i / 160) * pw, y = py + ph - (v / maxV) * ph; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); };
      runs.strider.forEach(r => plot(r.curve, "rgba(160,170,200,.45)"));
      runs.walker.forEach(r => plot(r.curve, r.prior ? `hsl(${ex.hue} 90% 64% / .5)` : "rgba(160,170,200,.3)", r.prior ? [] : [4, 4]));
      plot(curve, `hsl(${ex.hue} 90% 64%)`);
      requestAnimationFrame(draw);
    })(0);

    // Jeevo Key (OLED) — same behaviour as firmware/keychain-oled
    const pc = $("#pixel"), pctx = pc.getContext("2d"); let sense = null, senseUntil = 0, taps = 0, lastTap = 0, downAt = 0;
    const feel = (n, ms) => { sense = n; senseUntil = performance.now() + ms; };
    pc.addEventListener("pointerdown", () => { downAt = performance.now(); });
    pc.addEventListener("pointerup", () => { const now = performance.now(), held = now - downAt;
      if (held > 900) { feel("cosy", 6000); J.event("petted"); return; }
      taps = now - lastTap < 450 ? taps + 1 : 1; lastTap = now;
      if (taps >= 3) { feel("dizzy", 4000); J.event("played"); taps = 0; } else { feel("tickled", 2000); J.event("petted"); } });
    $("#shake").onclick = () => { feel("dizzy", 4000); J.event("greeted"); };
    $("#hold").onclick = () => { J.claim(); };
    $("#takeLab").onclick = () => J.claim();
    (function kd(t) { J.oledFace(pctx, J.soul.express(), t, performance.now() < senseUntil ? sense : null); requestAnimationFrame(kd); })(0);

    // case e-paper
    const hc = $("#halo"), hctx = hc.getContext("2d"); let shown = null;
    function refresh() {
      const ex = J.soul.express(); if (shown === ex.label) return; shown = ex.label;
      let k = 0; const flick = setInterval(() => { hctx.fillStyle = k % 2 ? "#e9e6dc" : "#111"; hctx.fillRect(0, 0, 200, 200); if (++k > 3) { clearInterval(flick); J.drawFace(hctx, 200, 200, ex, 1, { style: "epaper", line: "metro 8:24 · rain 4pm" }); J.dither(hctx, 200, 200); $("#halonote").textContent = "Last refresh " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · " + ex.text; } }, J.reduce ? 1 : 120);
    }
    refresh(); J.onChange(refresh);
  }
})();
