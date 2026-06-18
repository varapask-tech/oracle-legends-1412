import type { Equipment, Rarity } from "../shared/types";

export interface ShopEquipment {
  equipment: Equipment;
  cost: number;
  requiredStage: number;
}

const TIER_COSTS: Record<number, number> = {
  1: 100,
  2: 300,
  3: 800,
  4: 2000,
  5: 5000,
};

const TIER_RARITY: Record<number, Rarity> = {
  1: "common",
  2: "uncommon",
  3: "rare",
  4: "epic",
  5: "legendary",
};

export const EQUIPMENT_DB: ShopEquipment[] = [
  // ── Weapons (ATK focus) ──
  {
    equipment: {
      id: "wpn-wooden-sword",
      name: "ดาบไม้",
      slot: "weapon",
      rarity: "common",
      statBonus: { atk: 15 },
    },
    cost: TIER_COSTS[1],
    requiredStage: 1,
  },
  {
    equipment: {
      id: "wpn-iron-blade",
      name: "ดาบเหล็ก",
      slot: "weapon",
      rarity: "uncommon",
      statBonus: { atk: 35, critRate: 0.03 },
    },
    cost: TIER_COSTS[2],
    requiredStage: 5,
  },
  {
    equipment: {
      id: "wpn-crystal-staff",
      name: "คทาคริสตัล",
      slot: "weapon",
      rarity: "rare",
      statBonus: { atk: 60, critDmg: 0.2 },
    },
    cost: TIER_COSTS[3],
    requiredStage: 10,
  },
  {
    equipment: {
      id: "wpn-oracle-blade",
      name: "Oracle Blade",
      slot: "weapon",
      rarity: "epic",
      statBonus: { atk: 100, critRate: 0.08, spd: 10 },
    },
    cost: TIER_COSTS[4],
    requiredStage: 15,
  },
  {
    equipment: {
      id: "wpn-void-scythe",
      name: "Void Scythe",
      slot: "weapon",
      rarity: "legendary",
      statBonus: { atk: 150, critRate: 0.12, critDmg: 0.4 },
    },
    cost: TIER_COSTS[5],
    requiredStage: 20,
  },

  // ── Armor (HP + DEF focus) ──
  {
    equipment: {
      id: "arm-leather-vest",
      name: "เสื้อหนัง",
      slot: "armor",
      rarity: "common",
      statBonus: { hp: 100, def: 10 },
    },
    cost: TIER_COSTS[1],
    requiredStage: 1,
  },
  {
    equipment: {
      id: "arm-chainmail",
      name: "เสื้อเกราะโซ่",
      slot: "armor",
      rarity: "uncommon",
      statBonus: { hp: 250, def: 25 },
    },
    cost: TIER_COSTS[2],
    requiredStage: 5,
  },
  {
    equipment: {
      id: "arm-guardian-plate",
      name: "Guardian Plate",
      slot: "armor",
      rarity: "rare",
      statBonus: { hp: 500, def: 45, spd: -5 },
    },
    cost: TIER_COSTS[3],
    requiredStage: 10,
  },
  {
    equipment: {
      id: "arm-oracle-robe",
      name: "Oracle Robe",
      slot: "armor",
      rarity: "epic",
      statBonus: { hp: 800, def: 70, critRate: 0.05 },
    },
    cost: TIER_COSTS[4],
    requiredStage: 15,
  },
  {
    equipment: {
      id: "arm-celestial-armor",
      name: "Celestial Armor",
      slot: "armor",
      rarity: "legendary",
      statBonus: { hp: 1200, def: 100, spd: 15 },
    },
    cost: TIER_COSTS[5],
    requiredStage: 20,
  },

  // ── Accessories (utility) ──
  {
    equipment: {
      id: "acc-simple-ring",
      name: "แหวนธรรมดา",
      slot: "accessory",
      rarity: "common",
      statBonus: { spd: 8, critRate: 0.02 },
    },
    cost: TIER_COSTS[1],
    requiredStage: 1,
  },
  {
    equipment: {
      id: "acc-swift-boots",
      name: "รองเท้าสายลม",
      slot: "accessory",
      rarity: "uncommon",
      statBonus: { spd: 20, critRate: 0.05 },
    },
    cost: TIER_COSTS[2],
    requiredStage: 5,
  },
  {
    equipment: {
      id: "acc-mystic-amulet",
      name: "Mystic Amulet",
      slot: "accessory",
      rarity: "rare",
      statBonus: { critRate: 0.1, critDmg: 0.3 },
    },
    cost: TIER_COSTS[3],
    requiredStage: 10,
  },
  {
    equipment: {
      id: "acc-oracle-pendant",
      name: "Oracle Pendant",
      slot: "accessory",
      rarity: "epic",
      statBonus: { hp: 400, atk: 40, spd: 15 },
    },
    cost: TIER_COSTS[4],
    requiredStage: 15,
  },
  {
    equipment: {
      id: "acc-star-crown",
      name: "Star Crown",
      slot: "accessory",
      rarity: "legendary",
      statBonus: { atk: 80, spd: 25, critRate: 0.15, critDmg: 0.5 },
    },
    cost: TIER_COSTS[5],
    requiredStage: 20,
  },
];

export function getAvailableEquipment(highestStage: number): ShopEquipment[] {
  return EQUIPMENT_DB.filter((e) => e.requiredStage <= highestStage);
}

export function getEquipmentById(id: string): ShopEquipment | undefined {
  return EQUIPMENT_DB.find((e) => e.equipment.id === id);
}

export function getEquipmentBySlot(slot: Equipment["slot"]): ShopEquipment[] {
  return EQUIPMENT_DB.filter((e) => e.equipment.slot === slot);
}
