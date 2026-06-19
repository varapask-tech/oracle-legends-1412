export type TileType = "floor" | "block" | "wall" | "chest";

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export const TILE_SIZE = 40;
export const MAP_COLS = 21;
export const MAP_ROWS = 15;

const TILE_COLORS: Record<TileType, string> = {
  floor: "#3a5a2a",
  block: "#8a6a3a",
  wall: "#4a4a5a",
  chest: "#daa520",
};

export class GridMap {
  tiles: Tile[][] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = MAP_COLS * TILE_SIZE;
    this.canvas.height = MAP_ROWS * TILE_SIZE;
    this.canvas.style.cssText = "display:block; border-radius:8px; image-rendering:pixelated;";
    this.ctx = this.canvas.getContext("2d")!;
  }

  get element() { return this.canvas; }
  get width() { return MAP_COLS * TILE_SIZE; }
  get height() { return MAP_ROWS * TILE_SIZE; }

  generate(difficulty: number = 1): void {
    this.tiles = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        let type: TileType = "floor";
        if (x === 0 || x === MAP_COLS - 1 || y === 0 || y === MAP_ROWS - 1) {
          type = "wall";
        } else if (x % 2 === 0 && y % 2 === 0) {
          type = "wall";
        } else {
          const roll = Math.random();
          const blockChance = 0.55 + difficulty * 0.05;
          const chestChance = 0.08 + difficulty * 0.02;
          if (roll < chestChance) type = "chest";
          else if (roll < chestChance + blockChance) type = "block";
        }
        row.push({ type, x, y });
      }
      this.tiles.push(row);
    }

    // clear spawn area (top-left)
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        this.tiles[y][x].type = "floor";
      }
    }
  }

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return null;
    return this.tiles[y]?.[x] ?? null;
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.type === "floor";
  }

  destroyTile(x: number, y: number): TileType | null {
    const tile = this.getTile(x, y);
    if (!tile || tile.type === "wall" || tile.type === "floor") return null;
    const was = tile.type;
    tile.type = "floor";
    return was;
  }

  render(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const tile = this.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // floor
        ctx.fillStyle = (x + y) % 2 === 0 ? "#3a6a2a" : "#326025";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (tile.type === "wall") {
          ctx.fillStyle = "#6a6a7a";
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = "#8a8a9a";
          ctx.fillRect(px + 3, py + 3, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.fillStyle = "#5a5a6a";
          ctx.fillRect(px + 5, py + 5, TILE_SIZE - 12, 2);
          ctx.fillRect(px + 5, py + TILE_SIZE - 8, TILE_SIZE - 12, 2);
        } else if (tile.type === "block") {
          ctx.fillStyle = "#c4a060";
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = "#d4b070";
          ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.fillStyle = "#b09050";
          ctx.fillRect(px + 5, py + 4, TILE_SIZE - 10, 3);
          ctx.fillRect(px + 3, py + TILE_SIZE / 2, TILE_SIZE - 8, 2);
          ctx.fillRect(px + TILE_SIZE / 2, py + 3, 2, TILE_SIZE - 8);
        } else if (tile.type === "chest") {
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(px + 2, py + 4, TILE_SIZE - 4, TILE_SIZE - 6);
          ctx.fillStyle = "#A0522D";
          ctx.fillRect(px + 4, py + 6, TILE_SIZE - 8, TILE_SIZE - 10);
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(px + TILE_SIZE / 2 - 5, py + TILE_SIZE / 2 - 4, 10, 8);
          ctx.fillStyle = "#fff44f";
          ctx.fillRect(px + TILE_SIZE / 2 - 2, py + TILE_SIZE / 2 - 1, 4, 3);
        }
      }
    }
  }

  countTilesOfType(type: TileType): number {
    let count = 0;
    for (const row of this.tiles) {
      for (const tile of row) {
        if (tile.type === type) count++;
      }
    }
    return count;
  }
}
