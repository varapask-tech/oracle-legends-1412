import { ZEN, type AmbienceTrack } from "../../shared/zen-config";

type SfxName = "attack" | "crit" | "victory" | "defeat" | "summon" | "levelup" | "click" | "equip";

const SFX_PARAMS: Record<SfxName, { freq: number; type: OscillatorType; duration: number; gain: number }> = {
  attack:  { freq: 220, type: "sawtooth",  duration: 0.08, gain: 0.3 },
  crit:    { freq: 880, type: "square",     duration: 0.12, gain: 0.4 },
  victory: { freq: 523, type: "sine",       duration: 0.5,  gain: 0.3 },
  defeat:  { freq: 150, type: "sawtooth",   duration: 0.6,  gain: 0.2 },
  summon:  { freq: 660, type: "sine",       duration: 0.4,  gain: 0.35 },
  levelup: { freq: 440, type: "triangle",   duration: 0.3,  gain: 0.3 },
  click:   { freq: 1000, type: "sine",      duration: 0.03, gain: 0.15 },
  equip:   { freq: 350, type: "triangle",   duration: 0.1,  gain: 0.2 },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private bgmLfo: OscillatorNode | null = null;

  private _masterVolume: number = ZEN.ambience.volumeDefault;
  private _bgmVolume = 0.5;
  private _sfxVolume = 0.7;
  private _muted = false;
  private _currentTrack: AmbienceTrack | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._bgmVolume;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  playBgm(trackId?: string) {
    const track = ZEN.ambience.tracks.find((t) => t.id === (trackId ?? ZEN.ambience.defaultTrack));
    if (!track) return;

    this.stopBgm();
    const ctx = this.ensureCtx();
    this._currentTrack = track;

    const baseFreq = 60 + track.bpm * 0.5;

    this.bgmOsc = ctx.createOscillator();
    this.bgmOsc.type = "sine";
    this.bgmOsc.frequency.value = baseFreq;

    this.bgmLfo = ctx.createOscillator();
    this.bgmLfo.type = "sine";
    this.bgmLfo.frequency.value = track.bpm / 120;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = baseFreq * 0.02;
    this.bgmLfo.connect(lfoGain);
    lfoGain.connect(this.bgmOsc.frequency);

    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(0, ctx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + ZEN.ambience.fadeInMs / 1000);

    this.bgmOsc.connect(fadeGain);
    fadeGain.connect(this.bgmGain!);

    this.bgmOsc.start();
    this.bgmLfo.start();
  }

  stopBgm() {
    const ctx = this.ctx;
    if (!ctx) return;
    const fadeOut = ZEN.ambience.fadeOutMs / 1000;

    if (this.bgmOsc) {
      try {
        this.bgmOsc.stop(ctx.currentTime + fadeOut);
      } catch {}
      this.bgmOsc = null;
    }
    if (this.bgmLfo) {
      try {
        this.bgmLfo.stop(ctx.currentTime + fadeOut);
      } catch {}
      this.bgmLfo = null;
    }
    this._currentTrack = null;
  }

  playSfx(name: SfxName) {
    if (this._muted) return;
    const params = SFX_PARAMS[name];
    if (!params) return;

    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    osc.type = params.type;
    osc.frequency.value = params.freq;

    const env = ctx.createGain();
    env.gain.setValueAtTime(params.gain, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + params.duration);

    osc.connect(env);
    env.connect(this.sfxGain!);
    osc.start();
    osc.stop(ctx.currentTime + params.duration + 0.05);

    if (name === "victory") {
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 659;
      const env2 = ctx.createGain();
      env2.gain.setValueAtTime(params.gain * 0.8, ctx.currentTime + 0.15);
      env2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(env2);
      env2.connect(this.sfxGain!);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.65);
    }
  }

  get masterVolume() { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this._masterVolume;
  }

  get bgmVolume() { return this._bgmVolume; }
  set bgmVolume(v: number) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain) this.bgmGain.gain.value = this._bgmVolume;
  }

  get sfxVolume() { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this._sfxVolume;
  }

  get muted() { return this._muted; }
  set muted(v: boolean) {
    this._muted = v;
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this._masterVolume;
  }

  get currentTrack() { return this._currentTrack; }

  dispose() {
    this.stopBgm();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audio = new AudioManager();
