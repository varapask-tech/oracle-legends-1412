export type Pose = "idle" | "walk" | "attack" | "skill" | "hit" | "death" | "victory";

const SPRITE_BASE = "/assets/sprites";
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

type RenderMode = "poses" | "sheet" | "portrait";

export class SpriteAnimator {
  private el: HTMLElement;
  private baseX: number;
  private baseY: number;
  private facingRight: boolean;
  private container: HTMLElement;
  private displaySize: number;
  private mode: RenderMode = "portrait";
  private currentPose: Pose = "idle";
  private heroId: string;
  private sheetPoseMap: Record<string, { col: number; row: number }> = {
    idle: { col: 0, row: 0 },
    attack: { col: 1, row: 0 },
    hit: { col: 0, row: 1 },
    victory: { col: 1, row: 1 },
  };

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
    this.displaySize = opts.size ?? 96;

    this.el = document.createElement("div");
    this.el.style.cssText = `
      position:absolute; width:${this.displaySize}px; height:${this.displaySize}px;
      left:${this.baseX - this.displaySize / 2}px;
      top:${this.baseY - this.displaySize / 2}px;
      ${!this.facingRight ? "transform:scaleX(-1);" : ""}
      transition:left 0.3s ease, top 0.15s ease;
      filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));
      z-index:5;
      background-size:contain; background-repeat:no-repeat; background-position:center;
    `;
    this.container.appendChild(this.el);

    this.tryLoadPoses(opts.borderColor ?? "#ffd700");
  }

  private tryLoadPoses(borderColor: string): void {
    const idleUrl = `${SPRITE_BASE}/${this.heroId}-idle.png`;
    const img = new Image();
    img.onload = () => {
      this.mode = "poses";
      this.el.style.backgroundImage = `url('${idleUrl}')`;
    };
    img.onerror = () => this.tryLoadSheet(borderColor);
    img.src = idleUrl;
  }

  private tryLoadSheet(borderColor: string): void {
    const sheetUrl = `${SPRITE_BASE}/${this.heroId}-sprites.png`;
    const img = new Image();
    img.onload = () => {
      this.mode = "sheet";
      this.el.style.backgroundImage = `url('${sheetUrl}')`;
      this.el.style.backgroundSize = "200% 200%";
      this.el.style.backgroundPosition = "0% 0%";
    };
    img.onerror = () => this.loadPortrait(borderColor);
    img.src = sheetUrl;
  }

  private loadPortrait(borderColor: string): void {
    this.mode = "portrait";
    const url = getPortrait(this.heroId);
    if (url) {
      this.el.style.backgroundImage = `url('${url}')`;
    }
    this.el.style.borderRadius = "10px";
    this.el.style.border = `2px solid ${borderColor}`;
    this.el.style.backgroundColor = "rgba(10,5,20,0.7)";
  }

  private showPose(pose: string): void {
    if (this.mode === "poses") {
      const mapped = (pose === "walk" || pose === "skill") ? "idle" : pose === "death" ? "hit" : pose;
      this.el.style.backgroundImage = `url('${SPRITE_BASE}/${this.heroId}-${mapped}.png')`;
    } else if (this.mode === "sheet") {
      const mapped = (pose === "walk" || pose === "skill") ? "idle" : pose === "death" ? "hit" : pose;
      const pos = this.sheetPoseMap[mapped] ?? { col: 0, row: 0 };
      this.el.style.backgroundPosition = `${pos.col * 100}% ${pos.row * 100}%`;
    }
  }

  setPose(pose: Pose, onComplete?: () => void): void {
    this.currentPose = pose;
    this.showPose(pose);
    if (onComplete) {
      setTimeout(() => onComplete(), 400);
    }
  }

  playAttack(targetX: number, targetY: number, onHit: () => void): void {
    const midX = this.baseX + (targetX - this.baseX) * 0.6;
    const midY = this.baseY + (targetY - this.baseY) * 0.3;

    this.setPose("walk");
    this.moveTo(midX, midY);
    this.el.style.transform = this.facingRight ? "scale(1.15)" : "scaleX(-1) scale(1.15)";

    setTimeout(() => {
      this.setPose("attack");
      setTimeout(() => {
        onHit();
        setTimeout(() => {
          this.setPose("walk");
          this.moveTo(this.baseX, this.baseY);
          this.el.style.transform = this.facingRight ? "" : "scaleX(-1)";
          setTimeout(() => this.setPose("idle"), 350);
        }, 200);
      }, 200);
    }, 300);
  }

  playHit(): void {
    this.setPose("hit", () => this.setPose("idle"));
    this.el.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5)) brightness(2)";
    const shake = (Math.random() - 0.5) * 12;
    this.el.style.left = `${this.baseX - this.displaySize / 2 + shake}px`;
    setTimeout(() => {
      this.el.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5))";
      this.el.style.left = `${this.baseX - this.displaySize / 2}px`;
    }, 150);
  }

  playDeath(): void {
    this.setPose("death");
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
    }, 600);
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
      const breathe = Math.sin(performance.now() / 500) * 3;
      this.el.style.top = `${this.baseY - this.displaySize / 2 + breathe}px`;
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
