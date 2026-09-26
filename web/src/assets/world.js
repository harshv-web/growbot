/* Jeevo 3D world (three.js r128 global). Procedural bodies that wear the live soul's face. */
(function () {
  "use strict";
  const T = window.THREE, J = window.Jeevo;
  if (!T) { window.JeevoWorld = null; return; }

  function faceTexture(style, size = 256, line, h) {
    const c = document.createElement("canvas"); c.width = size; c.height = h || size;
    const ctx = c.getContext("2d"), tex = new T.CanvasTexture(c);
    tex.anisotropy = 4;
    if (style === "oled") { tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; }
    return { tex, canvas: c, draw(t) {
      const ex = J.soul.express();
      if (style === "oled") { J.oledFace(ctx, ex, t); }
      else { J.drawFace(ctx, c.width, c.height, ex, t, { style: style === "epaper" ? "epaper" : style, line, bg: "#000", dy: typeof line === "function" ? -0.08 : 0 }); if (style === "epaper") J.dither(ctx, c.width, c.height); }
      if (typeof line === "function") { ctx.fillStyle = "#fff"; ctx.font = `500 ${Math.round(c.height * 0.07)}px Inter, Arial, sans-serif`; ctx.textAlign = "center"; ctx.fillText(line(), c.width / 2, c.height * 0.9); }
      tex.needsUpdate = true; } };
  }
  function roundedSlab(w, h, d, r, mat) {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.25, bevelSize: Math.min(r * 0.4, d * 0.4), bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -d / 2);
    return new T.Mesh(g, mat);
  }
  const shell = hue => new T.MeshStandardMaterial({ color: 0x12151f, metalness: 0.55, roughness: 0.35 });
  const accentMat = () => new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, metalness: 0.3, roughness: 0.4 });

  function legs(group, span, len, thick) {
    const legsArr = [];
    [-1, 1].forEach(side => {
      const hip = new T.Group(); hip.position.set(side * span / 2, 0, 0.02); group.add(hip);
      const leg = new T.Mesh(new T.BoxGeometry(thick, len, thick * 1.6), shell()); leg.position.y = -len / 2; hip.add(leg);
      const foot = new T.Mesh(new T.BoxGeometry(thick * 2.4, thick * 0.6, thick * 3.2), accentMat()); foot.position.set(0, -len, thick * 0.5); hip.add(foot);
      const servo = new T.Mesh(new T.BoxGeometry(thick * 1.8, thick * 1.8, thick * 1.8), new T.MeshStandardMaterial({ color: 0x1b2030, metalness: 0.6, roughness: 0.3 })); hip.add(servo);
      legsArr.push({ hip, foot: foot.material, side });
    });
    return legsArr;
  }

  // Each builder returns { group, update(t, ex) }
  const BUILD = {
    strider() {
      const g = new T.Group(), body = roundedSlab(1.9, 1.15, 0.09, 0.09, shell()); g.add(body);
      const f = faceTexture("color"); const scr = new T.Mesh(new T.PlaneGeometry(1.72, 1.0), new T.MeshBasicMaterial({ map: f.tex })); scr.position.z = 0.075; g.add(scr);
      const L = legs(g, 2.02, 0.95, 0.07); g.position.y = 0.4;
      return { group: g, legs: L, update(t, ex) { f.draw(t); walk(L, t, ex, 1); g.position.y = 0.42 + bounce(t, ex) * 0.06; } };
    },
    walker() {
      const g = new T.Group(), body = roundedSlab(0.78, 1.6, 0.08, 0.12, shell()); g.add(body);
      const f = faceTexture("color"); const scr = new T.Mesh(new T.PlaneGeometry(0.68, 1.42), new T.MeshBasicMaterial({ map: f.tex })); scr.position.z = 0.066; g.add(scr);
      const L = legs(g, 0.9, 0.72, 0.055);
      return { group: g, legs: L, update(t, ex) { f.draw(t); walk(L, t, ex, 1.4); g.position.y = 0.28 + bounce(t, ex) * 0.05; } };
    },
    pixel() {
      const g = new T.Group();
      const puck = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.2, 64), shell()); puck.rotation.x = Math.PI / 2; g.add(puck);
      const f = faceTexture("round"); const scr = new T.Mesh(new T.CircleGeometry(0.52, 64), new T.MeshBasicMaterial({ map: f.tex })); scr.position.z = 0.102; g.add(scr);
      const ring = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 12, 40), new T.MeshStandardMaterial({ color: 0xb8c0d0, metalness: 0.9, roughness: 0.2 })); ring.position.y = 0.78; g.add(ring);
      const bail = new T.Mesh(new T.BoxGeometry(0.12, 0.16, 0.08), shell()); bail.position.y = 0.66; g.add(bail);
      return { group: g, update(t, ex) { f.draw(t); g.rotation.z = Math.sin(t / 900 * ex.tempo) * 0.08; } };
    },
    halo() {
      const g = new T.Group(), body = roundedSlab(0.82, 1.66, 0.12, 0.13, new T.MeshStandardMaterial({ color: 0x1a1e2b, metalness: 0.2, roughness: 0.7 })); g.add(body);
      const f = faceTexture("epaper", 200, "metro 8:24"); const ep = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), new T.MeshBasicMaterial({ map: f.tex })); ep.position.set(0, -0.2, 0.1); g.add(ep);
      const bump = roundedSlab(0.34, 0.34, 0.06, 0.08, new T.MeshStandardMaterial({ color: 0x0c0e15, metalness: 0.6, roughness: 0.3 })); bump.position.set(-0.17, 0.52, 0.11); g.add(bump);
      const ring = new T.Mesh(new T.TorusGeometry(0.22, 0.012, 8, 60), new T.MeshStandardMaterial({ color: 0x7a8295, metalness: 0.9, roughness: 0.2 })); ring.position.set(0, 0.24, 0.096); g.add(ring);
      let last = 0;
      return { group: g, update(t) { if (t - last > 1200) { f.draw(t); last = t; } } };   // e-paper refreshes rarely
    },
    key() {
      const g = new T.Group();
      const body = roundedSlab(1.25, 0.82, 0.22, 0.2, new T.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.35, roughness: 0.45 })); g.add(body);
      const f = faceTexture("oled", 128, null, 64); const scr = new T.Mesh(new T.PlaneGeometry(0.96, 0.48), new T.MeshBasicMaterial({ map: f.tex })); scr.position.z = 0.172; g.add(scr);
      const bez = new T.Mesh(new T.PlaneGeometry(1.04, 0.56), new T.MeshBasicMaterial({ color: 0x000000 })); bez.position.z = 0.17; g.add(bez);
      const ring = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 12, 40), new T.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.95, roughness: 0.2 })); ring.position.set(-0.52, 0.52, 0); g.add(ring);
      const pad = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.02, 24), new T.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 })); pad.rotation.x = Math.PI / 2; pad.position.set(0.5, -0.3, 0.14); g.add(pad);
      return { group: g, update(t, ex) { f.draw(t); g.rotation.z = Math.sin(t / 1100 * ex.tempo) * 0.05; } };
    },
    tablet() {
      const g = new T.Group(), body = roundedSlab(1.9, 1.15, 0.09, 0.09, shell()); g.add(body);
      const f = faceTexture("color", 512, () => J.dayLine ? J.dayLine() : "Morning. Chai first.", 310); const scr = new T.Mesh(new T.PlaneGeometry(1.72, 1.04), new T.MeshBasicMaterial({ map: f.tex })); scr.position.z = 0.075; g.add(scr);
      const stand = new T.Mesh(new T.BoxGeometry(0.5, 0.08, 0.7), shell()); stand.position.set(0, -0.64, -0.25); g.add(stand);
      const leg = new T.Mesh(new T.BoxGeometry(0.4, 0.7, 0.06), shell()); leg.position.set(0, -0.35, -0.25); leg.rotation.x = -0.35; g.add(leg);
      g.rotation.x = -0.12;
      return { group: g, update(t) { f.draw(t); } };
    },
    scooter() {
      const g = new T.Group(), paint = new T.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.25, roughness: 0.35 }), dark = new T.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.4, roughness: 0.5 });
      const sh = new T.Shape();   // side profile, metres-ish
      sh.moveTo(-1.1, 0.25); sh.lineTo(0.35, 0.25); sh.quadraticCurveTo(0.62, 0.3, 0.78, 0.62); sh.lineTo(0.95, 1.25); sh.lineTo(0.8, 1.28); sh.lineTo(0.6, 0.72);
      sh.quadraticCurveTo(0.5, 0.52, 0.25, 0.5); sh.lineTo(-0.45, 0.5); sh.quadraticCurveTo(-0.55, 0.78, -0.75, 0.82); sh.lineTo(-1.25, 0.8); sh.quadraticCurveTo(-1.35, 0.55, -1.1, 0.25);
      const body = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 18 }), paint); body.position.z = -0.18; g.add(body);
      const seat = new T.Mesh(new T.BoxGeometry(0.75, 0.08, 0.34), dark); seat.position.set(-0.85, 0.86, 0); g.add(seat);
      [[-0.95, 0.28], [0.9, 0.28]].forEach(([x, y]) => { const w = new T.Mesh(new T.TorusGeometry(0.24, 0.07, 16, 40), dark); w.position.set(x, y, 0); g.add(w); const hub = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.12, 20), new T.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.3 })); hub.rotation.x = Math.PI / 2; hub.position.set(x, y, 0); g.add(hub); g["wheel" + (x > 0 ? "F" : "R")] = w; });
      const bar = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.8, 12), dark); bar.rotation.x = Math.PI / 2; bar.position.set(0.9, 1.28, 0); g.add(bar);
      const c = document.createElement("canvas"); c.width = 256; c.height = 160; const ctx = c.getContext("2d"), tex = new T.CanvasTexture(c);
      const dash = new T.Mesh(new T.PlaneGeometry(0.36, 0.22), new T.MeshBasicMaterial({ map: tex })); dash.position.set(0.86, 1.34, 0); dash.rotation.set(0, -Math.PI / 2 + 0.25, 0); dash.rotation.y = -1.2; g.add(dash);
      g.scale.setScalar(1.25); g.position.y = -0.55;
      let last = 0;
      return { group: g, update(t, ex) {
        if (t - last > 500) { last = t; const soc = J.scooter ? J.scooter.soc : 34, km = J.scooter ? J.scooter.km : 22; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 256, 160); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "600 64px Inter, Arial"; ctx.fillText(soc + "%", 128, 82); ctx.font = "500 22px Inter, Arial"; ctx.fillStyle = "#9aa0a6"; ctx.fillText(km + " km · tyres ok", 128, 122); ctx.fillStyle = `hsl(${ex.hue} 90% 60%)`; ctx.fillRect(40, 136, 176 * soc / 100, 6); tex.needsUpdate = true; }
        g.wheelF.rotation.z = g.wheelR.rotation.z = -t / 400;
      } };
    },
    perch() {
      const g = new T.Group();
      const base = new T.Mesh(new T.CylinderGeometry(1.1, 1.25, 0.22, 64), shell()); g.add(base);
      const ringM = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
      const ring = new T.Mesh(new T.TorusGeometry(1.0, 0.025, 8, 90), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; g.add(ring);
      const pad = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.04, 40), accentMat()); pad.position.set(0.55, 0.13, 0); g.add(pad);
      return { group: g, ring: ringM, update(t, ex) { ringM.emissive.setHSL(ex.hue / 360, 0.8, 0.45 + 0.1 * Math.sin(t / 600)); g.rotation.y = Math.sin(t / 4000) * 0.3; } };
    }
  };
  function walk(L, t, ex, speed) {
    const w = t / 1000 * Math.PI * 2 * 0.9 * ex.gait.freqScale * speed, a = 0.35 * ex.gait.ampScale;
    L.forEach((l, i) => { l.hip.rotation.x = Math.sin(w + (i ? 1.9 : 0)) * a; l.foot.emissive.setHSL(ex.hue / 360, 0.9, ex.glow ? 0.45 : 0.25); });
  }
  const bounce = (t, ex) => Math.abs(Math.sin(t / 1000 * Math.PI * ex.tempo)) * ex.bounce;

  function orb() {
    const geo = new T.IcosahedronGeometry(1, 5), base = geo.attributes.position.array.slice();
    const mat = new T.MeshStandardMaterial({ color: 0x111111, emissive: 0xffaa33, emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.25, flatShading: false });
    const mesh = new T.Mesh(geo, mat);
    const halo = new T.Points(new T.BufferGeometry().setAttribute("position", new T.Float32BufferAttribute(Array.from({ length: 900 }, () => (Math.random() - 0.5) * 3.2), 3)), new T.PointsMaterial({ size: 0.02, color: 0xffcc88, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
    const group = new T.Group(); group.add(mesh, halo);
    return { group, update(t, ex) {
      const p = geo.attributes.position.array, k = 0.07 + J.soul.arousal * 0.1 + (ex.glow ? 0.06 : 0), s = t / 1000 * (0.6 + ex.tempo);
      for (let i = 0; i < p.length; i += 3) { const x = base[i], y = base[i + 1], z = base[i + 2], n = Math.sin(x * 3 + s) * Math.sin(y * 3.3 + s * 1.3) * Math.sin(z * 2.7 + s * 0.7); const f = 1 + n * k; p[i] = x * f; p[i + 1] = y * f; p[i + 2] = z * f; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      mat.emissive.setHSL(ex.hue / 360, 0.95, 0.5); halo.material.color.setHSL(ex.hue / 360, 0.9, 0.7);
      halo.rotation.y = s * 0.15; mesh.rotation.y = s * 0.1;
    } };
  }

  function stage(canvas, opts = {}) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene(); scene.fog = new T.FogExp2(0x05070d, opts.fog ?? 0.06);
    const cam = new T.PerspectiveCamera(opts.fov || 40, 1, 0.1, 200); cam.position.set(0, 1.2, 7);
    scene.add(new T.AmbientLight(0x8899cc, 0.55));
    const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 4); scene.add(key);
    const rim = new T.PointLight(0xffaa55, 1.2, 20); rim.position.set(-3, 2, -2); scene.add(rim);
    if (opts.floor !== false) { const grid = new T.GridHelper(60, 60, 0x2a3350, 0x161b2b); grid.position.y = -0.6; scene.add(grid); }
    if (opts.stars !== false) {
      const n = 1400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = 20 + Math.random() * 60, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6; pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); }
      scene.add(new T.Points(new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(pos, 3)), new T.PointsMaterial({ size: 0.08, color: 0x9fb0e0, transparent: true, opacity: 0.7 })));
    }
    function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    window.addEventListener("resize", resize); resize();
    const updaters = [];
    let running = true, raf;
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!running) return;
      const ex = J.soul.express(); rim.color.setHSL(ex.hue / 360, 0.8, 0.6);
      updaters.forEach(u => u(t, ex));
      renderer.render(scene, cam);
    }
    document.addEventListener("visibilitychange", () => { running = !document.hidden; });
    raf = requestAnimationFrame(loop);
    return { renderer, scene, cam, resize, onFrame: fn => updaters.push(fn) };
  }

  // Tesla-style studio: soft light, contact shadow, background that fades between white and black.
  function studio(canvas) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene(), host = canvas.parentNode;
    host.style.transition = "background-color .7s cubic-bezier(.5,0,0,.75)"; host.style.backgroundColor = "#000";
    const cam = new T.PerspectiveCamera(32, 1, 0.1, 200); cam.position.set(0, 1, 7);
    const hemi = new T.HemisphereLight(0xffffff, 0x8a8f99, 0.9); scene.add(hemi);
    const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 5); scene.add(key);
    const rim = new T.DirectionalLight(0xffffff, 0.9); rim.position.set(-5, 3, -4); scene.add(rim);
    const sc = document.createElement("canvas"); sc.width = sc.height = 128; const sx = sc.getContext("2d"); const gr = sx.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(new T.PlaneGeometry(3.2, 1.6), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.62; scene.add(shadow);
    function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    window.addEventListener("resize", resize); resize();
    const updaters = []; let running = true;
    function loop(t) { requestAnimationFrame(loop); if (!running) return; const ex = J.soul.express(); updaters.forEach(u => u(t, ex)); renderer.render(scene, cam); }
    document.addEventListener("visibilitychange", () => { running = !document.hidden; });
    requestAnimationFrame(loop);
    return { renderer, scene, cam, shadow, onFrame: fn => updaters.push(fn), setDark(d) { host.style.backgroundColor = d ? "#000" : "#f4f4f4"; shadow.material.opacity = d ? 0.15 : 0.4; hemi.intensity = d ? 0.55 : 0.95; } };
  }

  window.JeevoWorld = { stage, studio, orb, build: k => BUILD[k](), kinds: Object.keys(BUILD) };
})();
