import type { Rarity, HeroInstance } from "../shared/types";
import { getHeroesByRarity } from "../shared/heroes";
import { CRYSTALS } from "../shared/balance";
import { GameStateManager, type ActionResult } from "./game-state";

const RATES: Record<Rarity, number> = {
  common: 0.60,
  uncommon: 0.25,
  rare: 0.10,
  epic: 0.04,
  legendary: 0.01,
};

const PITY_THRESHOLD = 50;
const PITY_RARITY: Rarity = "epic";

export interface GachaState {
  pullsSincePity: number;
  totalPulls: number;
}

export interface SummonResult {
  hero: HeroInstance;
  rarity: Rarity;
  pityTriggered: boolean;
  isNew: boolean;
}

export function createGachaState(): GachaState {
  return { pullsSincePity: 0, totalPulls: 0 };
}

function rollRarity(gacha: GachaState): { rarity: Rarity; pityTriggered: boolean } {
  if (gacha.pullsSincePity >= PITY_THRESHOLD - 1) {
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

function pickHeroId(rarity: Rarity): string {
  const pool = getHeroesByRarity(rarity);
  if (pool.length === 0) return "sol-lightbringer";
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function makeInstance(templateId: string): HeroInstance {
  return {
    instanceId: `hero_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    templateId,
    level: 1,
    exp: 0,
    stars: 1,
    equipment: [],
  };
}

function doSummon(
  gacha: GachaState,
  gsm: GameStateManager,
): SummonResult {
  const { rarity, pityTriggered } = rollRarity(gacha);
  const templateId = pickHeroId(rarity);
  const hero = makeInstance(templateId);

  const isNew = !gsm.current.heroes.some((h) => h.templateId === templateId);

  gacha.totalPulls++;
  const isHigh = rarity === "epic" || rarity === "legendary";
  gacha.pullsSincePity = isHigh || pityTriggered ? 0 : gacha.pullsSincePity + 1;

  return { hero, rarity, pityTriggered, isNew };
}

export function summonOne(
  gacha: GachaState,
  gsm: GameStateManager,
): ActionResult & { result?: SummonResult } {
  const cost = CRYSTALS.singleSummonCost;
  if (!gsm.canAffordCrystals(cost)) {
    return { ok: false, reason: `Need ${cost} crystals` };
  }

  const result = doSummon(gacha, gsm);
  const action = gsm.summonHero(cost, result.hero);
  if (!action.ok) return action;

  return { ok: true, result };
}

export function summonTen(
  gacha: GachaState,
  gsm: GameStateManager,
): ActionResult & { results?: SummonResult[] } {
  const cost = CRYSTALS.tenSummonCost;
  if (!gsm.canAffordCrystals(cost)) {
    return { ok: false, reason: `Need ${cost} crystals` };
  }

  gsm.spendCrystals(cost);

  const results: SummonResult[] = [];
  for (let i = 0; i < 10; i++) {
    const result = doSummon(gacha, gsm);
    gsm.addHero(result.hero);
    results.push(result);
  }

  return { ok: true, results };
}

export function pullsUntilPity(gacha: GachaState): number {
  return PITY_THRESHOLD - gacha.pullsSincePity;
}

export const SUMMON_COST = {
  single: CRYSTALS.singleSummonCost,
  ten: CRYSTALS.tenSummonCost,
} as const;
