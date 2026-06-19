export type TileType = "floor" | "block" | "wall" | "chest" | "spawn";

export interface MapConfig {
  width: number;
  height: number;
  blockDensity: number;
  chestCount: number;
  wallCount: number;
  difficulty: number;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: TileType[][];
  spawnPoints: Array<{ x: number; y: number }>;
  chestPositions: Array<{ x: number; y: number }>;
}

const DEFAULT_CONFIG: MapConfig = {
  width: 16,
  height: 12,
  blockDensity: 0.35,
  chestCount: 8,
  wallCount: 12,
  difficulty: 1,
};

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMap(seed: number, configOverride?: Partial<MapConfig>): GameMap {
  const cfg = { ...DEFAULT_CONFIG, ...configOverride };
  const rng = seededRng(seed);
  const tiles: TileType[][] = [];

  for (let y = 0; y < cfg.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < cfg.width; x++) {
      if (x === 0 || x === cfg.width - 1 || y === 0 || y === cfg.height - 1) {
        tiles[y][x] = "wall";
      } else {
        tiles[y][x] = "floor";
      }
    }
  }

  const spawnPoints: Array<{ x: number; y: number }> = [];
  const spawnZone = [
    { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 },
    { x: 2, y: 2 }, { x: 3, y: 1 }, { x: 1, y: 3 },
  ];
  for (const sp of spawnZone) {
    if (sp.x < cfg.width - 1 && sp.y < cfg.height - 1) {
      tiles[sp.y][sp.x] = "spawn";
      spawnPoints.push(sp);
    }
  }

  const safeZone = new Set(spawnZone.map((s) => `${s.x},${s.y}`));
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const sp of spawnZone) {
        safeZone.add(`${sp.x + dx},${sp.y + dy}`);
      }
    }
  }

  let wallsPlaced = 0;
  while (wallsPlaced < cfg.wallCount) {
    const x = 1 + Math.floor(rng() * (cfg.width - 2));
    const y = 1 + Math.floor(rng() * (cfg.height - 2));
    const key = `${x},${y}`;
    if (!safeZone.has(key) && tiles[y][x] === "floor") {
      tiles[y][x] = "wall";
      wallsPlaced++;
    }
  }

  for (let y = 1; y < cfg.height - 1; y++) {
    for (let x = 1; x < cfg.width - 1; x++) {
      const key = `${x},${y}`;
      if (tiles[y][x] === "floor" && !safeZone.has(key) && rng() < cfg.blockDensity) {
        tiles[y][x] = "block";
      }
    }
  }

  const chestPositions: Array<{ x: number; y: number }> = [];
  let chestsPlaced = 0;
  const scaledChests = Math.round(cfg.chestCount * (1 + (cfg.difficulty - 1) * 0.2));

  while (chestsPlaced < scaledChests) {
    const x = 1 + Math.floor(rng() * (cfg.width - 2));
    const y = 1 + Math.floor(rng() * (cfg.height - 2));
    if (tiles[y][x] === "block") {
      tiles[y][x] = "chest";
      chestPositions.push({ x, y });
      chestsPlaced++;
    }
  }

  return { width: cfg.width, height: cfg.height, tiles, spawnPoints, chestPositions };
}

export function mapConfigForStage(chapter: number, stage: number): Partial<MapConfig> {
  const difficulty = (chapter - 1) * 10 + stage;
  return {
    blockDensity: Math.min(0.5, 0.3 + difficulty * 0.004),
    chestCount: Math.min(15, 5 + Math.floor(difficulty / 5)),
    wallCount: Math.min(25, 8 + Math.floor(difficulty / 3)),
    difficulty,
  };
}
