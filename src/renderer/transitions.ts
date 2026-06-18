type EasingFn = (t: number) => number;

const ease = {
  inOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  out: (t: number) => 1 - (1 - t) ** 3,
  in: (t: number) => t * t * t,
};

export class ScreenTransition {
  private overlay: HTMLDivElement;
  private running = false;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:9999; opacity:0;
      background:#0a0a1a;
    `;
    document.body.appendChild(this.overlay);
  }

  async fadeOut(durationMs = 300): Promise<void> {
    return this.animate(0, 1, durationMs, ease.in);
  }

  async fadeIn(durationMs = 300): Promise<void> {
    return this.animate(1, 0, durationMs, ease.out);
  }

  async crossFade(action: () => void | Promise<void>, durationMs = 500): Promise<void> {
    const half = durationMs / 2;
    await this.fadeOut(half);
    await action();
    await this.fadeIn(half);
  }

  async battleIntro(durationMs = 800): Promise<void> {
    this.overlay.style.background = "linear-gradient(180deg, #0a0a1a 0%, #1a0a3a 100%)";
    await this.animate(0, 1, durationMs * 0.4, ease.in);

    const text = document.createElement("div");
    text.style.cssText = `
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      color:#ffd700; font-size:32px; font-weight:bold; font-family:'Segoe UI',sans-serif;
      text-shadow:0 0 20px rgba(255,215,0,0.5); opacity:0;
    `;
    text.textContent = "⚔️ BATTLE START";
    this.overlay.appendChild(text);

    await this.animateElement(text, "opacity", 0, 1, 200);
    await sleep(durationMs * 0.3);
    await this.animateElement(text, "opacity", 1, 0, 200);
    text.remove();

    await this.animate(1, 0, durationMs * 0.3, ease.out);
    this.overlay.style.background = "#0a0a1a";
  }

  async victoryFlash(durationMs = 600): Promise<void> {
    this.overlay.style.background = "radial-gradient(ellipse at center, rgba(255,215,0,0.4) 0%, transparent 70%)";
    await this.animate(0, 1, durationMs * 0.3, ease.out);
    await sleep(durationMs * 0.4);
    await this.animate(1, 0, durationMs * 0.3, ease.in);
    this.overlay.style.background = "#0a0a1a";
  }

  async defeatDarken(durationMs = 800): Promise<void> {
    this.overlay.style.background = "radial-gradient(ellipse at center, rgba(80,0,0,0.6) 0%, rgba(10,0,0,0.9) 100%)";
    await this.animate(0, 0.8, durationMs, ease.inOut);
  }

  clearDefeat(): void {
    this.animate(parseFloat(this.overlay.style.opacity) || 0, 0, 400, ease.out);
    this.overlay.style.background = "#0a0a1a";
  }

  private animate(from: number, to: number, durationMs: number, easing: EasingFn): Promise<void> {
    if (this.running) this.overlay.style.opacity = String(to);
    this.running = true;

    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);
        const val = from + (to - from) * easing(t);
        this.overlay.style.opacity = String(val);

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          this.running = false;
          if (to === 0) this.overlay.style.pointerEvents = "none";
          resolve();
        }
      };
      if (to > 0) this.overlay.style.pointerEvents = "auto";
      requestAnimationFrame(tick);
    });
  }

  private animateElement(el: HTMLElement, prop: string, from: number, to: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const val = from + (to - from) * ease.inOut(t);
        el.style.setProperty(prop, String(val));
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  dispose(): void {
    this.overlay.remove();
  }
}

export class VictoryConfetti {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pieces: Array<{
    x: number; y: number; vx: number; vy: number;
    rotation: number; rotSpeed: number;
    width: number; height: number; color: string;
    life: number;
  }> = [];
  private animId = 0;
  private lastTime = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9998;";
    this.ctx = this.canvas.getContext("2d")!;
  }

  start(duration = 3000) {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);

    const colors = ["#ffd700", "#ff4444", "#44aaff", "#44ff88", "#ff88ff", "#ffaa44", "#aa88ff"];
    const count = 80;

    for (let i = 0; i < count; i++) {
      this.pieces.push({
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 200,
        vy: 100 + Math.random() * 300,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
        width: 6 + Math.random() * 8,
        height: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      });
    }

    this.lastTime = performance.now();
    this.loop();

    setTimeout(() => this.stop(), duration);
  }

  private loop = () => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed * dt;

      if (p.y > this.canvas.height + 50) {
        this.pieces.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      this.ctx.restore();
    }

    if (this.pieces.length > 0) {
      this.animId = requestAnimationFrame(this.loop);
    } else {
      this.cleanup();
    }
  };

  private stop() {
    for (const p of this.pieces) p.life = 0.5;
  }

  private cleanup() {
    cancelAnimationFrame(this.animId);
    this.canvas.remove();
    this.pieces.length = 0;
  }
}

export class SkillFlash {
  static show(container: HTMLElement, color = "#ffd700", durationMs = 200) {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background:radial-gradient(ellipse at center, ${color}44 0%, transparent 70%);
      pointer-events:none; z-index:100; opacity:1;
    `;
    container.appendChild(flash);

    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / durationMs;
      if (t >= 1) { flash.remove(); return; }
      flash.style.opacity = String(1 - t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
