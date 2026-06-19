import type { Rarity, Equipment } from "../shared/types";
import { EQUIPMENT_DB } from "../data/equipment";
import { GameStateManager } from "./game-state";

export interface ChestReward {
  gold: number;
  crystals: number;
  equipment: Equipment | null;
  shards: number;
}

const CHEST_TIERS = {
  wood: { goldRange: [10, 30], crystalChance: 0.1, crystalRange: [1, 3], equipChance: 0.05, shardRange: [0, 2] },
  silver: { goldRange: [30, 80], crystalChance: 0.25, crystalRange: [2, 5], equipChance: 0.15, shardRange: [1, 5] },
  gold: { goldRange: [80, 200], crystalChance: 0.5, crystalRange: [5, 15], equipChance: 0.3, shardRange: [3, 10] },
  legendary: { goldRange: [200, 500], crystalChance: 1.0, crystalRange: [10, 30], equipChance: 0.6, shardRange: [10, 25] },
} as const;

export type ChestTier = keyof typeof CHEST_TIERS;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollEquipment(maxStage: number): Equipment | null {
  const available = EQUIPMENT_DB.filter((e) => e.requiredStage <= maxStage);
  if (available.length === 0) return null;
  const item = available[Math.floor(Math.random() * available.length)];
  return { ...item.equipment };
}

export function openChest(tier: ChestTier, mapLevel: number): ChestReward {
  const config = CHEST_TIERS[tier];
  const levelBonus = 1 + mapLevel * 0.1;

  const gold = Math.round(randInt(config.goldRange[0], config.goldRange[1]) * levelBonus);
  const crystals = Math.random() < config.crystalChance
    ? Math.round(randInt(config.crystalRange[0], config.crystalRange[1]) * levelBonus)
    : 0;
  const equipment = Math.random() < config.equipChance ? rollEquipment(mapLevel) : null;
  const shards = randInt(config.shardRange[0], config.shardRange[1]);

  return { gold, crystals, equipment, shards };
}

export function collectReward(reward: ChestReward, gsm: GameStateManager): void {
  gsm.addGold(reward.gold);
  if (reward.crystals > 0) gsm.addCrystals(reward.crystals);
  if (reward.shards > 0) {
    const state = gsm.current as any;
    state.shards = (state.shards ?? 0) + reward.shards;
  }
}

export function chestTierForMap(mapLevel: number): ChestTier {
  const roll = Math.random();
  if (mapLevel >= 15 && roll < 0.05) return "legendary";
  if (mapLevel >= 8 && roll < 0.15) return "gold";
  if (mapLevel >= 3 && roll < 0.35) return "silver";
  return "wood";
}
