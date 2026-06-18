import type { StageConfig } from "./types";

const CHAPTERS = [
  { chapter: 1, name: "ป่าแห่งจุดเริ่มต้น", prefix: "forest" },
  { chapter: 2, name: "ภูเขาสายฟ้า", prefix: "thunder" },
  { chapter: 3, name: "ทะเลแห่งกระจก", prefix: "mirror" },
  { chapter: 4, name: "หุบเขาเงา", prefix: "shadow" },
  { chapter: 5, name: "วิหารจักรวาล 1412", prefix: "temple" },
] as const;

const STAGE_NAMES: Record<number, string[]> = {
  1: [
    "ทางเข้าป่า", "ลำธารใส", "ต้นไม้โบราณ", "รังหมาป่า",
    "สะพานไม้", "ถ้ำเห็ดเรืองแสง", "หมู่บ้านร้าง", "หอคอยเถาวัลย์",
    "ใจกลางป่า", "ราชาป่าไม้",
  ],
  2: [
    "เชิงเขา", "ทางลาดหิน", "หน้าผาลม", "ถ้ำสายฟ้า",
    "สะพานเมฆ", "วิหารน้ำตก", "ยอดเขาน้อย", "รังอินทรี",
    "พายุบนยอด", "เทพสายฟ้า",
  ],
  3: [
    "ชายหาดกระจก", "เรือล่องลอย", "แนวปะการัง", "เมืองใต้น้ำ",
    "กระแสน้ำวน", "ปราสาทหอย", "สวนสาหร่าย", "หุบเหวทะเลลึก",
    "กระจกสะท้อน", "ราชินีทะเล",
  ],
  4: [
    "ปากหุบเขา", "เงาแรก", "ทางแยกมืด", "สุสานนักรบ",
    "แม่น้ำเงา", "หอคอยมืด", "สวนฝันร้าย", "ประตูมิติ",
    "หัวใจความมืด", "เจ้าเงา",
  ],
  5: [
    "บันไดจักรวาล", "ห้องตัวเลข", "ระเบียง Oracle", "ห้องสมุดดวงดาว",
    "สวน Resonance", "โถงกระจก Void", "บัลลังก์แสง", "มิติ 1412",
    "ห้องบัญชาการ", "Oracle ผู้สร้าง",
  ],
};

const ENEMY_POOLS: Record<number, string[]> = {
  1: ["slime", "wolf", "goblin", "treant"],
  2: ["golem", "harpy", "thunder-elemental", "storm-hawk"],
  3: ["merfolk", "sea-serpent", "mirror-shade", "coral-golem"],
  4: ["shadow-knight", "wraith", "dark-mage", "phantom"],
  5: ["void-sentinel", "star-guardian", "cosmic-mage", "oracle-construct"],
};

function pickEnemies(chapter: number, stage: number): string[] {
  const pool = ENEMY_POOLS[chapter];
  const count = stage === 10 ? 1 : Math.min(3, 1 + Math.floor(stage / 3));
  const enemies: string[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push(pool[(stage + i) % pool.length]);
  }
  if (stage === 10) {
    enemies[0] = `boss-${CHAPTERS[chapter - 1].prefix}`;
  }
  return enemies;
}

function stageReward(chapter: number, stage: number) {
  const progress = (chapter - 1) * 10 + stage;
  const isBoss = stage === 10;
  const bossMultiplier = isBoss ? 3 : 1;

  return {
    gold: Math.round((10 + progress * 8) * bossMultiplier),
    exp: Math.round((5 + progress * 5) * bossMultiplier),
    crystals: isBoss ? chapter * 10 : stage >= 7 ? 2 : 0,
    dropTable: isBoss
      ? [{ itemId: `equip-${CHAPTERS[chapter - 1].prefix}`, chance: 0.5 }]
      : [],
  };
}

export const STAGES: StageConfig[] = CHAPTERS.flatMap(({ chapter, name: chapterName }) =>
  Array.from({ length: 10 }, (_, i) => {
    const stage = i + 1;
    return {
      id: `${chapter}-${stage}`,
      chapter,
      stage,
      name: `${chapterName} — ${STAGE_NAMES[chapter][i]}`,
      enemies: pickEnemies(chapter, stage),
      rewards: stageReward(chapter, stage),
    };
  }),
);

export const ENEMY_SCALING = {
  baseHp: 80,
  baseAtk: 15,
  baseDef: 8,
  hpPerStage: 1.12,
  atkPerStage: 1.10,
  defPerStage: 1.08,
  bossHpMultiplier: 4,
  bossAtkMultiplier: 1.8,
  bossDefMultiplier: 1.5,
} as const;

export function enemyStatsForStage(chapter: number, stage: number) {
  const progress = (chapter - 1) * 10 + stage;
  const isBoss = stage === 10;
  return {
    hp: Math.round(
      ENEMY_SCALING.baseHp *
        ENEMY_SCALING.hpPerStage ** progress *
        (isBoss ? ENEMY_SCALING.bossHpMultiplier : 1),
    ),
    atk: Math.round(
      ENEMY_SCALING.baseAtk *
        ENEMY_SCALING.atkPerStage ** progress *
        (isBoss ? ENEMY_SCALING.bossAtkMultiplier : 1),
    ),
    def: Math.round(
      ENEMY_SCALING.baseDef *
        ENEMY_SCALING.defPerStage ** progress *
        (isBoss ? ENEMY_SCALING.bossDefMultiplier : 1),
    ),
  };
}
