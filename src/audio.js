/* Tiny synthesized audio layer — engine, alarms, UI clicks */

export class Sound {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.engine = null;
    this.master = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 54;
      sub.type = 'square';
      sub.frequency.value = 27;
      filter.type = 'lowpass';
      filter.frequency.value = 190;
      filter.Q.value = 2.2;
      gain.gain.value = 0;
      osc.connect(filter); sub.connect(filter);
      filter.connect(gain); gain.connect(this.master);
      osc.start(); sub.start();
      this.engine = { osc, sub, filter, gain };
    } catch { /* audio optional */ }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.16 : 0, this.ctx.currentTime, 0.03);
    }
    return this.enabled;
  }

  setEngine(level) {
    if (!this.ctx || !this.engine) return;
    const l = this.enabled ? Math.max(0, Math.min(1, level)) : 0;
    const now = this.ctx.currentTime;
    this.engine.gain.gain.setTargetAtTime(l * 0.22, now, 0.12);
    this.engine.osc.frequency.setTargetAtTime(46 + l * 26, now, 0.15);
    this.engine.sub.frequency.setTargetAtTime(23 + l * 13, now, 0.15);
    this.engine.filter.frequency.setTargetAtTime(140 + l * 240, now, 0.15);
  }

  stopEngine() { this.setEngine(0); }

  blip(freq = 620, dur = 0.07, type = 'sine', vol = 0.12) {
    if (!this.ctx || !this.enabled) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + dur + 0.01);
    } catch { /* noop */ }
  }

  click() { this.blip(520, 0.04, 'triangle', 0.07); }
  ok() { this.blip(660, 0.08, 'sine', 0.1); setTimeout(() => this.blip(880, 0.12, 'sine', 0.09), 80); }
  warn() { this.blip(240, 0.16, 'square', 0.09); }
  alarm() {
    this.blip(185, 0.18, 'sawtooth', 0.12);
    setTimeout(() => this.blip(145, 0.25, 'sawtooth', 0.12), 180);
  }
  coin() { this.blip(740, 0.09, 'triangle', 0.09); setTimeout(() => this.blip(990, 0.16, 'triangle', 0.08), 90); }
}
