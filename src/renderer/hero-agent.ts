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
};

type Direction = "up" | "down" | "left" | "right";

const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
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
  canWalkThroughBlocks = false;

  private el: HTMLElement;
  private moveTimer = 0;
  private moveInterval: number;
  private bombCooldown = 0;
  private container: HTMLElement;
  private map: GridMap;
  private bombs: BombManager;
  private animFrame = 0;
  private animTimer = 0;

  constructor(opts: {
    id: string;
    template: HeroTemplate;
    startX: number;
    startY: number;
    container: HTMLElement;
    map: GridMap;
    bombs: BombManager;
  }) {
    this.id = opts.id;
    this.template = opts.template;
    this.gridX = opts.startX;
    this.gridY = opts.startY;
    this.pixelX = opts.startX * TILE_SIZE;
    this.pixelY = opts.startY * TILE_SIZE;
    this.container = opts.container;
    this.map = opts.map;
    this.bombs = opts.bombs;

    const rarity = opts.template.rarity;
    const rarityBonus = rarity === "legendary" ? 3 : rarity === "epic" ? 2 : rarity === "rare" ? 1.5 : rarity === "uncommon" ? 1.2 : 1;
    this.bombRange = Math.floor(1 + opts.template.baseStats.atk / 60 * rarityBonus);
    this.speed = (0.6 + opts.template.baseStats.spd / 150) * rarityBonus;
    this.moveInterval = 0.35 / this.speed;
    this.maxStamina = Math.floor((8 + opts.template.baseStats.hp / 80) * rarityBonus);
    this.stamina = this.maxStamina;
    this.canWalkThroughBlocks = rarity === "legendary" || rarity === "epic";

    this.el = document.createElement("div");
    const tdSprite = TD_SPRITE_MAP[opts.template.id];
    const portrait = getPortrait(opts.template.id);
    const bgImage = tdSprite ? `url('/assets/sprites/${tdSprite}')` : (portrait ? `url('${portrait}')` : "none");
    const rarityBorder = rarity === "legendary" ? "#ffd700" : rarity === "epic" ? "#aa44ff" : rarity === "rare" ? "#4488ff" : rarity === "uncommon" ? "#44bb44" : "#888";
    this.el.style.cssText = `
      position:absolute; width:${TILE_SIZE - 2}px; height:${TILE_SIZE - 2}px;
      border-radius:${tdSprite ? "4px" : "8px"}; z-index:10;
      transition:left 0.12s linear, top 0.12s linear;
      background:${bgImage} center/contain no-repeat;
      ${!tdSprite && !portrait ? `background-color:#${opts.template.modelColor.toString(16).padStart(6, "0")};` : ""}
      border:2px solid ${rarityBorder};
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      left:${this.pixelX + 1}px; top:${this.pixelY + 1}px;
    `;
    this.container.appendChild(this.el);
  }

  update(dt: number): void {
    if (!this.alive || this.stamina <= 0) {
      if (this.stamina <= 0) this.el.style.opacity = "0.4";
      return;
    }

    this.animTimer += dt;
    if (this.animTimer > 0.2) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
      const bounce = this.animFrame === 0 ? 0 : -4;
      const scaleX = (this.direction === "left") ? -1 : 1;
      this.el.style.transform = `scaleX(${scaleX}) translateY(${bounce}px)`;
    }

    if (this.bombCooldown > 0) this.bombCooldown -= dt;

    this.moveTimer += dt;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer -= this.moveInterval;
      this.think();
    }
  }

  private think(): void {
    const target = this.findNearestDestroyable();

    if (target && this.isAdjacent(target.x, target.y) && this.bombCooldown <= 0) {
      if (this.bombs.placeBomb(this.gridX, this.gridY, this.bombRange, this.id)) {
        this.stamina--;
        this.bombCooldown = 1.5;
        this.moveAwayFromBomb();
        return;
      }
    }

    if (target) {
      this.moveToward(target.x, target.y);
    } else {
      this.moveRandom();
    }
  }

  private findNearestDestroyable(): { x: number; y: number } | null {
    let best: { x: number; y: number; dist: number } | null = null;
    for (let y = 1; y < MAP_ROWS - 1; y++) {
      for (let x = 1; x < MAP_COLS - 1; x++) {
        const tile = this.map.getTile(x, y);
        if (tile && (tile.type === "block" || tile.type === "chest")) {
          const dist = Math.abs(x - this.gridX) + Math.abs(y - this.gridY);
          if (!best || dist < best.dist) {
            best = { x, y, dist };
          }
        }
      }
    }
    return best;
  }

  private isAdjacent(tx: number, ty: number): boolean {
    return Math.abs(tx - this.gridX) + Math.abs(ty - this.gridY) === 1;
  }

  private moveToward(tx: number, ty: number): void {
    const dx = tx - this.gridX;
    const dy = ty - this.gridY;

    const dirs: Direction[] = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) dirs.push("right", dy > 0 ? "down" : "up");
      else dirs.push("left", dy > 0 ? "down" : "up");
    } else {
      if (dy > 0) dirs.push("down", dx > 0 ? "right" : "left");
      else dirs.push("up", dx > 0 ? "right" : "left");
    }

    for (const dir of dirs) {
      const [ddx, ddy] = DIR_DELTA[dir];
      const nx = this.gridX + ddx;
      const ny = this.gridY + ddy;
      if (this.canMove(nx, ny)) {
        this.moveTo(nx, ny, dir);
        return;
      }
    }

    this.moveRandom();
  }

  private canMove(x: number, y: number): boolean {
    if (this.bombs.hasBombAt(x, y)) return false;
    const tile = this.map.getTile(x, y);
    if (!tile) return false;
    if (tile.type === "wall") return false;
    if (tile.type === "floor") return true;
    return this.canWalkThroughBlocks;
  }

  private moveAwayFromBomb(): void {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    for (const dir of dirs) {
      const [dx, dy] = DIR_DELTA[dir];
      const nx = this.gridX + dx;
      const ny = this.gridY + dy;
      if (this.canMove(nx, ny)) {
        this.moveTo(nx, ny, dir);
        return;
      }
    }
  }

  private moveRandom(): void {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    const shuffled = dirs.sort(() => Math.random() - 0.5);
    for (const dir of shuffled) {
      const [dx, dy] = DIR_DELTA[dir];
      const nx = this.gridX + dx;
      const ny = this.gridY + dy;
      if (this.canMove(nx, ny)) {
        this.moveTo(nx, ny, dir);
        return;
      }
    }
  }

  private moveTo(x: number, y: number, dir: Direction): void {
    this.gridX = x;
    this.gridY = y;
    this.direction = dir;
    this.pixelX = x * TILE_SIZE;
    this.pixelY = y * TILE_SIZE;
    this.el.style.left = `${this.pixelX + 1}px`;
    this.el.style.top = `${this.pixelY + 1}px`;
    const scaleX = dir === "left" ? -1 : 1;
    this.el.style.transform = `scaleX(${scaleX})`;
  }

  destroy(): void {
    this.el.remove();
    this.alive = false;
  }
}
