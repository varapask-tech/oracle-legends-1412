export type TileType = "floor" | "block" | "wall" | "chest";

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  variant: number;
}

export const TILE_SIZE = 32;
export const MAP_COLS = Math.floor(window.innerWidth / TILE_SIZE);
export const MAP_ROWS = Math.floor(window.innerHeight / TILE_SIZE);

const TILESET_SRC = "/assets/sprites/tileset-bombergame.png";
const TS = 64;

const TILE_UV: Record<string, { col: number; row: number }> = {
  grass0:  { col: 0, row: 0 },
  grass1:  { col: 1, row: 0 },
  stone:   { col: 2, row: 0 },
  dirt:    { col: 3, row: 0 },
  crate:   { col: 0, row: 1 },
  rubble:  { col: 1, row: 1 },
  bush:    { col: 2, row: 1 },
  ice:     { col: 3, row: 1 },
  chest:   { col: 0, row: 2 },
  gold:    { col: 1, row: 2 },
  bomb:    { col: 2, row: 2 },
  explode: { col: 3, row: 2 },
};

export class GridMap {
  tiles: Tile[][] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileset: HTMLImageElement | null = null;
  private tilesetReady = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = MAP_COLS * TILE_SIZE;
    this.canvas.height = MAP_ROWS * TILE_SIZE;
    this.canvas.style.cssText = "display:block; image-rendering:pixelated;";
    this.ctx = this.canvas.getContext("2d")!;

    const img = new Image();
    img.onload = () => {
      this.tileset = img;
      this.tilesetReady = true;
      this.render();
    };
    img.src = TILESET_SRC;
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
          const blockChance = 0.58 + difficulty * 0.04;
          const chestChance = 0.08 + difficulty * 0.02;
          if (roll < chestChance) type = "chest";
          else if (roll < chestChance + blockChance) type = "block";
        }
        row.push({ type, x, y, variant: Math.random() < 0.5 ? 0 : 1 });
      }
      this.tiles.push(row);
    }

    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        if (y < MAP_ROWS && x < MAP_COLS) this.tiles[y][x].type = "floor";
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

        if (this.tilesetReady && this.tileset) {
          this.drawTile(ctx, px, py, tile);
        } else {
          this.drawFallback(ctx, px, py, tile, x, y);
        }
      }
    }
  }

  private drawTile(ctx: CanvasRenderingContext2D, px: number, py: number, tile: Tile): void {
    const floorUV = tile.variant === 0 ? TILE_UV.grass0 : TILE_UV.grass1;
    ctx.drawImage(this.tileset!, floorUV.col * TS, floorUV.row * TS, TS, TS, px, py, TILE_SIZE, TILE_SIZE);

    if (tile.type === "wall") {
      const uv = TILE_UV.stone;
      ctx.drawImage(this.tileset!, uv.col * TS, uv.row * TS, TS, TS, px, py, TILE_SIZE, TILE_SIZE);
    } else if (tile.type === "block") {
      const uv = tile.variant === 0 ? TILE_UV.crate : TILE_UV.bush;
      ctx.drawImage(this.tileset!, uv.col * TS, uv.row * TS, TS, TS, px, py, TILE_SIZE, TILE_SIZE);
    } else if (tile.type === "chest") {
      const uv = TILE_UV.chest;
      ctx.drawImage(this.tileset!, uv.col * TS, uv.row * TS, TS, TS, px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  private drawFallback(ctx: CanvasRenderingContext2D, px: number, py: number, tile: Tile, x: number, y: number): void {
    ctx.fillStyle = (x + y) % 2 === 0 ? "#3a6a2a" : "#326025";
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    if (tile.type === "wall") {
      ctx.fillStyle = "#6a6a7a";
      ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    } else if (tile.type === "block") {
      ctx.fillStyle = "#c4a060";
      ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    } else if (tile.type === "chest") {
      ctx.fillStyle = "#daa520";
      ctx.fillRect(px + 2, py + 4, TILE_SIZE - 4, TILE_SIZE - 6);
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
