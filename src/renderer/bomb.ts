import { GridMap, TILE_SIZE, MAP_COLS, MAP_ROWS, type TileType } from "./grid-map";

export interface BombInstance {
  x: number;
  y: number;
  timer: number;
  range: number;
  ownerId: string;
  exploded: boolean;
  pierce: boolean;
}

export interface ExplosionResult {
  tiles: Array<{ x: number; y: number; was: TileType }>;
  cells: Array<{ x: number; y: number }>;
  heroIds: string[];
}

const BOMB_FUSE = 2.5;

export class BombManager {
  private bombs: BombInstance[] = [];
  private explosions: Array<{ x: number; y: number; timer: number; cells: Array<{ x: number; y: number }> }> = [];
  private map: GridMap;
  onExplosion?: (result: ExplosionResult) => void;

  constructor(map: GridMap) {
    this.map = map;
  }

  placeBomb(x: number, y: number, range: number, ownerId: string, pierce = false): boolean {
    if (this.bombs.some((b) => b.x === x && b.y === y)) return false;
    this.bombs.push({ x, y, timer: BOMB_FUSE, range, ownerId, exploded: false, pierce });
    return true;
  }

  countBombsByOwner(ownerId: string): number {
    return this.bombs.filter((b) => b.ownerId === ownerId && !b.exploded).length;
  }

  update(dt: number): void {
    for (const bomb of this.bombs) {
      if (bomb.exploded) continue;
      bomb.timer -= dt;
      if (bomb.timer <= 0) {
        bomb.exploded = true;
        this.detonate(bomb);
      }
    }

    this.bombs = this.bombs.filter((b) => !b.exploded);

    for (const exp of this.explosions) {
      exp.timer -= dt;
    }
    this.explosions = this.explosions.filter((e) => e.timer > 0);
  }

  private detonate(bomb: BombInstance): void {
    const cells: Array<{ x: number; y: number }> = [{ x: bomb.x, y: bomb.y }];
    const destroyed: Array<{ x: number; y: number; was: TileType }> = [];

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= bomb.range; i++) {
        const tx = bomb.x + dx * i;
        const ty = bomb.y + dy * i;
        if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) break;

        const tile = this.map.getTile(tx, ty);
        if (!tile || tile.type === "wall") break;

        cells.push({ x: tx, y: ty });

        if (tile.type === "block" || tile.type === "chest") {
          const was = this.map.destroyTile(tx, ty);
          if (was) destroyed.push({ x: tx, y: ty, was });
          if (!bomb.pierce) break;
        }
      }
    }

    this.explosions.push({ x: bomb.x, y: bomb.y, timer: 0.4, cells });

    if (this.onExplosion) {
      this.onExplosion({ tiles: destroyed, cells, heroIds: [] });
    }
  }

  hasBombAt(x: number, y: number): boolean {
    return this.bombs.some((b) => b.x === x && b.y === y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const bomb of this.bombs) {
      const px = bomb.x * TILE_SIZE + TILE_SIZE / 2;
      const py = bomb.y * TILE_SIZE + TILE_SIZE / 2;
      const pulse = 1 + Math.sin(bomb.timer * 8) * 0.15;
      const urgency = bomb.timer < 1 ? "#ff4444" : bomb.timer < 2 ? "#ffaa00" : "#222222";

      ctx.fillStyle = urgency;
      ctx.beginPath();
      ctx.arc(px, py, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.arc(px - 2, py - 14 * pulse, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(px - 1, py - 14 * pulse - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const exp of this.explosions) {
      const alpha = exp.timer / 0.4;
      for (const cell of exp.cells) {
        const px = cell.x * TILE_SIZE;
        const py = cell.y * TILE_SIZE;
        ctx.fillStyle = `rgba(255, 120, 20, ${alpha * 0.6})`;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = `rgba(255, 220, 50, ${alpha * 0.4})`;
        ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      }
    }
  }
}
