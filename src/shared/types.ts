export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type Element = "fire" | "water" | "earth" | "light" | "dark";
export type HeroClass = "warrior" | "mage" | "archer" | "healer" | "tank";

export interface HeroStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
}

export interface HeroTemplate {
  id: string;
  name: string;
  title: string;
  rarity: Rarity;
  element: Element;
  heroClass: HeroClass;
  baseStats: HeroStats;
  growthPerLevel: HeroStats;
  skills: SkillTemplate[];
  description: string;
  modelColor: number;
}

export interface HeroInstance {
  instanceId: string;
  templateId: string;
  level: number;
  exp: number;
  stars: number;
  equipment: Equipment[];
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  damageMultiplier: number;
  targetType: "single" | "aoe" | "self";
}

export interface Equipment {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "accessory";
  rarity: Rarity;
  statBonus: Partial<HeroStats>;
}

export interface StageConfig {
  id: string;
  chapter: number;
  stage: number;
  name: string;
  enemies: string[];
  rewards: StageReward;
}

export interface StageReward {
  gold: number;
  exp: number;
  crystals: number;
  dropTable: Array<{ itemId: string; chance: number }>;
}

export interface GameState {
  heroes: HeroInstance[];
  team: string[];
  gold: number;
  crystals: number;
  currentStage: string;
  lastOnlineAt: number;
  totalPlayTime: number;
  mapLevel: number;
}

export interface IdleReward {
  gold: number;
  exp: number;
  elapsedSeconds: number;
}
