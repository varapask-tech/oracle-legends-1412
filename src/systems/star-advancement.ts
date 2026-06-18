import type { HeroInstance, Rarity } from "../shared/types";
import { GameStateManager, type ActionResult } from "./game-state";

const DUPES_PER_STAR: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 5,
  6: 8,
};

const MAX_STARS = 6;

const STAR_STAT_BONUS = 0.1;

const GOLD_COST_PER_STAR: Record<number, number> = {
  2: 500,
  3: 1500,
  4: 5000,
  5: 15000,
  6: 50000,
};

export function dupesRequired(targetStar: number): number {
  return DUPES_PER_STAR[targetStar] ?? 0;
}

export function goldCostForStar(targetStar: number): number {
  return GOLD_COST_PER_STAR[targetStar] ?? 0;
}

export function canAdvanceStar(
  hero: HeroInstance,
  gsm: GameStateManager,
): { ok: boolean; reason?: string; dupesNeeded?: number; goldNeeded?: number } {
  if (hero.stars >= MAX_STARS) {
    return { ok: false, reason: "Already max stars" };
  }

  const targetStar = hero.stars + 1;
  const dupesNeeded = dupesRequired(targetStar);
  const goldNeeded = goldCostForStar(targetStar);

  const dupeCount = gsm.current.heroes.filter(
    (h) => h.templateId === hero.templateId && h.instanceId !== hero.instanceId,
  ).length;

  if (dupeCount < dupesNeeded) {
    return { ok: false, reason: `Need ${dupesNeeded} copies (have ${dupeCount})`, dupesNeeded, goldNeeded };
  }

  if (!gsm.canAffordGold(goldNeeded)) {
    return { ok: false, reason: `Need ${goldNeeded} gold`, dupesNeeded, goldNeeded };
  }

  return { ok: true, dupesNeeded, goldNeeded };
}

export function advanceStar(
  heroInstanceId: string,
  gsm: GameStateManager,
): ActionResult & { consumedIds?: string[] } {
  const hero = gsm.findHero(heroInstanceId);
  if (!hero) return { ok: false, reason: "Hero not found" };

  const check = canAdvanceStar(hero, gsm);
  if (!check.ok) return { ok: false, reason: check.reason! };

  const targetStar = hero.stars + 1;
  const dupesNeeded = dupesRequired(targetStar);
  const goldNeeded = goldCostForStar(targetStar);

  const dupes = gsm.current.heroes
    .filter((h) => h.templateId === hero.templateId && h.instanceId !== hero.instanceId)
    .slice(0, dupesNeeded);

  if (!gsm.spendGold(goldNeeded)) {
    return { ok: false, reason: "Not enough gold" };
  }

  const consumedIds = dupes.map((d) => d.instanceId);
  const state = gsm.current as any;
  state.heroes = state.heroes.filter(
    (h: HeroInstance) => !consumedIds.includes(h.instanceId),
  );

  hero.stars = targetStar;

  return { ok: true, consumedIds };
}

export function starStatMultiplier(stars: number): number {
  return 1 + (stars - 1) * STAR_STAT_BONUS;
}

export { MAX_STARS, STAR_STAT_BONUS };
