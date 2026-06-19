type SfxName = "attack" | "crit" | "victory" | "defeat" | "summon" | "levelup" | "click" | "equip" | "coin" | "heal" | "hit" | "wave-clear";

const SFX: Record<SfxName, { freqs: number[]; type: OscillatorType; dur: number; gain: number; delay?: number }> = {
  attack:     { freqs: [220, 180],       type: "sawtooth",  dur: 0.08, gain: 0.25 },
  crit:       { freqs: [880, 1100, 660], type: "square",    dur: 0.12, gain: 0.3 },
  victory:    { freqs: [523, 659, 784],  type: "sine",      dur: 0.2,  gain: 0.25, delay: 0.15 },
  defeat:     { freqs: [200, 150, 100],  type: "sawtooth",  dur: 0.3,  gain: 0.15, delay: 0.2 },
  summon:     { freqs: [440, 554, 659],  type: "sine",      dur: 0.15, gain: 0.25, delay: 0.12 },
  levelup:    { freqs: [523, 659, 784, 1047], type: "triangle", dur: 0.12, gain: 0.25, delay: 0.1 },
  click:      { freqs: [800],            type: "sine",      dur: 0.03, gain: 0.1 },
  equip:      { freqs: [350, 440],       type: "triangle",  dur: 0.08, gain: 0.15 },
  coin:       { freqs: [1200, 1600],     type: "sine",      dur: 0.06, gain: 0.15, delay: 0.05 },
  heal:       { freqs: [440, 554, 659],  type: "sine",      dur: 0.15, gain: 0.2, delay: 0.1 },
  hit:        { freqs: [150, 100],       type: "sawtooth",  dur: 0.06, gain: 0.2 },
  "wave-clear": { freqs: [523, 659],     type: "triangle",  dur: 0.15, gain: 0.2, delay: 0.1 },
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private _volume = 0.4;
  private _muted = false;
  private _bgmPlaying = false;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  playSfx(name: SfxName) {
    if (this._muted) return;
    const sfx = SFX[name];
    if (!sfx) return;

    const ctx = this.ensureCtx();

    sfx.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = sfx.type;
      osc.frequency.value = freq;

      const env = ctx.createGain();
      const startTime = ctx.currentTime + (sfx.delay ?? 0) * i;
      env.gain.setValueAtTime(sfx.gain, startTime);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + sfx.dur);

      osc.connect(env);
      env.connect(this.masterGain!);
      osc.start(startTime);
      osc.stop(startTime + sfx.dur + 0.05);
    });
  }

  startBgm() {
    if (this._bgmPlaying || this._muted) return;
    const ctx = this.ensureCtx();

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 0;
    this.bgmGain.connect(this.masterGain!);

    this.bgmOsc = ctx.createOscillator();
    this.bgmOsc.type = "sine";
    this.bgmOsc.frequency.value = 65;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain);
    lfoGain.connect(this.bgmOsc.frequency);

    this.bgmOsc.connect(this.bgmGain);
    this.bgmGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2);

    this.bgmOsc.start();
    lfo.start();
    this._bgmPlaying = true;
  }

  stopBgm() {
    if (!this._bgmPlaying || !this.ctx) return;
    if (this.bgmGain) {
      this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
    }
    if (this.bgmOsc) {
      try { this.bgmOsc.stop(this.ctx.currentTime + 1.1); } catch {}
      this.bgmOsc = null;
    }
    this._bgmPlaying = false;
  }

  get volume() { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this._muted ? 0 : this._volume;
  }

  get muted() { return this._muted; }
  set muted(v: boolean) {
    this._muted = v;
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this._volume;
    if (v) this.stopBgm();
  }

  dispose() {
    this.stopBgm();
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
  }
}

export const sound = new SoundManager();
