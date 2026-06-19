const TILE_SIZE = 48;

export class BombVFX {
  private container: HTMLElement;
  private _calmMode = false;

  constructor(container: HTMLElement) {
    this.container = container;
    BombVFX.injectStyles();
  }

  set calmMode(v: boolean) { this._calmMode = v; }

  explosion(tileX: number, tileY: number, range: number) {
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_SIZE + TILE_SIZE / 2;

    this.explosionAt(cx, cy, true);

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= range; i++) {
        const ex = cx + dx * i * TILE_SIZE;
        const ey = cy + dy * i * TILE_SIZE;
        setTimeout(() => this.explosionAt(ex, ey, false), i * 50);
      }
    }

    if (!this._calmMode) this.screenShake(4, 300);
  }

  private explosionAt(x: number, y: number, isCenter: boolean) {
    const size = isCenter ? TILE_SIZE * 1.2 : TILE_SIZE;
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${x - size / 2}px; top:${y - size / 2}px;
      width:${size}px; height:${size}px; pointer-events:none; z-index:60;
      border-radius:${isCenter ? "50%" : "8px"};
      background:radial-gradient(circle, #ffdd44cc 0%, #ff4422aa 40%, #ff220044 70%, transparent 100%);
      animation: bomb-explode 0.4s ease-out forwards;
    `;
    this.container.appendChild(el);

    if (!this._calmMode) {
      for (let i = 0; i < (isCenter ? 6 : 3); i++) {
        this.spawnSpark(x, y);
      }
    }

    setTimeout(() => el.remove(), 400);
  }

  chestOpen(tileX: number, tileY: number, goldAmount: number) {
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_SIZE + TILE_SIZE / 2;

    const glow = document.createElement("div");
    glow.style.cssText = `
      position:absolute; left:${cx - 30}px; top:${cy - 30}px;
      width:60px; height:60px; border-radius:50%;
      background:radial-gradient(circle, #ffd70088 0%, transparent 70%);
      pointer-events:none; z-index:55;
      animation: chest-glow 0.6s ease-out forwards;
    `;
    this.container.appendChild(glow);
    setTimeout(() => glow.remove(), 600);

    const count = this._calmMode ? 2 : Math.min(5, Math.ceil(goldAmount / 50));
    for (let i = 0; i < count; i++) {
      const coin = document.createElement("div");
      const offsetX = (Math.random() - 0.5) * 30;
      coin.style.cssText = `
        position:absolute; left:${cx + offsetX}px; top:${cy}px;
        width:10px; height:10px; border-radius:50%;
        background:#ffd700; box-shadow:0 0 6px #ffaa00;
        pointer-events:none; z-index:60;
        animation: coin-fly 0.8s ease-out ${i * 80}ms forwards;
      `;
      this.container.appendChild(coin);
      setTimeout(() => coin.remove(), 800 + i * 80);
    }

    const label = document.createElement("div");
    label.style.cssText = `
      position:absolute; left:${cx}px; top:${cy - 10}px;
      color:#ffd700; font-size:14px; font-weight:bold;
      font-family:'Segoe UI',sans-serif; text-shadow:0 0 4px #ffaa00;
      pointer-events:none; z-index:65; transform:translateX(-50%);
      animation: coin-fly 1s ease-out forwards;
    `;
    label.textContent = `+${goldAmount}`;
    this.container.appendChild(label);
    setTimeout(() => label.remove(), 1000);
  }

  blockBreak(tileX: number, tileY: number) {
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_SIZE + TILE_SIZE / 2;

    if (this._calmMode) return;

    for (let i = 0; i < 4; i++) {
      const piece = document.createElement("div");
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 15 + Math.random() * 25;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const size = 4 + Math.random() * 6;

      piece.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:${size}px; height:${size}px; border-radius:2px;
        background:#8b6914; pointer-events:none; z-index:55;
        animation: debris-fly 0.5s ease-out forwards;
        --tx:${tx}px; --ty:${ty}px;
      `;
      this.container.appendChild(piece);
      setTimeout(() => piece.remove(), 500);
    }
  }

  heroStaminaEmpty(tileX: number, tileY: number) {
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_SIZE;

    const zzz = document.createElement("div");
    zzz.style.cssText = `
      position:absolute; left:${cx}px; top:${cy}px;
      color:#8888ff; font-size:16px; font-weight:bold;
      pointer-events:none; z-index:60; transform:translateX(-50%);
      animation: coin-fly 1.5s ease-out forwards;
    `;
    zzz.textContent = "💤";
    this.container.appendChild(zzz);
    setTimeout(() => zzz.remove(), 1500);
  }

  private spawnSpark(x: number, y: number) {
    const spark = document.createElement("div");
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 40;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const size = 3 + Math.random() * 4;
    const colors = ["#ffd700", "#ff4422", "#ff8844", "#ffee88"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    spark.style.cssText = `
      position:absolute; left:${x}px; top:${y}px;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; box-shadow:0 0 4px ${color};
      pointer-events:none; z-index:65;
      animation: debris-fly 0.4s ease-out forwards;
      --tx:${tx}px; --ty:${ty}px;
    `;
    this.container.appendChild(spark);
    setTimeout(() => spark.remove(), 400);
  }

  private screenShake(intensity: number, duration: number) {
    if (this._calmMode) return;
    const el = this.container;
    const orig = el.style.transform;
    let start = 0;

    const shake = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      if (elapsed >= duration) { el.style.transform = orig; return; }
      const decay = 1 - elapsed / duration;
      const dx = (Math.random() - 0.5) * intensity * 2 * decay;
      const dy = (Math.random() - 0.5) * intensity * 2 * decay;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(shake);
    };
    requestAnimationFrame(shake);
  }

  static injectStyles() {
    if (document.getElementById("bomb-vfx-styles")) return;
    const style = document.createElement("style");
    style.id = "bomb-vfx-styles";
    style.textContent = `
      @keyframes bomb-explode {
        0% { transform: scale(0.3); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      @keyframes chest-glow {
        0% { transform: scale(0.5); opacity: 0; }
        40% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
      @keyframes coin-fly {
        0% { transform: translateX(-50%) translateY(0); opacity: 1; }
        100% { transform: translateX(-50%) translateY(-50px); opacity: 0; }
      }
      @keyframes debris-fly {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
