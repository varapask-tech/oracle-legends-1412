import type { Element } from "../shared/types";

const ELEMENT_VFX: Record<Element, { color: string; glow: string; emoji: string }> = {
  fire:  { color: "#ff4422", glow: "#ff8844", emoji: "🔥" },
  water: { color: "#4488ff", glow: "#66bbff", emoji: "💧" },
  earth: { color: "#44aa44", glow: "#88cc66", emoji: "🌿" },
  light: { color: "#ffdd44", glow: "#ffee88", emoji: "⚡" },
  dark:  { color: "#8844cc", glow: "#aa66ff", emoji: "🌑" },
};

export class BattleVFX {
  private container: HTMLElement;
  private _calmMode = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  set calmMode(v: boolean) { this._calmMode = v; }

  skillEffect(x: number, y: number, element: Element, isUltimate = false) {
    const cfg = ELEMENT_VFX[element];
    const size = isUltimate ? 200 : 120;
    const duration = isUltimate ? 800 : 400;

    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${x - size / 2}px; top:${y - size / 2}px;
      width:${size}px; height:${size}px; pointer-events:none; z-index:50;
      border-radius:50%;
      background:radial-gradient(circle, ${cfg.color}66 0%, ${cfg.glow}22 50%, transparent 70%);
      animation: vfx-pulse ${duration}ms ease-out forwards;
    `;
    this.container.appendChild(el);

    if (!this._calmMode) {
      const count = isUltimate ? 12 : 6;
      for (let i = 0; i < count; i++) {
        this.spawnParticle(x, y, cfg.color, duration);
      }
    }

    if (isUltimate) {
      const flash = document.createElement("div");
      flash.style.cssText = `
        position:absolute; left:0; top:0; width:100%; height:100%;
        background:${cfg.color}22; pointer-events:none; z-index:45;
        animation: vfx-flash 300ms ease-out forwards;
      `;
      this.container.appendChild(flash);
      setTimeout(() => flash.remove(), 300);
    }

    setTimeout(() => el.remove(), duration);
  }

  attackHit(x: number, y: number, element: Element, isCrit: boolean) {
    const cfg = ELEMENT_VFX[element];
    const color = isCrit ? "#ffd700" : cfg.color;

    const slash = document.createElement("div");
    slash.style.cssText = `
      position:absolute; left:${x - 30}px; top:${y - 30}px;
      width:60px; height:60px; pointer-events:none; z-index:50;
      font-size:${isCrit ? 40 : 28}px; text-align:center; line-height:60px;
      animation: vfx-hit 300ms ease-out forwards;
      filter:drop-shadow(0 0 8px ${color});
    `;
    slash.textContent = isCrit ? "💥" : cfg.emoji;
    this.container.appendChild(slash);

    if (isCrit && !this._calmMode) {
      for (let i = 0; i < 8; i++) {
        this.spawnParticle(x, y, "#ffd700", 600);
      }
      this.screenShake(6, 200);
    }

    setTimeout(() => slash.remove(), 300);
  }

  healEffect(x: number, y: number) {
    const particles = this._calmMode ? 3 : 6;
    for (let i = 0; i < particles; i++) {
      const p = document.createElement("div");
      const offsetX = (Math.random() - 0.5) * 40;
      p.style.cssText = `
        position:absolute; left:${x + offsetX}px; top:${y}px;
        font-size:16px; pointer-events:none; z-index:50;
        animation: vfx-float-up 1s ease-out forwards;
      `;
      p.textContent = "✚";
      p.style.color = "#44ff88";
      p.style.textShadow = "0 0 8px #44ff88";
      p.style.animationDelay = `${i * 100}ms`;
      this.container.appendChild(p);
      setTimeout(() => p.remove(), 1000 + i * 100);
    }
  }

  victoryBurst(centerX: number, centerY: number) {
    const colors = ["#ffd700", "#ff4444", "#44aaff", "#44ff88", "#ff88ff"];
    const count = this._calmMode ? 10 : 25;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const angle = (i / count) * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const color = colors[i % colors.length];

      p.style.cssText = `
        position:absolute; left:${centerX}px; top:${centerY}px;
        width:8px; height:8px; border-radius:50%;
        background:${color}; pointer-events:none; z-index:50;
        box-shadow:0 0 6px ${color};
        animation: vfx-burst 800ms ease-out forwards;
        --tx:${tx}px; --ty:${ty}px;
      `;
      this.container.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  private spawnParticle(x: number, y: number, color: string, duration: number) {
    const p = document.createElement("div");
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 60;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 20;
    const size = 4 + Math.random() * 6;

    p.style.cssText = `
      position:absolute; left:${x}px; top:${y}px;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; pointer-events:none; z-index:55;
      box-shadow:0 0 4px ${color};
      animation: vfx-burst ${duration}ms ease-out forwards;
      --tx:${tx}px; --ty:${ty}px;
    `;
    this.container.appendChild(p);
    setTimeout(() => p.remove(), duration);
  }

  private screenShake(intensity: number, duration: number) {
    if (this._calmMode) return;
    const el = this.container;
    const orig = el.style.transform;
    let start = 0;

    const shake = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      if (elapsed >= duration) {
        el.style.transform = orig;
        return;
      }
      const decay = 1 - elapsed / duration;
      const dx = (Math.random() - 0.5) * intensity * 2 * decay;
      const dy = (Math.random() - 0.5) * intensity * 2 * decay;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(shake);
    };
    requestAnimationFrame(shake);
  }

  static injectStyles() {
    if (document.getElementById("battle-vfx-styles")) return;
    const style = document.createElement("style");
    style.id = "battle-vfx-styles";
    style.textContent = `
      @keyframes vfx-pulse {
        0% { transform: scale(0.3); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      @keyframes vfx-flash {
        0% { opacity: 0.6; }
        100% { opacity: 0; }
      }
      @keyframes vfx-hit {
        0% { transform: scale(0.5); opacity: 1; }
        50% { transform: scale(1.3); opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
      }
      @keyframes vfx-float-up {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-60px); opacity: 0; }
      }
      @keyframes vfx-burst {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
