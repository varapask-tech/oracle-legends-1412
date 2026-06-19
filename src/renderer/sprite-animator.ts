export type Pose = "idle" | "walk" | "attack" | "skill" | "hit" | "death" | "victory";

const SPRITE_BASE = "/assets/sprites";
const PORTRAIT_BASE = "/assets/characters";

const SPRITE_SHEET_MAP: Record<string, string> = {
  "zero-void": "mr0-zero-sprites.png",
  "one-thunder": "mr1-thunder-sprites.png",
  "two-crystal": "ms2-crystal-sprites.png",
  "three-bloom": "ms3-creative-sprites.png",
  "four-aegis": "mr4-wellness-sprites.png",
  "aria-flameblade": "aria-flame-sprites.png",
  "luna-tideweaver": "luna-tide-sprites.png",
  "kael-stoneguard": "kael-iron-sprites.png",
  "nyx-shadowstep": "nyx-shadow-sprites.png",
  "sol-lightbringer": "sol-dawn-sprites.png",
  "frost-whisper": "frost-whisper-sprites.png",
  "ember-phoenix": "ember-phoenix-sprites.png",
};

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

const SHEET_POSITIONS: Record<string, string> = {
  idle:    "0% 0%",
  walk:    "0% 0%",
  attack:  "100% 0%",
  skill:   "100% 0%",
  hit:     "0% 100%",
  death:   "0% 100%",
  victory: "100% 100%",
};

export class SpriteAnimator {
  private el: HTMLElement;
  private baseX: number;
  private baseY: number;
  private facingRight: boolean;
  private container: HTMLElement;
  private displaySize: number;
  private currentPose: Pose = "idle";
  private heroId: string;
  private hasSheet = false;

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
    this.heroId = opts.heroId;
    this.baseX = opts.x;
    this.baseY = opts.y;
    this.facingRight = opts.facingRight;
    this.displaySize = opts.size ?? 140;

    this.el = document.createElement("div");
    this.el.style.cssText = `
      position:absolute;
      width:${this.displaySize}px; height:${this.displaySize}px;
      left:${this.baseX - this.displaySize / 2}px;
      top:${this.baseY - this.displaySize / 2}px;
      ${!this.facingRight ? "transform:scaleX(-1);" : ""}
      transition:left 0.35s ease-out, top 0.2s ease-out;
      filter:drop-shadow(0 6px 12px rgba(0,0,0,0.6));
      z-index:5;
      background-size:contain; background-repeat:no-repeat; background-position:center;
    `;
    this.container.appendChild(this.el);

    this.loadSprite(opts.borderColor ?? "#ffd700");
  }

  private loadSprite(borderColor: string): void {
    const sheetFile = SPRITE_SHEET_MAP[this.heroId];
    if (sheetFile) {
      const sheetUrl = `${SPRITE_BASE}/${sheetFile}`;
      const img = new Image();
      img.onload = () => {
        this.hasSheet = true;
        this.el.style.backgroundImage = `url('${sheetUrl}')`;
        this.el.style.backgroundSize = "200% 200%";
        this.el.style.backgroundPosition = SHEET_POSITIONS.idle;
      };
      img.onerror = () => this.loadPortrait(borderColor);
      img.src = sheetUrl;
    } else {
      this.loadPortrait(borderColor);
    }
  }

  private loadPortrait(borderColor: string): void {
    const url = getPortrait(this.heroId);
    if (url) {
      this.el.style.backgroundImage = `url('${url}')`;
    }
    this.el.style.borderRadius = "12px";
    this.el.style.border = `2px solid ${borderColor}`;
    this.el.style.backgroundColor = "rgba(10,5,20,0.7)";
  }

  setPose(pose: Pose, onComplete?: () => void): void {
    this.currentPose = pose;
    if (this.hasSheet) {
      this.el.style.backgroundPosition = SHEET_POSITIONS[pose] ?? SHEET_POSITIONS.idle;
    }
    if (onComplete) setTimeout(() => onComplete(), 400);
  }

  playAttack(targetX: number, targetY: number, onHit: () => void): void {
    const midX = this.baseX + (targetX - this.baseX) * 0.55;
    const midY = this.baseY + (targetY - this.baseY) * 0.25;

    this.moveTo(midX, midY);
    this.el.style.transform = this.facingRight ? "scale(1.2)" : "scaleX(-1) scale(1.2)";

    setTimeout(() => {
      this.setPose("attack");
      setTimeout(() => {
        onHit();
        setTimeout(() => {
          this.setPose("idle");
          this.moveTo(this.baseX, this.baseY);
          this.el.style.transform = this.facingRight ? "" : "scaleX(-1)";
        }, 250);
      }, 200);
    }, 300);
  }

  playHit(): void {
    this.setPose("hit", () => this.setPose("idle"));
    this.el.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,0.6)) brightness(2)";
    const shake = (Math.random() - 0.5) * 15;
    this.el.style.left = `${this.baseX - this.displaySize / 2 + shake}px`;
    setTimeout(() => {
      this.el.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,0.6))";
      this.el.style.left = `${this.baseX - this.displaySize / 2}px`;
    }, 180);
  }

  playDeath(): void {
    this.setPose("death");
    this.el.style.transition = "opacity 1s, transform 1s, filter 1s";
    this.el.style.opacity = "0.2";
    this.el.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,0.6)) grayscale(1)";
    this.el.style.transform = (this.facingRight ? "" : "scaleX(-1) ") + "scale(0.6) translateY(30px)";
  }

  playVictory(): void {
    this.setPose("victory");
    this.el.style.transition = "transform 0.4s ease-out";
    this.el.style.transform = (this.facingRight ? "" : "scaleX(-1) ") + "translateY(-20px) scale(1.1)";
    setTimeout(() => {
      this.el.style.transform = this.facingRight ? "" : "scaleX(-1)";
    }, 700);
  }

  private moveTo(x: number, y: number): void {
    this.el.style.left = `${x - this.displaySize / 2}px`;
    this.el.style.top = `${y - this.displaySize / 2}px`;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.baseX, y: this.baseY };
  }

  update(_dt: number): void {
    if (this.currentPose === "idle") {
      const breathe = Math.sin(performance.now() / 600) * 4;
      this.el.style.top = `${this.baseY - this.displaySize / 2 + breathe}px`;
    }
  }

  destroy(): void {
    this.el.remove();
  }
}

export const FORMATION_HERO = [
  { x: 0.18, y: 0.30 },
  { x: 0.10, y: 0.48 },
  { x: 0.18, y: 0.66 },
  { x: 0.06, y: 0.38 },
  { x: 0.06, y: 0.58 },
];

export const FORMATION_ENEMY = [
  { x: 0.78, y: 0.35 },
  { x: 0.86, y: 0.50 },
  { x: 0.78, y: 0.65 },
];
