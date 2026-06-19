import type { Rarity } from "../shared/types";

export interface BombHeroStats {
  moveSpeed: number;
  bombRange: number;
  bombCount: number;
  canWalkThroughBlocks: boolean;
  canWalkThroughBombs: boolean;
  bombDamage: number;
  staminaMax: number;
}

const RARITY_MULTIPLIERS: Record<Rarity, { speed: number; range: number; bombs: number; damage: number; stamina: number }> = {
  common:    { speed: 1.0, range: 1, bombs: 1, damage: 1.0, stamina: 10 },
  uncommon:  { speed: 1.2, range: 1, bombs: 1, damage: 1.2, stamina: 12 },
  rare:      { speed: 1.4, range: 2, bombs: 2, damage: 1.5, stamina: 15 },
  epic:      { speed: 1.7, range: 2, bombs: 2, damage: 2.0, stamina: 18 },
  legendary: { speed: 2.0, range: 3, bombs: 3, damage: 3.0, stamina: 25 },
};

const RARITY_ABILITIES: Record<Rarity, { walkBlocks: boolean; walkBombs: boolean }> = {
  common:    { walkBlocks: false, walkBombs: false },
  uncommon:  { walkBlocks: false, walkBombs: false },
  rare:      { walkBlocks: false, walkBombs: true },
  epic:      { walkBlocks: false, walkBombs: true },
  legendary: { walkBlocks: true,  walkBombs: true },
};

export function getBombHeroStats(rarity: Rarity, level: number, stars: number): BombHeroStats {
  const mult = RARITY_MULTIPLIERS[rarity];
  const abilities = RARITY_ABILITIES[rarity];
  const levelBonus = 1 + (level - 1) * 0.02;
  const starBonus = 1 + (stars - 1) * 0.1;

  return {
    moveSpeed: mult.speed * levelBonus * starBonus,
    bombRange: mult.range + (level >= 50 ? 1 : 0),
    bombCount: mult.bombs + (stars >= 4 ? 1 : 0),
    canWalkThroughBlocks: abilities.walkBlocks || (rarity === "epic" && stars >= 5),
    canWalkThroughBombs: abilities.walkBombs,
    bombDamage: mult.damage * levelBonus * starBonus,
    staminaMax: Math.round(mult.stamina * starBonus),
  };
}

export function getRarityColor(rarity: Rarity): string {
  const colors: Record<Rarity, string> = {
    common: "#aaaaaa",
    uncommon: "#44bb44",
    rare: "#4488ff",
    epic: "#aa44ff",
    legendary: "#ffd700",
  };
  return colors[rarity];
}

export function getRarityLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare ★",
    epic: "Epic ★★",
    legendary: "Legendary ★★★",
  };
  return labels[rarity];
}
