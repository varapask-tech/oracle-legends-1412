import type { Rarity, HeroInstance } from "../../shared/types";
import { HERO_TEMPLATES, getHeroesByRarity } from "../../shared/heroes";

const RATES: Record<Rarity, number> = {
  common: 0.6,
  uncommon: 0.25,
  rare: 0.1,
  epic: 0.04,
  legendary: 0.01,
};

const PITY_THRESHOLD = 50;
const PITY_RARITY: Rarity = "epic";

export interface GachaState {
  pullsSincePity: number;
  totalPulls: number;
}

export function createGachaState(): GachaState {
  return { pullsSincePity: 0, totalPulls: 0 };
}

function rollRarity(state: GachaState): { rarity: Rarity; pityTriggered: boolean } {
  if (state.pullsSincePity >= PITY_THRESHOLD - 1) {
    return { rarity: PITY_RARITY, pityTriggered: true };
  }

  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(RATES) as [Rarity, number][]) {
    cumulative += rate;
    if (roll < cumulative) {
      return { rarity, pityTriggered: false };
    }
  }
  return { rarity: "common", pityTriggered: false };
}

function pickHeroFromRarity(rarity: Rarity): string {
  const pool = getHeroesByRarity(rarity);
  if (pool.length === 0) {
    return HERO_TEMPLATES[0].id;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx].id;
}

function generateInstanceId(): string {
  return `hero_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export interface SummonResult {
  hero: HeroInstance;
  rarity: Rarity;
  pityTriggered: boolean;
  pullNumber: number;
}

export function summonOne(state: GachaState): SummonResult {
  const { rarity, pityTriggered } = rollRarity(state);
  const templateId = pickHeroFromRarity(rarity);

  const hero: HeroInstance = {
    instanceId: generateInstanceId(),
    templateId,
    level: 1,
    exp: 0,
    stars: 1,
    equipment: [],
  };

  state.totalPulls++;
  const isHighRarity = rarity === "epic" || rarity === "legendary";
  state.pullsSincePity = isHighRarity || pityTriggered ? 0 : state.pullsSincePity + 1;

  return {
    hero,
    rarity,
    pityTriggered,
    pullNumber: state.totalPulls,
  };
}

export function summonTen(state: GachaState): SummonResult[] {
  return Array.from({ length: 10 }, () => summonOne(state));
}

export function pullsUntilPity(state: GachaState): number {
  return PITY_THRESHOLD - state.pullsSincePity;
}

export const SUMMON_COST = {
  single: 150,
  ten: 1350,
} as const;
