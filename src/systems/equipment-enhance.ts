import type { Equipment, HeroStats, Rarity } from "../shared/types";
import { GameStateManager, type ActionResult } from "./game-state";

const MAX_ENHANCE = 15;

const ENHANCE_COST_BASE: Record<Rarity, number> = {
  common: 50,
  uncommon: 100,
  rare: 200,
  epic: 500,
  legendary: 1000,
};

const ENHANCE_COST_GROWTH = 1.15;

const SUBSTAT_POOL: (keyof HeroStats)[] = ["hp", "atk", "def", "spd", "critRate", "critDmg"];

const SUBSTAT_RANGES: Record<keyof HeroStats, [number, number]> = {
  hp: [20, 80],
  atk: [5, 20],
  def: [5, 15],
  spd: [2, 8],
  critRate: [0.01, 0.04],
  critDmg: [0.05, 0.15],
};

export interface EnhancedEquipment extends Equipment {
  enhanceLevel: number;
  substats: Array<{ stat: keyof HeroStats; value: number }>;
}

export function enhanceCost(equipment: EnhancedEquipment): number {
  const base = ENHANCE_COST_BASE[equipment.rarity] ?? 100;
  return Math.round(base * ENHANCE_COST_GROWTH ** equipment.enhanceLevel);
}

export function canEnhance(equipment: EnhancedEquipment): boolean {
  return equipment.enhanceLevel < MAX_ENHANCE;
}

function rollSubstat(existing: Array<{ stat: keyof HeroStats }>): { stat: keyof HeroStats; value: number } {
  const usedStats = new Set(existing.map((s) => s.stat));
  const available = SUBSTAT_POOL.filter((s) => !usedStats.has(s));
  const pool = available.length > 0 ? available : SUBSTAT_POOL;

  const stat = pool[Math.floor(Math.random() * pool.length)];
  const [min, max] = SUBSTAT_RANGES[stat];
  const value = Math.round((min + Math.random() * (max - min)) * 100) / 100;
  return { stat, value };
}

export function enhanceEquipment(
  equipment: EnhancedEquipment,
  gsm: GameStateManager,
): ActionResult & { newSubstat?: { stat: keyof HeroStats; value: number } } {
  if (!canEnhance(equipment)) {
    return { ok: false, reason: `Already at max +${MAX_ENHANCE}` };
  }

  const cost = enhanceCost(equipment);
  if (!gsm.spendGold(cost)) {
    return { ok: false, reason: `Need ${cost} gold` };
  }

  equipment.enhanceLevel++;

  const mainStatKeys = Object.keys(equipment.statBonus) as (keyof HeroStats)[];
  for (const key of mainStatKeys) {
    const current = equipment.statBonus[key];
    if (current !== undefined) {
      if (key === "critRate" || key === "critDmg") {
        (equipment.statBonus as any)[key] = Math.round((current * 1.08) * 1000) / 1000;
      } else {
        (equipment.statBonus as any)[key] = Math.round(current * 1.08);
      }
    }
  }

  let newSubstat: { stat: keyof HeroStats; value: number } | undefined;
  if (equipment.enhanceLevel % 3 === 0) {
    newSubstat = rollSubstat(equipment.substats);
    equipment.substats.push(newSubstat);
  }

  return { ok: true, newSubstat };
}

export function toEnhanced(equipment: Equipment): EnhancedEquipment {
  return {
    ...equipment,
    enhanceLevel: (equipment as any).enhanceLevel ?? 0,
    substats: (equipment as any).substats ?? [],
  };
}

export function totalEquipmentStats(equipment: EnhancedEquipment): Partial<HeroStats> {
  const result: Partial<HeroStats> = { ...equipment.statBonus };
  for (const sub of equipment.substats) {
    const current = (result as any)[sub.stat] ?? 0;
    (result as any)[sub.stat] = current + sub.value;
  }
  return result;
}

export { MAX_ENHANCE };
