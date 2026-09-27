// Jeevo face engine. Every feature is a spring, so moods melt into each other instead of switching.
// Eyes = tinted capsules with eyelids (top lid slants for angry/sad, a cheek lid from below makes ^ ^),
// plus squash-and-stretch, breathing, hops, head tilt, blush, sparkly eye shine, overlays
// (hearts, stars, spirals, > <) and little particles (zzz, notes, tears, sweat, steam…).
//   const f = JeevoFace.create(canvas); f.set("joyful"); f.poke(x, y); f.gaze(gx, gy, ms); f.react("laughing", 2500)
(function (root) {
  const P = o => Object.assign({ open: 1, w: 1, size: 1, round: .42, lidTH: 0, lidT: 0, lidB: 0, gx: 0, gy: 0, tilt: 0, mc: .3, mo: 0, mw: 1, cat: 0, wob: 0,
    blush: 0, bounce: .15, tempo: 1, shine: .6, wink: 0, asym: 0, shiver: 0, sway: 0, hue: 200, ov: "", fx: "", badge: "", talk: 0 }, o);

  // name: [label shown, params]
  const PRESETS = {
    content:    ["Content",    P({ hue: 150, mc: .35 })],
    joyful:     ["Joyful",     P({ hue: 42, lidB: .42, mc: .8, mo: .15, bounce: .5, tempo: 1.3, blush: .35, fx: "notes" })],
    excited:    ["Excited",    P({ hue: 20, size: 1.1, open: 1.08, mc: .9, mo: .55, bounce: .9, tempo: 1.9, shine: 1, blush: .3, fx: "sparkles" })],
    proud:      ["Proud",      P({ hue: 50, lidB: .35, lidTH: .16, gy: -.25, tilt: -.08, mc: .7, fx: "stars" })],
    curious:    ["Curious",    P({ hue: 195, size: 1.05, asym: .18, gx: .35, gy: -.1, tilt: .14, mc: .1, mw: .6, mo: .12, shine: .9, badge: "?" })],
    sleepy:     ["Sleepy",     P({ hue: 245, open: .38, lidTH: .42, gy: .25, mc: .1, mw: .7, bounce: .05, tempo: .5, fx: "zzz" })],
    lonely:     ["Lonely",     P({ hue: 225, open: .85, lidTH: .28, lidT: -.55, gy: .35, tilt: .1, mc: -.35, mw: .7, bounce: .04 })],
    uneasy:     ["Uneasy",     P({ hue: 300, open: .9, lidTH: .2, lidT: -.35, mc: -.2, wob: .6, shiver: .25, fx: "sweat" })],
    grumpy:     ["Grumpy",     P({ hue: 0, lidTH: .38, lidT: .7, mc: -.45, mw: .8, bounce: .04, badge: "vein" })],
    dizzy:      ["Dizzy",      P({ hue: 280, ov: "spiral", mc: -.1, wob: .8, sway: 1, fx: "stars" })],
    tickled:    ["Tickled",    P({ hue: 330, ov: "squeeze", mc: 1, mo: .6, blush: .7, bounce: 1, tempo: 2.4 })],
    cosy:       ["Cosy",       P({ hue: 30, open: .45, lidB: .45, lidTH: .25, mc: .5, cat: 1, blush: .6, bounce: .08, tempo: .6 })],
    hungry:     ["Hungry",     P({ hue: 35, open: .9, lidTH: .15, lidT: -.3, gy: .3, mc: -.05, mo: .28, mw: .55, shiver: .1 })],
    worried:    ["Worried",    P({ hue: 210, lidTH: .18, lidT: -.5, mc: -.25, wob: .8, mw: .7, fx: "sweat" })],
    focused:    ["Focused",    P({ hue: 200, open: .55, lidTH: .3, lidT: .25, mc: 0, mw: .5, bounce: 0, tempo: .8 })],
    hot:        ["Too hot",    P({ hue: 12, open: .6, lidTH: .3, mc: -.2, mo: .35, shiver: .1, fx: "steam" })],
    love:       ["Love",       P({ hue: 345, ov: "heart", mc: .9, mo: .2, blush: .8, bounce: .6, tempo: 1.4, fx: "hearts" })],
    listening:  ["Listening",  P({ hue: 200, size: 1.08, open: 1.1, tilt: .12, mc: .2, mw: .6, badge: "waves" })],
    thinking:   ["Thinking",   P({ hue: 190, gx: .5, gy: -.55, asym: .12, lidTH: .12, mc: 0, mw: .5, badge: "dots" })],
    talking:    ["Talking",    P({ hue: 42, lidB: .15, mc: .5, talk: 1 })],
    surprised:  ["Surprised",  P({ hue: 50, size: 1.18, open: 1.25, round: .5, mo: .75, mw: .42, mc: 0, badge: "!" })],
    looking:    ["Looking",    P({ hue: 195, size: 1.1, open: 1.1, shine: 1, mc: .1, mw: .5 })],
    dozing:     ["Dozing",     P({ hue: 245, open: .04, mc: .1, mw: .6, bounce: .04, tempo: .4, fx: "zzz" })],
    shy:        ["Shy",        P({ hue: 340, size: .95, open: .8, lidB: .4, gx: -.4, gy: .3, tilt: .12, mc: .45, mw: .55, blush: 1 })],
    laughing:   ["Laughing",   P({ hue: 42, ov: "squeeze", mc: 1, mo: .85, mw: 1.2, blush: .5, bounce: 1, tempo: 2.6, fx: "notes" })],
    confused:   ["Confused",   P({ hue: 270, asym: .3, lidTH: .15, lidT: -.2, tilt: .2, mc: -.05, wob: .5, mw: .6, badge: "?" })],
    scared:     ["Scared",     P({ hue: 260, size: .9, open: 1.2, round: .5, lidT: -.3, lidTH: .1, mc: -.3, wob: 1, mo: .2, shiver: 1, fx: "sweat" })],
    crying:     ["Crying",     P({ hue: 215, open: .7, lidTH: .3, lidT: -.6, mc: -.6, mo: .3, wob: .7, shiver: .3, fx: "tears" })],
    sad:        ["Sad",        P({ hue: 220, lidTH: .28, lidT: -.6, gy: .25, mc: -.5, mw: .7, bounce: .03 })],
    bored:      ["Bored",      P({ hue: 180, open: .5, lidTH: .4, gx: .45, mc: -.05, mw: .8, tempo: .4, bounce: .02, fx: "puff" })],
    smug:       ["Smug",       P({ hue: 280, lidTH: .35, lidT: .12, lidB: .25, gx: .3, asym: -.1, tilt: -.1, mc: .55, cat: 1 })],
    wink:       ["Wink",       P({ hue: 42, wink: 1, lidB: .3, tilt: -.12, mc: .8, mo: .2, blush: .3, fx: "sparkles" })],
    amazed:     ["Amazed",     P({ hue: 50, ov: "star", size: 1.2, open: 1.2, shine: 1, mo: .45, mw: .6, mc: .4, bounce: .6, tempo: 1.4, fx: "sparkles" })],
    determined: ["Determined", P({ hue: 15, open: .85, lidTH: .3, lidT: .45, mc: .2, mw: .6 })],
    relieved:   ["Relieved",   P({ hue: 160, open: .6, lidB: .5, mc: .5, fx: "puff" })],
    sulky:      ["Sulky",      P({ hue: 5, lidTH: .3, lidT: .35, gx: -.45, gy: .15, tilt: -.12, mc: -.3, mw: .45, blush: .4 })],
    angry:      ["Angry",      P({ hue: 0, lidTH: .45, lidT: .9, mc: -.6, mo: .3, mw: .9, shiver: .3, fx: "steam", badge: "vein" })],
    grateful:   ["Grateful",   P({ hue: 40, lidB: .5, tilt: .1, mc: .7, blush: .5, fx: "hearts" })]
  };
  const NUM = Object.keys(PRESETS.content[1]).filter(k => typeof PRESETS.content[1][k] === "number");

  // A damped spring: slightly under-damped so things land with a tiny wobble.
  const spring = (x, k = 140, c = 15) => ({ x, v: 0, t: x, k, c });
  // Sub-stepped so a slow frame on an old tablet can't make a stiff spring explode.
  const step = (s, dt) => { const n = Math.ceil(dt / .004), h = dt / n; for (let i = 0; i < n; i++) { s.v += (s.k * (s.t - s.x) - s.c * s.v) * h; s.x += s.v * h; } if (!isFinite(s.x)) { s.x = s.t; s.v = 0; } return s.x; };

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const S = {}; for (const k of NUM) S[k] = spring(PRESETS.content[1][k], k.startsWith("lid") ? 170 : 120, k.startsWith("lid") ? 20 : 14);
    const sx = spring(1, 300, 9), sy = spring(1, 300, 9), blink = spring(0, 1100, 45);
    const ovA = {}, badgeA = {}; ["heart", "spiral", "squeeze", "star"].forEach(k => ovA[k] = spring(0, 90, 13)); ["?", "!", "vein", "dots", "waves"].forEach(k => badgeA[k] = spring(0, 110, 13));
    let cur = "content", react = null, reactUntil = 0, gazeT = null, gazeUntil = 0, look = { x: 0, y: 0 }, lookS = { x: spring(0, 160, 17), y: spring(0, 160, 17) };
    let nextBlink = 1500, nextSacc = 1000, sacc = { x: 0, y: 0 }, parts = [], last = performance.now(), talkUntil = 0, dprCap = opts.dpr || 1.5, slow = 0;

    function fit() { const r = Math.min(devicePixelRatio || 1, dprCap); canvas.width = canvas.clientWidth * r; canvas.height = canvas.clientHeight * r; }
    addEventListener("resize", fit); fit();

    const name = () => (react && performance.now() < reactUntil ? react : cur);
    function target(n) {
      const p = (PRESETS[n] || PRESETS.content)[1];
      for (const k of NUM) S[k].t = p[k];
      for (const k in ovA) ovA[k].t = p.ov === k ? 1 : 0;
      for (const k in badgeA) badgeA[k].t = p.badge === k ? 1 : 0;
    }
    function boing(a = 1) { sy.v += 5 * a; sx.v -= 3 * a; }
    function set(n) { if (!PRESETS[n]) n = "content"; if (n === cur) return; cur = n; if (name() === n) { target(n); boing(.8); } }
    function doReact(n, ms = 2500) { if (!PRESETS[n]) return; react = n; reactUntil = performance.now() + ms; target(n); boing(1.2); }

    // ---------- drawing helpers ----------
    const rr = (x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    function heartPath(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * .9); ctx.bezierCurveTo(x - s * 1.5, y - s * .1, x - s * .65, y - s * 1.15, x, y - s * .38); ctx.bezierCurveTo(x + s * .65, y - s * 1.15, x + s * 1.5, y - s * .1, x, y + s * .9); ctx.closePath(); }
    function starPath(x, y, r, pts = 5, inner = .45) { ctx.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / pts, rr2 = i % 2 ? r * inner : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); }
    function sparkle(x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
    const V = k => S[k].x;

    function eye(cx, cy, w, h, side, t, s) {
      const hue = V("hue"), asym = 1 + V("asym") * side * -1, wink = side > 0 ? V("wink") : 0;
      let ew = w * V("w") * V("size") * asym, eh = h * Math.max(.02, V("open")) * V("size") * asym * (1 - blink.x * .96) * (1 - wink * .97);
      const base = 1 - Math.min(1, ovA.heart.x + ovA.spiral.x + ovA.squeeze.x + ovA.star.x);
      // closed eye: a soft arc (smiling if the mouth smiles)
      if (eh < h * .1 && base > .05) {
        ctx.globalAlpha = base; ctx.strokeStyle = `hsl(${hue},70%,92%)`; ctx.lineWidth = w * .13; ctx.lineCap = "round";
        const up = V("mc") > .2 || wink > .5 ? -1 : .4; ctx.beginPath(); ctx.moveTo(cx - ew * .45, cy); ctx.quadraticCurveTo(cx, cy + up * w * .28, cx + ew * .45, cy); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (base > .01) {
        ctx.save(); ctx.globalAlpha = base;
        rr(cx - ew / 2, cy - eh / 2, ew, eh, ew * V("round")); ctx.clip();
        const g = ctx.createLinearGradient(0, cy - eh / 2, 0, cy + eh / 2); g.addColorStop(0, `hsl(${hue},80%,97%)`); g.addColorStop(1, `hsl(${hue},70%,80%)`);
        ctx.fillStyle = g; ctx.fillRect(cx - ew, cy - eh, ew * 2, eh * 2);
        // sparkle shine (drifts a little with the gaze)
        const sh = V("shine"); if (sh > .05) { ctx.fillStyle = `rgba(255,255,255,${.95 * sh})`; ctx.beginPath(); ctx.arc(cx - ew * .18 + lookS.x.x * ew * .08, cy - eh * .22, ew * .15, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx + ew * .14, cy + eh * .05, ew * .07, 0, 7); ctx.fill(); }
        // lids are drawn in the background colour, inside the eye only
        ctx.fillStyle = "#000";
        const top = cy - eh / 2, lt = V("lidTH") * eh, sl = V("lidT") * eh * .36, inner = -side;          // inner edge faces the nose
        const yIn = top + lt + sl, yOut = top + lt - sl, xIn = cx + inner * ew * .6, xOut = cx - inner * ew * .6;
        ctx.beginPath(); ctx.moveTo(xIn, top - eh); ctx.lineTo(xIn, yIn); ctx.lineTo(xOut, yOut); ctx.lineTo(xOut, top - eh); ctx.fill();
        const lb = V("lidB"); if (lb > .01) { const R = ew * 1.05; ctx.beginPath(); ctx.ellipse(cx, cy + eh / 2 + R * .75 - lb * eh * 1.05, R, R * .75, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      // overlays that replace the eye
      const H = ovA.heart.x, SP = ovA.spiral.x, SQ = ovA.squeeze.x, ST = ovA.star.x;
      if (H > .01) { const k = 1 + Math.sin(t / 160) * .08; ctx.globalAlpha = H; ctx.fillStyle = "#ff4d7e"; heartPath(cx, cy, w * .55 * k * (.6 + .4 * H)); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(cx - w * .2, cy - w * .2, w * .08, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      if (SP > .01) { ctx.globalAlpha = SP; ctx.strokeStyle = "#fff"; ctx.lineWidth = w * .07; ctx.lineCap = "round"; ctx.beginPath(); for (let a = 0; a < 17; a += .15) { const r = a * w * .03, an = a * side + t / 160 * side; ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } ctx.stroke(); ctx.globalAlpha = 1; }
      if (SQ > .01) { ctx.globalAlpha = SQ; ctx.strokeStyle = "#fff"; ctx.lineWidth = w * .14; ctx.lineCap = ctx.lineJoin = "round"; const d = w * .38 * side; ctx.beginPath(); ctx.moveTo(cx + d, cy - w * .32); ctx.lineTo(cx - d, cy); ctx.lineTo(cx + d, cy + w * .32); ctx.stroke(); ctx.globalAlpha = 1; }
      if (ST > .01) { ctx.globalAlpha = ST; ctx.fillStyle = "#ffd84d"; starPath(cx, cy, w * .6 * (1 + Math.sin(t / 140) * .06)); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - w * .12, cy - w * .14, w * .07, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    }

    function mouth(cx, my, s, t) {
      const mw = s * .085 * V("mw"), mc = V("mc"), wob = V("wob"), talking = V("talk") > .5 || t < talkUntil;
      let mo = V("mo"); if (talking) mo = Math.max(mo, (Math.sin(t / 75) * .5 + .5) * (.35 + .25 * Math.sin(t / 230)));
      ctx.strokeStyle = "#fff"; ctx.lineWidth = s * .012; ctx.lineCap = ctx.lineJoin = "round";
      const cat = V("cat");
      if (cat > .5) {                                                   // :3
        ctx.globalAlpha = (cat - .5) * 2; const q = mw * .5;
        ctx.beginPath(); ctx.arc(cx - q, my, q, .1 * Math.PI, .9 * Math.PI); ctx.moveTo(cx + q * 2, my); ctx.arc(cx + q, my, q, .1 * Math.PI, .9 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
        if (cat > .95) return;
      }
      const pts = 18, curve = mc * s * .045;
      const yAt = (i, deeper) => { const u = i / pts * 2 - 1; return my - curve * .35 + curve * (1 - u * u) + (deeper || 0) * (1 - u * u) + Math.sin(u * 9 + t / 90) * wob * s * .006; };
      if (mo > .06) {
        // open mouth: a D-shaped grin (upside down when unhappy), dark inside, pink tongue
        const d = mo * s * .085, ow = mw * (.75 + .35 * mo), up = mc >= 0 ? 1 : -1, edge = my - up * d * .2;
        const bulge = u => Math.pow(Math.max(0, 1 - u * u), .7) * d * up;
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) { const u = i / pts * 2 - 1; ctx.lineTo(cx + u * ow, edge + Math.sin(u * 9 + t / 90) * wob * s * .004 + mc * s * .012 * (1 - u * u)); }
        for (let i = pts; i >= 0; i--) { const u = i / pts * 2 - 1; ctx.lineTo(cx + u * ow, edge + bulge(u) + mc * s * .012 * (1 - u * u)); }
        ctx.closePath(); ctx.fillStyle = "#3b0f1c"; ctx.fill();
        if (mo > .3) { ctx.save(); ctx.clip(); ctx.fillStyle = "#ff6b8a"; ctx.beginPath(); ctx.ellipse(cx, edge + bulge(0) * .95, ow * .55, d * .45, 0, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.stroke();
      } else { ctx.beginPath(); for (let i = 0; i <= pts; i++) ctx.lineTo(cx - mw + 2 * mw * i / pts, yAt(i)); ctx.stroke(); }
    }

    // ---------- particles and badges ----------
    function emit(fx, cx, cy, s, eyeX, eyeY) {
      const r = Math.random, add = o => parts.push(Object.assign({ age: 0, rot: (r() - .5) * .6 }, o));
      const rate = { notes: .025, sparkles: .06, stars: .03, zzz: .012, hearts: .04, sweat: .012, tears: .08, steam: .05, puff: .012 }[fx] || 0;
      if (r() > rate) return;
      if (fx === "notes") add({ k: "note", x: cx + (r() > .5 ? 1 : -1) * s * (.42 + r() * .1), y: cy - s * .05, vx: (r() - .5) * 20, vy: -45, life: 2.4, size: s * .05 });
      if (fx === "sparkles" || fx === "stars") add({ k: fx === "stars" ? "star" : "spark", x: cx + (r() - .5) * s * 1.1, y: cy + (r() - .6) * s * .6, vx: 0, vy: -8, life: 1.1, size: s * (.018 + r() * .03) });
      if (fx === "zzz") add({ k: "z", x: cx + s * .36, y: cy - s * .2, vx: 22, vy: -30, life: 3, size: s * .04 });
      if (fx === "hearts") add({ k: "heart", x: cx + (r() - .5) * s * .9, y: cy + s * .1, vx: (r() - .5) * 25, vy: -60, life: 2.2, size: s * (.025 + r() * .02) });
      if (fx === "sweat") add({ k: "sweat", x: cx + s * .4, y: cy - s * .22, vx: 0, vy: 18, life: 2, size: s * .03 });
      if (fx === "tears") { const sd = r() > .5 ? 1 : -1; add({ k: "tear", x: eyeX * sd + cx + sd * s * .02, y: eyeY, vx: sd * 30, vy: 20, g: 420, life: 1.1, size: s * .022 }); }
      if (fx === "steam") { const sd = r() > .5 ? 1 : -1; add({ k: "puff", x: cx + sd * s * .45, y: cy - s * .28, vx: sd * 25, vy: -50, life: 1.2, size: s * .03 }); }
      if (fx === "puff") add({ k: "puff", x: cx + s * .12, y: cy + s * .22, vx: 40, vy: -10, life: 1.6, size: s * .035 });
    }
    function drawParts(dt) {
      parts = parts.filter(p => (p.age += dt) < p.life);
      for (const p of parts) {
        p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const a = Math.min(1, (p.life - p.age) * 2, p.age * 6); ctx.globalAlpha = a;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.age * 4) * .15);
        if (p.k === "note") { ctx.fillStyle = `hsl(${V("hue")},90%,75%)`; ctx.font = `${p.size * 1.6}px sans-serif`; ctx.fillText(p.age % 1 > .5 ? "♪" : "♫", 0, 0); }
        if (p.k === "spark") { ctx.fillStyle = "#fff"; sparkle(0, 0, p.size * (1 - p.age / p.life * .5)); }
        if (p.k === "star") { ctx.fillStyle = "#ffd84d"; starPath(0, 0, p.size); ctx.fill(); }
        if (p.k === "z") { ctx.fillStyle = "#9fb4ff"; ctx.font = `600 ${p.size * (1 + p.age * .5)}px Inter, sans-serif`; ctx.fillText("z", 0, 0); }
        if (p.k === "heart") { ctx.fillStyle = "#ff4d7e"; heartPath(0, 0, p.size); ctx.fill(); }
        if (p.k === "sweat" || p.k === "tear") { ctx.fillStyle = "#7cc8ff"; ctx.beginPath(); ctx.moveTo(0, -p.size * 1.4); ctx.quadraticCurveTo(p.size, 0, 0, p.size); ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.4); ctx.fill(); }
        if (p.k === "puff") { ctx.fillStyle = "rgba(230,230,240,.7)"; ctx.beginPath(); ctx.arc(0, 0, p.size * (1 + p.age), 0, 7); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function badges(cx, cy, s, t) {
      const bx = cx + s * .52, by = cy - s * .32;
      if (badgeA["?"].x > .01) { ctx.globalAlpha = badgeA["?"].x; ctx.fillStyle = "#fff"; ctx.font = `600 ${s * .11}px Inter, sans-serif`; ctx.fillText("?", bx, by + Math.sin(t / 300) * s * .015); }
      if (badgeA["!"].x > .01) { ctx.globalAlpha = badgeA["!"].x; ctx.fillStyle = "#ffd84d"; ctx.font = `700 ${s * .12 * (0.7 + .3 * badgeA["!"].x)}px Inter, sans-serif`; ctx.fillText("!", bx, by); }
      if (badgeA.vein.x > .01) { ctx.globalAlpha = badgeA.vein.x; ctx.strokeStyle = "#ff4d4d"; ctx.lineWidth = s * .012; const k = s * .035 * (1 + Math.sin(t / 120) * .15), x = bx - s * .05, y = by - s * .02; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(x + a * k * .3, y + b * k); ctx.quadraticCurveTo(x + a * k * .3, y + b * k * .3, x + a * k, y + b * k * .3); ctx.stroke(); } }
      if (badgeA.dots.x > .01) { ctx.globalAlpha = badgeA.dots.x; ctx.fillStyle = "#fff"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(bx - s * .06 + i * s * .045, by - Math.max(0, Math.sin(t / 200 - i * .8)) * s * .02, s * .012, 0, 7); ctx.fill(); } }
      if (badgeA.waves.x > .01) { ctx.globalAlpha = badgeA.waves.x; ctx.strokeStyle = "#fff"; ctx.lineWidth = s * .008; for (let i = 0; i < 3; i++) { const ph = (t / 600 + i / 3) % 1; ctx.globalAlpha = badgeA.waves.x * (1 - ph); ctx.beginPath(); ctx.arc(cx - s * .5, cy, s * (.05 + ph * .12), -.6, .6); ctx.stroke(); } }
      ctx.globalAlpha = 1;
    }

    // ---------- the loop ----------
    target("content");
    function frame(now) {
      try { draw(now); } catch (e) { ctx.setTransform(1, 0, 0, 1, 0, 0); if (!frame.warned) { frame.warned = 1; console.warn("face", e); } }
      requestAnimationFrame(frame);
    }
    function draw(now) {
      let dt = Math.min(.05, (now - last) / 1000); last = now;
      slow = slow * .95 + (dt > .034 ? 1 : 0) * .05; if (slow > .6 && dprCap > 1) { dprCap = 1; fit(); }   // an old tablet drops to 1× pixels
      if (react && now >= reactUntil) { react = null; target(cur); boing(.5); }
      for (const k of NUM) step(S[k], dt);
      [sx, sy].forEach(q => step(q, dt)); for (const k in ovA) step(ovA[k], dt); for (const k in badgeA) step(badgeA[k], dt);
      // blinks: random, sometimes double; never while an overlay replaces the eyes
      if (now > nextBlink) { blink.t = 1; setTimeout(() => blink.t = 0, 90); const tempo = V("tempo"); nextBlink = now + (Math.random() < .2 ? 260 : 1800 + Math.random() * 3800 / Math.max(.4, tempo)); }
      step(blink, dt); blink.x = Math.max(0, Math.min(1, blink.x));
      // gaze: finger or camera wins, else the mood's gaze plus little saccades
      if (now > nextSacc) { sacc = { x: (Math.random() - .5) * .5, y: (Math.random() - .5) * .3 }; nextSacc = now + 900 + Math.random() * 2600; }
      const g = gazeT && now < gazeUntil ? gazeT : { x: V("gx") + sacc.x * (1 - V("gx") ** 2), y: V("gy") + sacc.y };
      lookS.x.t = g.x; lookS.y.t = g.y; step(lookS.x, dt); step(lookS.y, dt);

      const W = canvas.width, H = canvas.height, s = Math.min(W, H * 1.2);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      const hue = V("hue"), glow = ctx.createRadialGradient(W / 2, H * .42, s * .05, W / 2, H * .42, s * .75);
      glow.addColorStop(0, `hsla(${hue},85%,55%,.13)`); glow.addColorStop(1, "hsla(0,0%,0%,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

      const tempo = V("tempo"), hop = Math.pow(Math.abs(Math.sin(now / 1000 * Math.PI * tempo)), 2) * V("bounce") * s * .03;
      const breathe = 1 + Math.sin(now / 1000 * 1.6) * .012, sh = V("shiver") * s * .004;
      const sway = V("sway") * Math.sin(now / 280) * .14 + Math.sin(now / 2300) * .02;
      const cx = W / 2 + (Math.random() - .5) * sh, cy = H * .42 - hop + (Math.random() - .5) * sh;
      ctx.translate(cx, cy); ctx.rotate(V("tilt") + sway); ctx.scale(sx.x * breathe, sy.x * breathe); ctx.translate(-cx, -cy);

      const w = s * .15, h = s * .25, gap = s * .15, ex = lookS.x.x * w * .35, ey = lookS.y.x * h * .18;
      [-1, 1].forEach(side => eye(cx + side * (gap + w / 2) + ex, cy + ey, w, h, side, now, s));
      // blush
      const bl = V("blush"); if (bl > .02) {
        ctx.fillStyle = `rgba(255,105,140,${.45 * bl})`;
        [-1, 1].forEach(side => { ctx.beginPath(); ctx.ellipse(cx + side * (gap + w * .85) + ex * .5, cy + h * .42, w * .42, w * .2, 0, 0, 7); ctx.fill();
          if (bl > .75) { ctx.strokeStyle = `rgba(255,150,175,${(bl - .75) * 3})`; ctx.lineWidth = s * .005; for (let i = -1; i <= 1; i++) { const x = cx + side * (gap + w * .85) + i * w * .16; ctx.beginPath(); ctx.moveTo(x + w * .05, cy + h * .36); ctx.lineTo(x - w * .05, cy + h * .48); ctx.stroke(); } } });
      }
      mouth(cx + ex * .3, cy + s * .22 + ey * .3, s, now);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fx = (PRESETS[name()] || PRESETS.content)[1].fx; if (fx) emit(fx, cx, cy, s, gap + w / 2, cy + h * .3);
      drawParts(dt); badges(cx, cy, s, now);
    }
    requestAnimationFrame(frame);

    return {
      set, react: doReact, boing, presets: PRESETS, debug: () => ({ S, blink, sx, sy, lookS }),
      get name() { return name(); }, get label() { return (PRESETS[name()] || PRESETS.content)[0]; },
      gaze(x, y, ms = 1200) { gazeT = { x: Math.max(-1.3, Math.min(1.3, x)), y: Math.max(-1, Math.min(1, y)) }; gazeUntil = performance.now() + ms; },
      poke() { sy.x = .82; sx.x = 1.12; },
      talk(ms) { talkUntil = performance.now() + ms; }
    };
  }
  root.JeevoFace = { create, PRESETS };
})(typeof window !== "undefined" ? window : globalThis);
