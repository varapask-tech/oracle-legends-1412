export type Pose = "idle" | "attack" | "hit" | "victory" | "dead";

export interface SpriteSet {
  idle: string;
  attack: string;
  hit: string;
  victory: string;
}

const SPRITE_BASE = "/assets/sprites";

export function getSpriteSet(heroId: string): SpriteSet {
  return {
    idle: `${SPRITE_BASE}/${heroId}-idle.png`,
    attack: `${SPRITE_BASE}/${heroId}-attack.png`,
    hit: `${SPRITE_BASE}/${heroId}-hit.png`,
    victory: `${SPRITE_BASE}/${heroId}-victory.png`,
  };
}

const PORTRAIT_BASE = "/assets/characters";
const PORTRAIT_MAP: Record<string, string> = {
  "zero-void": `${PORTRAIT_BASE}/mr0-zero.png`,
  "one-thunder": `${PORTRAIT_BASE}/mr1-thunder.png`,
  "two-crystal": `${PORTRAIT_BASE}/ms2-crystal.png`,
  "three-bloom": `${PORTRAIT_BASE}/ms3-creative.png`,
  "four-aegis": `${PORTRAIT_BASE}/mr4-wellness.png`,
  "aria-flameblade": `${PORTRAIT_BASE}/aria-flame.png`,
  "luna-tideweaver": `${PORTRAIT_BASE}/luna-tide.png`,
  "kael-stoneguard": `${PORTRAIT_BASE}/kael-stone.png`,
  "nyx-shadowstep": `${PORTRAIT_BASE}/nyx-shadow.png`,
  "sol-lightbringer": `${PORTRAIT_BASE}/sol-dawn.png`,
  "frost-whisper": `${PORTRAIT_BASE}/frost-whisper.png`,
  "ember-phoenix": `${PORTRAIT_BASE}/ember-phoenix.png`,
};

export function getPortrait(heroId: string): string {
  return PORTRAIT_MAP[heroId] ?? "";
}

interface AnimState {
  pose: Pose;
  progress: number;
  duration: number;
  onComplete?: () => void;
}

export class SpriteAnimator {
  private el: HTMLImageElement;
  private sprites: SpriteSet;
  private fallbackUrl: string;
  private state: AnimState;
  private baseX: number;
  private baseY: number;
  private facingRight: boolean;
  private container: HTMLElement;
  private spriteSize: number;
  private useFallback = false;

  constructor(opts: {
    container: HTMLElement;
    heroId: string;
    x: number;
    y: number;
    facingRight: boolean;
    size?: number;
    borderColor?: string;
  }) {
    this.container = opts.container;
    this.baseX = opts.x;
    this.baseY = opts.y;
    this.facingRight = opts.facingRight;
    this.spriteSize = opts.size ?? 96;
    this.sprites = getSpriteSet(opts.heroId);
    this.fallbackUrl = getPortrait(opts.heroId);

    this.el = document.createElement("img");
    this.el.style.cssText = `
      position:absolute; width:${this.spriteSize}px; height:${this.spriteSize}px;
      object-fit:contain; image-rendering:auto;
      left:${this.baseX - this.spriteSize / 2}px;
      top:${this.baseY - this.spriteSize / 2}px;
      ${!this.facingRight ? "transform:scaleX(-1);" : ""}
      transition:left 0.3s ease, top 0.15s ease;
      filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));
      z-index:5;
    `;
    this.el.src = this.sprites.idle;
    this.el.onerror = () => {
      this.useFallback = true;
      this.el.src = this.fallbackUrl;
      this.el.style.borderRadius = "10px";
      this.el.style.border = `2px solid ${opts.borderColor ?? "#ffd700"}`;
      this.el.style.background = "rgba(10,5,20,0.7)";
    };
    this.container.appendChild(this.el);

    this.state = { pose: "idle", progress: 0, duration: 0 };
  }

  setPose(pose: Pose, duration = 0.5, onComplete?: () => void): void {
    this.state = { pose, progress: 0, duration, onComplete };
    if (!this.useFallback) {
      const src = pose === "dead" ? this.sprites.hit : this.sprites[pose];
      if (this.el.src !== src) this.el.src = src;
    }
  }

  playAttack(targetX: number, targetY: number, onHit: () => void): void {
    const midX = this.baseX + (targetX - this.baseX) * 0.6;
    const midY = this.baseY + (targetY - this.baseY) * 0.3;

    this.setPose("attack", 0.8);
    this.moveTo(midX, midY);
    this.el.style.transform = this.facingRight ? "scale(1.15)" : "scaleX(-1) scale(1.15)";

    setTimeout(() => {
      onHit();
      setTimeout(() => {
        this.moveTo(this.baseX, this.baseY);
        this.el.style.transform = this.facingRight ? "" : "scaleX(-1)";
        setTimeout(() => this.setPose("idle"), 300);
      }, 200);
    }, 300);
  }

  playHit(): void {
    this.setPose("hit", 0.4, () => this.setPose("idle"));
    this.el.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5)) brightness(2)";
    const shakeOffset = (Math.random() - 0.5) * 10;
    this.el.style.left = `${this.baseX - this.spriteSize / 2 + shakeOffset}px`;
    setTimeout(() => {
      this.el.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5))";
      this.el.style.left = `${this.baseX - this.spriteSize / 2}px`;
    }, 150);
  }

  playDeath(): void {
    this.setPose("dead");
    this.el.style.transition = "opacity 0.8s, transform 0.8s, filter 0.8s";
    this.el.style.opacity = "0.3";
    this.el.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5)) grayscale(1)";
    this.el.style.transform = (this.facingRight ? "" : "scaleX(-1) ") + "scale(0.7) translateY(20px)";
  }

  playVictory(): void {
    this.setPose("victory");
    this.el.style.transition = "transform 0.3s";
    this.el.style.transform = (this.facingRight ? "" : "scaleX(-1) ") + "translateY(-15px)";
    setTimeout(() => {
      this.el.style.transform = this.facingRight ? "" : "scaleX(-1)";
    }, 500);
  }

  private moveTo(x: number, y: number): void {
    this.el.style.left = `${x - this.spriteSize / 2}px`;
    this.el.style.top = `${y - this.spriteSize / 2}px`;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.baseX, y: this.baseY };
  }

  update(dt: number): void {
    if (this.state.duration > 0) {
      this.state.progress += dt;
      if (this.state.progress >= this.state.duration) {
        this.state.duration = 0;
        this.state.onComplete?.();
      }
    }

    if (this.state.pose === "idle" && !this.useFallback) {
      const breathe = Math.sin(performance.now() / 500) * 3;
      this.el.style.top = `${this.baseY - this.spriteSize / 2 + breathe}px`;
    }
  }

  destroy(): void {
    this.el.remove();
  }
}

export const FORMATION_HERO = [
  { x: 0.20, y: 0.35 },
  { x: 0.12, y: 0.50 },
  { x: 0.20, y: 0.65 },
  { x: 0.08, y: 0.42 },
  { x: 0.08, y: 0.58 },
];

export const FORMATION_ENEMY = [
  { x: 0.75, y: 0.40 },
  { x: 0.83, y: 0.55 },
  { x: 0.75, y: 0.60 },
];
