// tuned for relaxation — generous, never punishing

export const EXP = {
  baseToLevel: 100,
  growthRate: 1.15,
  maxLevel: 100,
  expForLevel(level: number): number {
    return Math.round(EXP.baseToLevel * EXP.growthRate ** (level - 1));
  },
  totalExpToLevel(target: number): number {
    let total = 0;
    for (let l = 1; l < target; l++) total += EXP.expForLevel(l);
    return total;
  },
} as const;

export const GOLD = {
  startingGold: 500,
  upgradeBaseCost: 50,
  upgradeCostGrowth: 1.12,
  upgradeCost(level: number): number {
    return Math.round(GOLD.upgradeBaseCost * GOLD.upgradeCostGrowth ** (level - 1));
  },
  equipmentCostMultiplier: { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 15 },
} as const;

export const CRYSTALS = {
  startingCrystals: 100,
  singleSummonCost: 10,
  tenSummonCost: 90,
  dailyLoginBonus: 10,
  chapterClearBonus: 50,
} as const;

export const IDLE = {
  baseGoldPerSecond: 0.5,
  baseExpPerSecond: 0.3,
  stageMultiplier: 0.04,
  maxOfflineHours: 24,
  goldPerSecond(highestStage: number): number {
    return IDLE.baseGoldPerSecond * (1 + highestStage * IDLE.stageMultiplier);
  },
  expPerSecond(highestStage: number): number {
    return IDLE.baseExpPerSecond * (1 + highestStage * IDLE.stageMultiplier);
  },
  offlineReward(highestStage: number, offlineSeconds: number) {
    const capped = Math.min(offlineSeconds, IDLE.maxOfflineHours * 3600);
    return {
      gold: Math.round(IDLE.goldPerSecond(highestStage) * capped),
      exp: Math.round(IDLE.expPerSecond(highestStage) * capped),
      elapsedSeconds: capped,
    };
  },
} as const;

export const COMBAT = {
  baseDamage(atk: number, def: number): number {
    return Math.max(1, Math.round(atk * (100 / (100 + def))));
  },
  critDamage(base: number, critDmg: number): number {
    return Math.round(base * critDmg);
  },
  turnIntervalMs: 1500,
  animationDurationMs: 600,
} as const;

export const STAR_UPGRADE = {
  maxStars: 6,
  dupeRequired: [0, 1, 2, 3, 5, 8],
  statBonusPerStar: 0.1,
} as const;
