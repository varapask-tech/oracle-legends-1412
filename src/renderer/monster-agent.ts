import type { Rarity } from "../shared/types";

export interface MonsterConfig {
  id: string;
  name: string;
  type: "slime" | "wolf" | "golem";
  hp: number;
  speed: number;
  damage: number;
  goldReward: number;
  crystalReward: number;
  shardReward: number;
  color: string;
  spriteCol: number;
  spriteRow: number;
}

const MONSTER_TEMPLATES: Record<string, MonsterConfig> = {
  slime: {
    id: "slime", name: "Slime", type: "slime",
    hp: 1, speed: 0.5, damage: 1,
    goldReward: 15, crystalReward: 0, shardReward: 1,
    color: "#44cc44", spriteCol: 0, spriteRow: 0,
  },
  wolf: {
    id: "wolf", name: "Shadow Bat", type: "wolf",
    hp: 2, speed: 1.2, damage: 2,
    goldReward: 30, crystalReward: 1, shardReward: 2,
    color: "#555577", spriteCol: 2, spriteRow: 0,
  },
  golem: {
    id: "golem", name: "Skull Golem", type: "golem",
    hp: 4, speed: 0.3, damage: 3,
    goldReward: 60, crystalReward: 3, shardReward: 5,
    color: "#886644", spriteCol: 2, spriteRow: 1,
  },
};

export interface MonsterInstance {
  config: MonsterConfig;
  gridX: number;
  gridY: number;
  hp: number;
  alive: boolean;
  moveTimer: number;
  direction: number;
  stunTimer: number;
  animFrame: number;
  animTimer: number;
}

let monsterSheet: HTMLImageElement | null = null;
let sheetReady = false;

function removeBlackBg(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < 15 && px[i + 1] < 15 && px[i + 2] < 15) px[i + 3] = 0;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

let cleanSheet: HTMLCanvasElement | null = null;

function ensureSheet(): void {
  if (monsterSheet) return;
  monsterSheet = new Image();
  monsterSheet.onload = () => {
    cleanSheet = removeBlackBg(monsterSheet!);
    sheetReady = true;
  };
  monsterSheet.src = "/assets/sprites/td-monsters.png";
}

export function spawnMonsters(
  mapWidth: number,
  mapHeight: number,
  mapLevel: number,
  isWalkable: (x: number, y: number) => boolean,
): MonsterInstance[] {
  ensureSheet();
  const monsters: MonsterInstance[] = [];
  const count = Math.min(3 + Math.floor(mapLevel * 1.5), 15);
  const types = Object.keys(MONSTER_TEMPLATES);

  for (let i = 0; i < count; i++) {
    let gx: number, gy: number;
    let attempts = 0;
    do {
      gx = Math.floor(Math.random() * mapWidth);
      gy = Math.floor(Math.random() * mapHeight);
      attempts++;
    } while ((!isWalkable(gx, gy) || (gx < 4 && gy < 4)) && attempts < 100);

    if (attempts >= 100) continue;

    const typeIdx = mapLevel >= 8
      ? Math.floor(Math.random() * types.length)
      : mapLevel >= 4
        ? Math.floor(Math.random() * 2)
        : 0;

    const config = MONSTER_TEMPLATES[types[typeIdx]];

    monsters.push({
      config,
      gridX: gx, gridY: gy,
      hp: config.hp, alive: true,
      moveTimer: Math.random() * 2,
      direction: Math.floor(Math.random() * 4),
      stunTimer: 0,
      animFrame: 0,
      animTimer: Math.random(),
    });
  }

  return monsters;
}

const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

export function updateMonster(
  monster: MonsterInstance,
  dt: number,
  mapWidth: number,
  mapHeight: number,
  isWalkable: (x: number, y: number) => boolean,
): void {
  if (!monster.alive) return;

  monster.animTimer += dt;
  if (monster.animTimer > 0.35) {
    monster.animTimer = 0;
    monster.animFrame = (monster.animFrame + 1) % 2;
  }

  if (monster.stunTimer > 0) {
    monster.stunTimer -= dt;
    return;
  }

  monster.moveTimer -= dt * monster.config.speed;
  if (monster.moveTimer > 0) return;

  monster.moveTimer = 1 + Math.random() * 0.5;

  if (Math.random() < 0.3) {
    monster.direction = Math.floor(Math.random() * 4);
  }

  const dir = DIRS[monster.direction];
  const nx = monster.gridX + dir.dx;
  const ny = monster.gridY + dir.dy;

  if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight && isWalkable(nx, ny)) {
    monster.gridX = nx;
    monster.gridY = ny;
  } else {
    monster.direction = Math.floor(Math.random() * 4);
  }
}

export function damageMonster(monster: MonsterInstance, damage: number): boolean {
  if (!monster.alive) return false;
  monster.hp -= damage;
  monster.stunTimer = 0.5;
  if (monster.hp <= 0) {
    monster.alive = false;
    return true;
  }
  return false;
}

const SPRITE_SIZE = 64;

export function renderMonster(
  ctx: CanvasRenderingContext2D,
  monster: MonsterInstance,
  tileSize: number,
  offsetX: number,
  offsetY: number,
): void {
  if (!monster.alive) return;

  const x = offsetX + monster.gridX * tileSize;
  const y = offsetY + monster.gridY * tileSize;
  const drawSize = tileSize * 0.85;
  const dx = x + (tileSize - drawSize) / 2;
  const dy = y + (tileSize - drawSize) / 2;

  ctx.save();

  if (monster.stunTimer > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
  }

  if (sheetReady && cleanSheet) {
    const col = monster.config.spriteCol + monster.animFrame;
    const row = monster.config.spriteRow;
    ctx.drawImage(
      cleanSheet,
      col * SPRITE_SIZE, row * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
      dx, dy, drawSize, drawSize,
    );
  } else {
    drawFallback(ctx, monster, x, y, tileSize);
  }

  if (monster.hp < monster.config.hp) {
    const barW = drawSize * 0.8;
    const barH = 3;
    const barX = dx + (drawSize - barW) / 2;
    const barY = dy - 5;
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(barX, barY, barW * (monster.hp / monster.config.hp), barH);
  }

  ctx.restore();
}

function drawFallback(ctx: CanvasRenderingContext2D, monster: MonsterInstance, x: number, y: number, tileSize: number): void {
  const s = tileSize * 0.7, cx = x + tileSize / 2, cy = y + tileSize / 2;
  ctx.fillStyle = monster.config.color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s / 2, s / 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - s * 0.1, cy - s * 0.05, s * 0.08, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.1, cy - s * 0.05, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

export { MONSTER_TEMPLATES };
