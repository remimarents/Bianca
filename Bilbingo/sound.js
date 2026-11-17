// Short, soft toy-car sounds. One reusable context, unlocked by a player action.
window.BingoSounds = class {
  constructor() { this.context = null; this.voices = new Set(); this.sequence = 0; }
  stop() {
    this.sequence++;
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
  }
  async play(kind, points = 1) {
    this.stop();
    const sequence = this.sequence;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context || document.hidden) return;
      if (!this.context) this.context = new Context();
      if (this.context.state !== 'running') await this.context.resume();
      if (sequence !== this.sequence || document.hidden || this.context.state !== 'running') return;
      const note = (frequency, delay, duration = .12, volume = .07, end = frequency, type = 'sine') => {
        const context = this.context, time = context.currentTime + delay;
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(volume, time + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        this.voices.add(oscillator);
        oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(time); oscillator.stop(time + duration + .02);
      };
      if (kind === 'select') note(740, 0, .07, .045);
      if (kind === 'car' || kind === 'start') {
        note(95, 0, .28, .075, 210, 'triangle');
        if (kind === 'start') { note(523, .24); note(784, .37, .2); }
      }
      if (kind === 'found') {
        note(440, 0, .12, .055, 470, 'triangle');
        note(554, .02, .12, .045, 587, 'triangle');
        for (let i = 0; i < Math.min(3, points); i++) note([784,988,1175][i], .14 + i * .1, .18, .055);
      }
      if (kind === 'undo') { note(587, 0, .1, .045); note(392, .1, .14, .045); }
      if (kind === 'round') [523,659,784].forEach((f,i) => note(f, i*.14, .24));
      if (kind === 'win') {
        [523,659,784,1047,784,1047].forEach((f,i) => note(f, i*.14, i===5 ? .45 : .22));
        note(523,.7,.45,.035); note(659,.7,.45,.035);
      }
    } catch { /* Audio must never block scoring or navigation. */ }
  }
};
