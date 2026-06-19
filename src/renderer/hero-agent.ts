import { GridMap, TILE_SIZE, MAP_COLS, MAP_ROWS } from "./grid-map";
import { BombManager } from "./bomb";
import type { HeroTemplate } from "../shared/types";
import { getPortrait } from "./sprite-animator";

const TD_SPRITE_MAP: Record<string, string> = {
  "zero-void": "td-mr0-zero.png",
  "one-thunder": "td-mr1-one.png",
  "two-crystal": "td-ms2-crystal.png",
  "three-bloom": "td-ms3-creative.png",
  "four-aegis": "td-mr4-wellness.png",
  "aria-flameblade": "td-aria-flame.png",
  "luna-tideweaver": "td-luna-tide.png",
  "kael-stoneguard": "td-kael-stone.png",
  "nyx-shadowstep": "td-nyx-shadow.png",
  "sol-lightbringer": "td-sol-dawn.png",
  "frost-whisper": "td-frost-whisper.png",
  "ember-phoenix": "td-ember-phoenix.png",
};

const RGB_SPRITES = new Set(["zero-void", "one-thunder", "three-bloom", "four-aegis"]);

type Direction = "up" | "down" | "left" | "right";

const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};

const SPRITE_DIR: Record<Direction, { row: number; colBase: number }> = {
  down: { row: 0, colBase: 0 }, right: { row: 0, colBase: 2 },
  up: { row: 1, colBase: 0 }, left: { row: 1, colBase: 2 },
};

const RARITY_CFG: Record<string, { bonus: number; bombs: number; cd: number; pierce: boolean; walk: boolean; border: string }> = {
  legendary: { bonus: 3, bombs: 4, cd: 0.6, pierce: true, walk: true, border: "#ffd700" },
  epic:      { bonus: 2, bombs: 3, cd: 0.8, pierce: true, walk: true, border: "#aa44ff" },
  rare:      { bonus: 1.5, bombs: 2, cd: 1.0, pierce: false, walk: false, border: "#4488ff" },
  uncommon:  { bonus: 1.2, bombs: 1, cd: 1.5, pierce: false, walk: false, border: "#44bb44" },
  common:    { bonus: 1, bombs: 1, cd: 1.5, pierce: false, walk: false, border: "#888" },
};

export class HeroAgent {
  id: string;
  template: HeroTemplate;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  direction: Direction = "down";
  bombRange: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  alive = true;
  canWalkThroughBlocks: boolean;

  private el: HTMLElement;
  private shadow: HTMLElement;
  private staminaBar: HTMLElement;
  private nameLabel: HTMLElement;
  private moveTimer = 0;
  private moveInterval: number;
  private bombCooldown = 0;
  private baseCooldown: number;
  private maxBombs: number;
  private pierce: boolean;
  private container: HTMLElement;
  private map: GridMap;
  private bombs: BombManager;
  private animFrame = 0;
  private animTimer = 0;
  private hasSheet: boolean;
  private resting = false;
  private restTimer = 0;
  private restDuration: number;

  constructor(opts: { id: string; template: HeroTemplate; startX: number; startY: number; container: HTMLElement; map: GridMap; bombs: BombManager }) {
    this.id = opts.id;
    this.template = opts.template;
    this.gridX = opts.startX;
    this.gridY = opts.startY;
    this.pixelX = opts.startX * TILE_SIZE;
    this.pixelY = opts.startY * TILE_SIZE;
    this.container = opts.container;
    this.map = opts.map;
    this.bombs = opts.bombs;

    const r = RARITY_CFG[opts.template.rarity] ?? RARITY_CFG.common;
    this.bombRange = Math.floor(1 + opts.template.baseStats.atk / 60 * r.bonus);
    this.speed = (0.6 + opts.template.baseStats.spd / 150) * r.bonus;
    this.moveInterval = 0.35 / this.speed;
    this.maxStamina = Math.floor((8 + opts.template.baseStats.hp / 80) * r.bonus);
    this.stamina = this.maxStamina;
    this.canWalkThroughBlocks = r.walk;
    this.maxBombs = r.bombs;
    this.baseCooldown = r.cd;
    this.pierce = r.pierce;
    this.restDuration = r.bonus >= 2 ? 5 : 8;

    const tdSprite = TD_SPRITE_MAP[opts.template.id];
    const portrait = getPortrait(opts.template.id);
    this.hasSheet = !!tdSprite;
    const bgImage = tdSprite ? `url('/assets/sprites/${tdSprite}')` : (portrait ? `url('${portrait}')` : "none");
    const size = TILE_SIZE - 2;

    this.shadow = document.createElement("div");
    this.shadow.style.cssText = `position:absolute;width:${size * 0.7}px;height:${size * 0.3}px;border-radius:50%;background:rgba(0,0,0,0.35);pointer-events:none;z-index:9;left:${this.pixelX + 1 + size * 0.15}px;top:${this.pixelY + size * 0.75}px;transition:left 0.12s linear,top 0.12s linear;`;
    this.container.appendChild(this.shadow);

    this.el = document.createElement("div");
    const fallbackBg = !tdSprite && !portrait ? `background-color:#${opts.template.modelColor.toString(16).padStart(6, "0")};` : "";
    const needsBlend = RGB_SPRITES.has(opts.template.id);
    const blendCss = needsBlend ? "mix-blend-mode:screen;background-color:#000;" : "";
    this.el.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:${tdSprite ? "4px" : "8px"};z-index:10;transition:left 0.12s linear,top 0.12s linear;background:${bgImage} center/contain no-repeat;${fallbackBg}border:2px solid ${r.border};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));left:${this.pixelX + 1}px;top:${this.pixelY + 1}px;transform:scaleX(1);${blendCss}`;
    if (this.hasSheet) {
      this.el.style.backgroundSize = `${size * 4}px ${size * 2}px`;
      this.el.style.backgroundPosition = "0px 0px";
    }
    this.container.appendChild(this.el);

    this.staminaBar = document.createElement("div");
    this.staminaBar.style.cssText = `position:absolute;width:${size}px;height:3px;border-radius:2px;background:#333;pointer-events:none;z-index:11;left:${this.pixelX + 1}px;top:${this.pixelY - 2}px;transition:left 0.12s linear,top 0.12s linear;overflow:hidden;`;
    this.staminaBar.innerHTML = `<div style="width:100%;height:100%;background:#44ff44;border-radius:2px;transition:width 0.3s;"></div>`;
    this.container.appendChild(this.staminaBar);

    this.nameLabel = document.createElement("div");
    this.nameLabel.style.cssText = `position:absolute;font-size:8px;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none;z-index:11;white-space:nowrap;left:${this.pixelX + size / 2}px;top:${this.pixelY - 10}px;transform:translateX(-50%);transition:left 0.12s linear,top 0.12s linear;`;
    this.nameLabel.textContent = opts.template.name;
    this.container.appendChild(this.nameLabel);
  }

  update(dt: number): void {
    if (!this.alive) return;
    const pct = Math.max(0, this.stamina / this.maxStamina);
    const fill = this.staminaBar.firstElementChild as HTMLElement;
    if (fill) { fill.style.width = `${pct * 100}%`; fill.style.background = pct > 0.5 ? "#44ff44" : pct > 0.2 ? "#ffaa00" : "#ff4444"; }

    if (this.stamina <= 0 || this.resting) {
      if (!this.resting) { this.resting = true; this.restTimer = this.restDuration; this.el.style.opacity = "0.4"; this.nameLabel.textContent = "💤"; }
      this.restTimer -= dt;
      if (fill) fill.style.width = `${(1 - this.restTimer / this.restDuration) * 100}%`;
      if (this.restTimer <= 0) {
        this.resting = false;
        this.stamina = this.maxStamina;
        this.el.style.opacity = "1";
        this.nameLabel.textContent = this.template.name;
      }
      return;
    }
    this.animTimer += dt;
    if (this.animTimer > 0.2) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

    const bounce = this.animFrame === 0 ? 0 : -4;
    this.el.style.transform = `scaleX(${this.direction === "left" ? -1 : 1}) translateY(${bounce}px)`;

    if (this.hasSheet) {
      const d = SPRITE_DIR[this.direction];
      const s = TILE_SIZE - 2;
      this.el.style.backgroundPosition = `${-(d.colBase + this.animFrame) * s}px ${-d.row * s}px`;
    }

    if (this.bombCooldown > 0) this.bombCooldown -= dt;
    this.moveTimer += dt;
    if (this.moveTimer >= this.moveInterval) { this.moveTimer -= this.moveInterval; this.think(); }
  }

  private think(): void {
    const target = this.findNearestDestroyable();
    if (target && this.isAdjacent(target.x, target.y) && this.bombCooldown <= 0 && this.bombs.countBombsByOwner(this.id) < this.maxBombs) {
      if (this.bombs.placeBomb(this.gridX, this.gridY, this.bombRange, this.id, this.pierce)) {
        this.stamina--;
        this.bombCooldown = this.baseCooldown;
        this.tryMove(["up", "down", "left", "right"], false);
        return;
      }
    }
    if (target) this.moveToward(target.x, target.y);
    else this.tryMove(["up", "down", "left", "right"], true);
  }

  private findNearestDestroyable(): { x: number; y: number } | null {
    let best: { x: number; y: number; dist: number } | null = null;
    for (let y = 1; y < MAP_ROWS - 1; y++) {
      for (let x = 1; x < MAP_COLS - 1; x++) {
        const tile = this.map.getTile(x, y);
        if (tile && (tile.type === "block" || tile.type === "chest")) {
          const dist = Math.abs(x - this.gridX) + Math.abs(y - this.gridY);
          if (!best || dist < best.dist) best = { x, y, dist };
        }
      }
    }
    return best;
  }

  private isAdjacent(tx: number, ty: number): boolean {
    return Math.abs(tx - this.gridX) + Math.abs(ty - this.gridY) === 1;
  }

  private moveToward(tx: number, ty: number): void {
    const dx = tx - this.gridX, dy = ty - this.gridY;
    const dirs: Direction[] = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
      dirs.push(dx > 0 ? "right" : "left", dy > 0 ? "down" : "up");
    } else {
      dirs.push(dy > 0 ? "down" : "up", dx > 0 ? "right" : "left");
    }
    for (const dir of dirs) {
      const [ddx, ddy] = DIR_DELTA[dir];
      if (this.canMove(this.gridX + ddx, this.gridY + ddy)) { this.moveTo(this.gridX + ddx, this.gridY + ddy, dir); return; }
    }
    this.tryMove(["up", "down", "left", "right"], true);
  }

  private tryMove(dirs: Direction[], shuffle: boolean): void {
    const list = shuffle ? [...dirs].sort(() => Math.random() - 0.5) : dirs;
    for (const dir of list) {
      const [dx, dy] = DIR_DELTA[dir];
      const nx = this.gridX + dx, ny = this.gridY + dy;
      if (this.canMove(nx, ny)) { this.moveTo(nx, ny, dir); return; }
    }
  }

  private canMove(x: number, y: number): boolean {
    if (this.bombs.hasBombAt(x, y)) return false;
    const tile = this.map.getTile(x, y);
    if (!tile || tile.type === "wall") return false;
    return tile.type === "floor" || this.canWalkThroughBlocks;
  }

  private moveTo(x: number, y: number, dir: Direction): void {
    this.gridX = x; this.gridY = y; this.direction = dir;
    this.pixelX = x * TILE_SIZE; this.pixelY = y * TILE_SIZE;
    const s = TILE_SIZE - 2;
    this.el.style.left = `${this.pixelX + 1}px`;
    this.el.style.top = `${this.pixelY + 1}px`;
    this.shadow.style.left = `${this.pixelX + 1 + s * 0.15}px`;
    this.shadow.style.top = `${this.pixelY + s * 0.75}px`;
    this.staminaBar.style.left = `${this.pixelX + 1}px`;
    this.staminaBar.style.top = `${this.pixelY - 2}px`;
    this.nameLabel.style.left = `${this.pixelX + s / 2}px`;
    this.nameLabel.style.top = `${this.pixelY - 10}px`;
  }

  destroy(): void { this.el.remove(); this.shadow.remove(); this.staminaBar.remove(); this.nameLabel.remove(); this.alive = false; }
}
