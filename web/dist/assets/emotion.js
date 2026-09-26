/* Jeevo emotion engine — one state, expressed on every surface.
   Core affect (valence, arousal) + drives + traits, driven by appraised events.
   Works in the browser (window.JeevoEmotion) and Node (module.exports). */
(function (root) {
  "use strict";
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Event appraisals: [dValence, dArousal, {drive deltas}], scaled by traits.
  const APPRAISAL = {
    praised:      [ 0.35,  0.15, { social: 0.25, comfort: 0.05 }, "glow" ],
    petted:       [ 0.25, -0.05, { social: 0.20, comfort: 0.10 }, "glow" ],
    greeted:      [ 0.20,  0.20, { social: 0.30 } ],
    ignored:      [-0.10, -0.05, { social: -0.15 } ],
    loud_noise:   [-0.15,  0.45, { comfort: -0.20 } ],
    fell:         [-0.25,  0.35, { comfort: -0.25, curiosity: 0.10 } ],
    learned_step: [ 0.30,  0.20, { curiosity: -0.10 }, "glow" ],
    new_thing:    [ 0.10,  0.25, { curiosity: -0.25 } ],
    low_battery:  [-0.10, -0.20, { energy: -0.30 } ],
    charging:     [ 0.10, -0.15, { energy: 0.40, comfort: 0.10 } ],
    transfer_in:  [ 0.10,  0.30, { curiosity: 0.20 } ],
    night:        [ 0.00, -0.35, { energy: -0.20 } ],
    played:       [ 0.30,  0.35, { social: 0.20, energy: -0.10, curiosity: -0.10 }, "glow" ],
    surprise:     [ 0.00,  0.25, { curiosity: 0.15 } ]
  };

  const LABELS = {
    joyful:  { hue: 42,  text: "Joyful" },
    excited: { hue: 20,  text: "Excited" },
    proud:   { hue: 50,  text: "Proud" },
    content: { hue: 150, text: "Content" },
    curious: { hue: 195, text: "Curious" },
    sleepy:  { hue: 245, text: "Sleepy" },
    lonely:  { hue: 225, text: "Lonely" },
    uneasy:  { hue: 300, text: "Uneasy" },
    grumpy:  { hue: 0,   text: "Grumpy" }
  };

  class Emotion {
    constructor(state) {
      const s = state || {};
      this.traits = Object.assign({ warmth: 0.8, curiosity: 0.7, boldness: 0.45, calm: 0.6 }, s.traits);
      this.valence = s.valence ?? 0.3;
      this.arousal = s.arousal ?? 0.35;
      this.drives = Object.assign({ energy: 0.85, social: 0.55, curiosity: 0.6, comfort: 0.85 }, s.drives);
      this.lastEvent = s.lastEvent || null;
      this.glowUntil = 0;
    }
    baseline() {
      const t = this.traits;
      return { v: 0.15 + 0.35 * t.warmth - 0.1 * (1 - t.calm), a: 0.2 + 0.25 * t.curiosity - 0.15 * t.calm };
    }
    appraise(name, strength = 1, now = Date.now()) {
      const ap = APPRAISAL[name]; if (!ap) return null;
      const t = this.traits;
      const k = strength * (name === "praised" || name === "petted" ? 0.6 + 0.6 * t.warmth : name === "new_thing" || name === "surprise" ? 0.6 + 0.6 * t.curiosity : name === "loud_noise" || name === "fell" ? 1.2 - 0.5 * t.boldness : 1);
      this.valence = clamp(this.valence + ap[0] * k, -1, 1);
      this.arousal = clamp(this.arousal + ap[1] * k * (1.2 - 0.4 * t.calm), 0, 1);
      for (const d in ap[2]) this.drives[d] = clamp(this.drives[d] + ap[2][d] * k, 0, 1);
      if (ap[3] === "glow") this.glowUntil = now + 4000;
      this.lastEvent = { name, t: now, glow: ap[3] === "glow" };
      return this.lastEvent;
    }
    // dt in seconds; alone = no person sensed; active = moving
    tick(dt, ctx = {}) {
      const b = this.baseline(), r = 1 - Math.exp(-dt / 90); // ~90 s mood half-life-ish
      this.valence = lerp(this.valence, b.v + (this.drives.social - 0.5) * 0.3 + (this.drives.comfort - 0.7) * 0.3, r);
      this.arousal = lerp(this.arousal, b.a + (this.drives.energy - 0.5) * 0.25, r);
      const d = this.drives;
      d.social = clamp(d.social + (ctx.alone ? -0.002 : 0.004) * dt, 0, 1);
      d.curiosity = clamp(d.curiosity + (ctx.active ? -0.003 : 0.002) * this.traits.curiosity * dt, 0, 1);
      d.energy = clamp(d.energy + (ctx.charging ? 0.01 : ctx.active ? -0.003 : -0.0006) * dt, 0, 1);
      d.comfort = clamp(lerp(d.comfort, 0.85, 1 - Math.exp(-dt / 120)), 0, 1);
    }
    label(now = Date.now()) {
      const v = this.valence, a = this.arousal, d = this.drives;
      if (now < this.glowUntil && v > 0.35) return "proud";
      if (d.energy < 0.25 || (a < 0.18 && v > -0.2)) return "sleepy";
      if (d.social < 0.25 && v < 0.2) return "lonely";
      if (v < -0.25 && a > 0.55) return "uneasy";
      if (v < -0.2) return "grumpy";
      if (d.curiosity > 0.72 && a > 0.3) return "curious";
      if (v > 0.45 && a > 0.6) return "excited";
      if (v > 0.35) return "joyful";
      return "content";
    }
    // One expression, rendered differently by each surface.
    express(now = Date.now()) {
      const v = this.valence, a = this.arousal, lab = this.label(now);
      return {
        label: lab, text: LABELS[lab].text, hue: LABELS[lab].hue,
        eyeOpen: clamp(0.35 + a * 0.7 - (lab === "sleepy" ? 0.35 : 0), 0.08, 1),
        pupil: clamp(0.45 + a * 0.35 + (lab === "curious" ? 0.15 : 0), 0.3, 1),
        lidTilt: clamp(-v * 0.6 + (lab === "grumpy" ? 0.5 : 0), -0.6, 0.8),   // + = angry brows
        mouth: clamp(v, -1, 1),
        blinkEvery: 2.2 + (1 - a) * 4,                                      // seconds
        tempo: 0.6 + a * 0.9,                                               // gait/animation speed
        bounce: clamp(v * a * 1.4, 0, 1),
        glow: now < this.glowUntil,
        voice: { pitch: 1 + v * 0.15 + a * 0.1, rate: 0.9 + a * 0.3 },
        gait: { freqScale: 0.75 + a * 0.5, ampScale: 0.8 + Math.max(v, 0) * 0.35 }
      };
    }
    toJSON() { return { traits: this.traits, valence: +this.valence.toFixed(3), arousal: +this.arousal.toFixed(3), drives: this.drives, lastEvent: this.lastEvent }; }
  }

  const api = { Emotion, APPRAISAL, LABELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JeevoEmotion = api;
})(typeof window !== "undefined" ? window : globalThis);
