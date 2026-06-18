import type { Element } from "../shared/types";

const ELEMENT_DMG_COLORS: Record<Element, string> = {
  fire: "#ff4422",
  water: "#44aaff",
  earth: "#44cc44",
  light: "#ffdd22",
  dark: "#cc66ff",
};

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  life: number;
  maxLife: number;
  vy: number;
  isCrit: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface CoinDrop {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  amount: number;
}

export class EffectsLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texts: FloatingText[] = [];
  private particles: Particle[] = [];
  private coins: CoinDrop[] = [];
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private _calmMode = false;

  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.cssText = "position:absolute; top:0; left:0; pointer-events:none;";
    this.ctx = this.canvas.getContext("2d")!;
  }

  get element() { return this.canvas; }

  set calmMode(v: boolean) { this._calmMode = v; }

  showDamage(x: number, y: number, amount: number, element: Element, isCrit: boolean) {
    const color = isCrit ? "#ffd700" : ELEMENT_DMG_COLORS[element];
    this.texts.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      text: isCrit ? `${amount}!` : String(amount),
      color,
      fontSize: isCrit ? 28 : 20,
      life: isCrit ? 1.2 : 0.8,
      maxLife: isCrit ? 1.2 : 0.8,
      vy: -60,
      isCrit,
    });

    if (isCrit && !this._calmMode) {
      this.emitSparkle(x, y, "#ffd700", 12);
      this.screenShake(4, 0.2);
    }
  }

  showHeal(x: number, y: number, amount: number) {
    this.texts.push({
      x, y,
      text: `+${amount}`,
      color: "#44ff88",
      fontSize: 22,
      life: 1.0,
      maxLife: 1.0,
      vy: -50,
      isCrit: false,
    });
    if (!this._calmMode) this.emitSparkle(x, y, "#44ff88", 6);
  }

  showGoldGain(x: number, y: number, targetX: number, targetY: number, amount: number) {
    const count = this._calmMode ? 1 : Math.min(5, Math.ceil(amount / 50));
    for (let i = 0; i < count; i++) {
      this.coins.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        targetX,
        targetY,
        progress: -i * 0.1,
        amount: i === 0 ? amount : 0,
      });
    }
  }

  showLevelUp(x: number, y: number) {
    this.texts.push({
      x, y: y - 20,
      text: "LEVEL UP!",
      color: "#ffdd44",
      fontSize: 26,
      life: 1.5,
      maxLife: 1.5,
      vy: -40,
      isCrit: false,
    });
    if (!this._calmMode) {
      this.emitSparkle(x, y, "#ffdd44", 20);
      this.emitSparkle(x, y, "#ff8844", 10);
    }
  }

  showSummonReveal(x: number, y: number, rarity: string) {
    const colors: Record<string, string> = {
      common: "#888888",
      uncommon: "#44bb44",
      rare: "#4488ff",
      epic: "#aa44ff",
      legendary: "#ffaa00",
    };
    const color = colors[rarity] ?? "#ffffff";
    const count = rarity === "legendary" ? 30 : rarity === "epic" ? 20 : 10;
    if (!this._calmMode) this.emitSparkle(x, y, color, count);
  }

  screenShake(intensity: number, duration: number) {
    if (this._calmMode) return;
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.shakeDuration <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shakeIntensity * 2,
      y: (Math.random() - 0.5) * this.shakeIntensity * 2,
    };
  }

  private emitSparkle(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.shakeDuration > 0) this.shakeDuration -= dt;

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }

      t.y += t.vy * dt;
      t.vy *= 0.97;

      const alpha = Math.min(1, t.life / (t.maxLife * 0.3));
      const scale = t.isCrit ? 1 + (1 - t.life / t.maxLife) * 0.3 : 1;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.font = `bold ${Math.round(t.fontSize * scale)}px sans-serif`;
      this.ctx.textAlign = "center";
      this.ctx.fillStyle = t.color;
      this.ctx.shadowColor = t.color;
      this.ctx.shadowBlur = t.isCrit ? 8 : 4;
      this.ctx.fillText(t.text, t.x, t.y);
      this.ctx.shadowBlur = 0;
      // outline
      this.ctx.strokeStyle = "rgba(0,0,0,0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.strokeText(t.text, t.x, t.y);
      this.ctx.restore();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;

      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 4;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.progress += dt * 1.5;
      if (c.progress >= 1) { this.coins.splice(i, 1); continue; }
      if (c.progress < 0) continue;

      const t = c.progress;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const arcY = -80 * Math.sin(t * Math.PI);

      const cx = c.x + (c.targetX - c.x) * ease;
      const cy = c.y + (c.targetY - c.y) * ease + arcY;

      this.ctx.save();
      this.ctx.fillStyle = "#ffd700";
      this.ctx.shadowColor = "#ffaa00";
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#ffee88";
      this.ctx.beginPath();
      this.ctx.arc(cx - 1, cy - 1, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (c.amount > 0 && t < 0.3) {
        this.ctx.save();
        this.ctx.globalAlpha = 1 - t / 0.3;
        this.ctx.font = "bold 14px sans-serif";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.fillText(`+${c.amount}`, cx, cy - 14);
        this.ctx.restore();
      }
    }
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  clear() {
    this.texts.length = 0;
    this.particles.length = 0;
    this.coins.length = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }
}

export function createExpBarFill(width: number, height: number, ratio: number, color = "#44aaff"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  const fillW = Math.round(width * Math.min(1, ratio));
  if (fillW > 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shiftColor(color, -30));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, fillW, height);

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(0, 0, fillW, height / 2);
  }

  ctx.strokeStyle = "#3a3a5a";
  ctx.strokeRect(0, 0, width, height);

  return canvas;
}

function shiftColor(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
