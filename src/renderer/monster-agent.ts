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
}

const MONSTER_TEMPLATES: Record<string, MonsterConfig> = {
  slime: {
    id: "slime",
    name: "Slime",
    type: "slime",
    hp: 1,
    speed: 0.5,
    damage: 1,
    goldReward: 15,
    crystalReward: 0,
    shardReward: 1,
    color: "#44cc44",
  },
  wolf: {
    id: "wolf",
    name: "Shadow Wolf",
    type: "wolf",
    hp: 2,
    speed: 1.2,
    damage: 2,
    goldReward: 30,
    crystalReward: 1,
    shardReward: 2,
    color: "#555577",
  },
  golem: {
    id: "golem",
    name: "Stone Golem",
    type: "golem",
    hp: 4,
    speed: 0.3,
    damage: 3,
    goldReward: 60,
    crystalReward: 3,
    shardReward: 5,
    color: "#886644",
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
}

export function spawnMonsters(
  mapWidth: number,
  mapHeight: number,
  mapLevel: number,
  isWalkable: (x: number, y: number) => boolean,
): MonsterInstance[] {
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
      gridX: gx,
      gridY: gy,
      hp: config.hp,
      alive: true,
      moveTimer: Math.random() * 2,
      direction: Math.floor(Math.random() * 4),
      stunTimer: 0,
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
  const size = tileSize * 0.7;
  const cx = x + tileSize / 2;
  const cy = y + tileSize / 2;

  ctx.save();

  if (monster.stunTimer > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
  }

  ctx.fillStyle = monster.config.color;
  if (monster.config.type === "slime") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.1, size / 2, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - size * 0.12, cy - size * 0.05, size * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.12, cy - size * 0.05, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - size * 0.1, cy - size * 0.03, size * 0.04, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.14, cy - size * 0.03, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (monster.config.type === "wolf") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, size / 2.5, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, cy - size * 0.25);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.1);
    ctx.lineTo(cx, cy - size * 0.25);
    ctx.fill();
    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.arc(cx - size * 0.08, cy - size * 0.05, size * 0.04, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.08, cy - size * 0.05, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - size / 3, cy - size / 3, size * 0.67, size * 0.67);
    ctx.fillStyle = "#aa8855";
    ctx.fillRect(cx - size / 4, cy - size / 4, size * 0.5, size * 0.5);
    ctx.fillStyle = "#ffaa33";
    ctx.beginPath();
    ctx.arc(cx - size * 0.08, cy - size * 0.05, size * 0.05, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.08, cy - size * 0.05, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  // HP bar
  if (monster.hp < monster.config.hp) {
    const barW = size * 0.8;
    const barH = 3;
    const barX = cx - barW / 2;
    const barY = cy - size / 2 - 6;
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(barX, barY, barW * (monster.hp / monster.config.hp), barH);
  }

  ctx.restore();
}

export { MONSTER_TEMPLATES };
