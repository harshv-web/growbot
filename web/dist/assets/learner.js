/* Jeevo motor learning — runs on the host (Fire 7 via Termux/Node, iPhone app, or the Lab sim).
   1) GaitLearner: (1+1) evolution strategy over 4 rhythm params with the 1/5 success rule.
   2) ForwardModel: tiny MLP predicting the next IMU tick from (IMU, action), trained online
      from its own prediction error — the piece GrowBot hadn't built (Discord, 16 Aug 2026).
      Its error is also the curiosity signal fed to the emotion engine. */
(function (root) {
  "use strict";
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const LIMITS = { amp: [4, 45], freq: [0.4, 2.6], phase: [0, Math.PI * 2], bias: [-15, 15] };
  const SCALE = { amp: 6, freq: 0.25, phase: 0.5, bias: 3 };
  function gauss(rng) { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  class GaitLearner {
    constructor(start, opts = {}) {
      this.best = Object.assign({ amp: 20, freq: 1.0, phase: 1.8, bias: 0 }, start);
      this.bestScore = -Infinity; this.sigma = opts.sigma ?? 1; this.trials = 0; this.wins = 0;
      this.rng = opts.rng || Math.random; this.history = [];
    }
    propose(safetyCheck) {
      for (let k = 0; k < 8; k++) {
        const c = {};
        for (const p in LIMITS) c[p] = clamp(this.best[p] + gauss(this.rng) * SCALE[p] * this.sigma, LIMITS[p][0], LIMITS[p][1]);
        if (!safetyCheck || safetyCheck(c)) return c;    // forward model can veto risky gaits
      }
      return Object.assign({}, this.best);
    }
    report(candidate, score) {
      this.trials++;
      const win = score > this.bestScore;
      if (win) { this.best = candidate; this.bestScore = score; this.wins++; }
      // 1/5 rule every 10 trials: grow step if >20% succeed, else shrink
      if (this.trials % 10 === 0) { const rate = this.wins / 10; this.sigma = clamp(this.sigma * (rate > 0.2 ? 1.22 : 0.82), 0.05, 2); this.wins = 0; }
      this.history.push({ n: this.trials, score, best: this.bestScore, sigma: +this.sigma.toFixed(3) });
      return win;
    }
    // Start a new body from a known one, scaled by leg length and mass (cross-body transfer).
    static transfer(fromGait, fromBody, toBody) {
      const legRatio = fromBody.legLengthMm / toBody.legLengthMm;
      const massRatio = Math.sqrt(fromBody.massG / toBody.massG);
      return { amp: clamp(fromGait.amp * legRatio, 4, 45), freq: clamp(fromGait.freq * massRatio, 0.4, 2.6), phase: fromGait.phase, bias: fromGait.bias };
    }
  }

  // Score one stride window. Inputs come from the phone/tablet: optical-flow progress (m),
  // IMU pitch/roll variance, fall flag, mean |action change| as an energy proxy.
  function strideScore(m) { return m.progress * 10 - m.tiltVar * 4 - (m.fell ? 5 : 0) - m.effort * 0.5; }

  class ForwardModel {
    constructor(nIn = 8, nHid = 16, nOut = 4, lr = 0.01, rng = Math.random) {
      const w = (a, b) => Array.from({ length: a }, () => Array.from({ length: b }, () => (rng() - 0.5) * 0.4));
      Object.assign(this, { nIn, nHid, nOut, lr, W1: w(nHid, nIn), b1: new Array(nHid).fill(0), W2: w(nOut, nHid), b2: new Array(nOut).fill(0), errEMA: 0 });
    }
    predict(x) {
      this.h = this.W1.map((row, i) => Math.tanh(row.reduce((s, wi, j) => s + wi * x[j], this.b1[i])));
      return this.W2.map((row, i) => row.reduce((s, wi, j) => s + wi * this.h[j], this.b2[i]));
    }
    // x = [pitch, roll, gyroX, gyroY, ...action(4)] ; y = next [pitch, roll, gyroX, gyroY]
    learn(x, y) {
      const p = this.predict(x), e = p.map((v, i) => v - y[i]);
      const mse = e.reduce((s, v) => s + v * v, 0) / e.length;
      const dh = this.h.map((hj, j) => (1 - hj * hj) * e.reduce((s, ei, i) => s + ei * this.W2[i][j], 0));
      for (let i = 0; i < this.nOut; i++) { for (let j = 0; j < this.nHid; j++) this.W2[i][j] -= this.lr * e[i] * this.h[j]; this.b2[i] -= this.lr * e[i]; }
      for (let i = 0; i < this.nHid; i++) { for (let j = 0; j < this.nIn; j++) this.W1[i][j] -= this.lr * dh[i] * x[j]; this.b1[i] -= this.lr * dh[i]; }
      this.errEMA = this.errEMA * 0.98 + mse * 0.02;
      return { mse, surprise: mse / (this.errEMA + 1e-6) };   // surprise > ~3 → emotion.appraise("surprise")
    }
  }

  const api = { GaitLearner, ForwardModel, strideScore, LIMITS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JeevoLearn = api;
})(typeof window !== "undefined" ? window : globalThis);
