import { ZEN } from "../../shared/zen-config";
import { audio } from "../systems/audio";

export interface SettingsState {
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  muted: boolean;
  battleSpeed: number;
  calmMode: boolean;
  bgmTrack: string;
  notifyIdleReward: boolean;
  notifyBossUnlocked: boolean;
}

const STORAGE_KEY = "oracle-legends-settings";

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {}
  return defaultSettings();
}

function defaultSettings(): SettingsState {
  return {
    masterVolume: ZEN.ambience.volumeDefault,
    bgmVolume: 0.5,
    sfxVolume: 0.7,
    muted: false,
    battleSpeed: ZEN.defaultSpeed,
    calmMode: false,
    bgmTrack: ZEN.ambience.defaultTrack,
    notifyIdleReward: ZEN.notifications.idleRewardReady,
    notifyBossUnlocked: ZEN.notifications.bossUnlocked,
  };
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export class SettingsPanel {
  private el: HTMLDivElement;
  private state: SettingsState;
  private visible = false;
  private onChange: ((s: SettingsState) => void) | null = null;

  constructor(container: HTMLElement, onChange?: (s: SettingsState) => void) {
    this.state = loadSettings();
    this.onChange = onChange ?? null;
    this.el = document.createElement("div");
    this.el.style.cssText = `
      position:fixed; top:0; right:-360px; width:340px; height:100%;
      background:rgba(26,10,46,0.95); border-left:2px solid #ffd700;
      padding:24px 20px; color:#e0d0ff; font-family:sans-serif;
      transition:right 0.3s ease; z-index:1000; overflow-y:auto;
    `;
    container.appendChild(this.el);
    this.applyToAudio();
    this.render();
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.right = this.visible ? "0" : "-360px";
  }

  getState(): Readonly<SettingsState> { return this.state; }

  private applyToAudio() {
    audio.masterVolume = this.state.masterVolume;
    audio.bgmVolume = this.state.bgmVolume;
    audio.sfxVolume = this.state.sfxVolume;
    audio.muted = this.state.muted;
  }

  private emit() {
    saveSettings(this.state);
    this.applyToAudio();
    this.onChange?.(this.state);
  }

  private render() {
    this.el.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "⚙️ ตั้งค่า";
    title.style.cssText = "color:#ffd700; margin:0 0 20px; font-size:20px;";
    this.el.appendChild(title);

    this.addSlider("🔊 เสียงหลัก", this.state.masterVolume, (v) => { this.state.masterVolume = v; this.emit(); });
    this.addSlider("🎵 BGM", this.state.bgmVolume, (v) => { this.state.bgmVolume = v; this.emit(); });
    this.addSlider("💥 SFX", this.state.sfxVolume, (v) => { this.state.sfxVolume = v; this.emit(); });
    this.addToggle("🔇 ปิดเสียง", this.state.muted, (v) => { this.state.muted = v; this.emit(); });

    this.addDivider();

    this.addSelect("🎵 เพลง BGM", ZEN.ambience.tracks.map((t) => ({ value: t.id, label: t.name })), this.state.bgmTrack, (v) => {
      this.state.bgmTrack = v;
      audio.playBgm(v);
      this.emit();
    });

    this.addDivider();

    this.addSelect("⚡ ความเร็วรบ", ZEN.speeds.map((s) => ({ value: String(s.multiplier), label: s.label })), String(this.state.battleSpeed), (v) => {
      this.state.battleSpeed = Number(v);
      this.emit();
    });

    this.addToggle("🧘 โหมดสงบ", this.state.calmMode, (v) => { this.state.calmMode = v; this.emit(); this.render(); });

    if (this.state.calmMode) {
      const hint = document.createElement("p");
      hint.textContent = "ลด effects, ปิด screen shake, บรรยากาศเบาๆ";
      hint.style.cssText = "font-size:12px; color:#a090c0; margin:4px 0 12px 28px;";
      this.el.appendChild(hint);
    }

    this.addDivider();

    this.addToggle("📦 แจ้ง Idle Reward", this.state.notifyIdleReward, (v) => { this.state.notifyIdleReward = v; this.emit(); });
    this.addToggle("👹 แจ้ง Boss ใหม่", this.state.notifyBossUnlocked, (v) => { this.state.notifyBossUnlocked = v; this.emit(); });

    const close = document.createElement("button");
    close.textContent = "ปิด";
    close.style.cssText = `
      margin-top:24px; width:100%; padding:10px; border:1px solid #ffd700;
      background:transparent; color:#ffd700; border-radius:6px; cursor:pointer;
      font-size:14px;
    `;
    close.onclick = () => this.toggle();
    this.el.appendChild(close);
  }

  private addSlider(label: string, value: number, onChange: (v: number) => void) {
    const row = document.createElement("div");
    row.style.cssText = "margin-bottom:14px;";
    row.innerHTML = `<label style="font-size:13px;">${label}: <span>${Math.round(value * 100)}%</span></label>`;
    const input = document.createElement("input");
    input.type = "range"; input.min = "0"; input.max = "100"; input.value = String(Math.round(value * 100));
    input.style.cssText = "width:100%; margin-top:4px; accent-color:#ffd700;";
    input.oninput = () => {
      const v = Number(input.value) / 100;
      row.querySelector("span")!.textContent = `${input.value}%`;
      onChange(v);
    };
    row.appendChild(input);
    this.el.appendChild(row);
  }

  private addToggle(label: string, checked: boolean, onChange: (v: boolean) => void) {
    const row = document.createElement("label");
    row.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:13px; cursor:pointer;";
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = checked;
    cb.style.cssText = "accent-color:#ffd700; width:16px; height:16px;";
    cb.onchange = () => onChange(cb.checked);
    row.appendChild(cb);
    row.appendChild(document.createTextNode(label));
    this.el.appendChild(row);
  }

  private addSelect(label: string, options: { value: string; label: string }[], current: string, onChange: (v: string) => void) {
    const row = document.createElement("div");
    row.style.cssText = "margin-bottom:14px;";
    row.innerHTML = `<label style="font-size:13px;">${label}</label>`;
    const sel = document.createElement("select");
    sel.style.cssText = "width:100%; margin-top:4px; padding:6px; background:#2a1a4a; color:#e0d0ff; border:1px solid #5a4a7a; border-radius:4px;";
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.value; o.textContent = opt.label;
      if (opt.value === current) o.selected = true;
      sel.appendChild(o);
    }
    sel.onchange = () => onChange(sel.value);
    row.appendChild(sel);
    this.el.appendChild(row);
  }

  private addDivider() {
    const hr = document.createElement("hr");
    hr.style.cssText = "border:none; border-top:1px solid #3a2a5a; margin:16px 0;";
    this.el.appendChild(hr);
  }

  dispose() {
    this.el.remove();
  }
}
