import type {
  GameState,
  HeroInstance,
  HeroStats,
  Equipment,
} from "../shared/types";
import { GOLD, CRYSTALS, EXP } from "../shared/balance";
import { getHeroById, HERO_TEMPLATES } from "../shared/heroes";

export type ActionResult =
  | { ok: true }
  | { ok: false; reason: string };

const STARTER_HEROES = ["zero-void", "one-thunder", "two-crystal"];

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

export function createInitialState(): GameState {
  const starters = STARTER_HEROES
    .map((id) => (getHeroById(id) ? makeInstance(id) : null))
    .filter((h): h is HeroInstance => h !== null);

  return {
    heroes: starters,
    team: starters.map((h) => h.instanceId),
    gold: GOLD.startingGold,
    crystals: CRYSTALS.startingCrystals,
    currentStage: "1-1",
    lastOnlineAt: Date.now(),
    totalPlayTime: 0,
    mapLevel: 1,
  };
}

export class GameStateManager {
  private state: GameState;
  private listeners: Array<() => void> = [];

  constructor(state: GameState) {
    this.state = state;
  }

  get current(): Readonly<GameState> {
    return this.state;
  }

  onChange(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  // ── Currency ──

  get gold(): number { return this.state.gold; }
  get crystals(): number { return this.state.crystals; }

  addGold(amount: number) {
    this.state.gold += Math.max(0, amount);
    this.notify();
  }

  addCrystals(amount: number) {
    this.state.crystals += Math.max(0, amount);
    this.notify();
  }

  spendGold(cost: number): boolean {
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.notify();
    return true;
  }

  spendCrystals(cost: number): boolean {
    if (this.state.crystals < cost) return false;
    this.state.crystals -= cost;
    this.notify();
    return true;
  }

  canAffordGold(cost: number): boolean { return this.state.gold >= cost; }
  canAffordCrystals(cost: number): boolean { return this.state.crystals >= cost; }

  // ── Map Level ──

  setMapLevel(level: number) {
    this.state.mapLevel = level;
    this.notify();
  }

  // ── Heroes ──

  findHero(instanceId: string): HeroInstance | undefined {
    return this.state.heroes.find((h) => h.instanceId === instanceId);
  }

  addHero(hero: HeroInstance) {
    this.state.heroes.push(hero);
    this.notify();
  }

  setTeam(ids: string[]) {
    this.state.team = ids.slice(0, 5);
    this.notify();
  }

  // ── Level Up (costs gold) ──

  levelUpCost(hero: HeroInstance): number {
    return GOLD.upgradeCost(hero.level);
  }

  levelUpHero(instanceId: string): ActionResult {
    const hero = this.findHero(instanceId);
    if (!hero) return { ok: false, reason: "Hero not found" };
    if (hero.level >= EXP.maxLevel) return { ok: false, reason: "Already max level" };

    const cost = this.levelUpCost(hero);
    if (!this.canAffordGold(cost)) return { ok: false, reason: `Need ${cost} gold` };

    this.state.gold -= cost;
    hero.level++;
    this.notify();
    return { ok: true };
  }

  // ── EXP (from battle) ──

  addExpToHero(instanceId: string, amount: number) {
    const hero = this.findHero(instanceId);
    if (!hero || hero.level >= EXP.maxLevel) return;

    hero.exp += amount;
    let needed = EXP.expForLevel(hero.level);
    while (hero.exp >= needed && hero.level < EXP.maxLevel) {
      hero.exp -= needed;
      hero.level++;
      needed = EXP.expForLevel(hero.level);
    }
    this.notify();
  }

  addExpToTeam(amount: number) {
    const share = Math.floor(amount / Math.max(1, this.state.team.length));
    for (const id of this.state.team) {
      this.addExpToHero(id, share);
    }
  }

  // ── Equipment ──

  equipItem(instanceId: string, item: Equipment): ActionResult {
    const hero = this.findHero(instanceId);
    if (!hero) return { ok: false, reason: "Hero not found" };

    const existing = hero.equipment.findIndex((e) => e.slot === item.slot);
    if (existing >= 0) {
      hero.equipment[existing] = item;
    } else {
      hero.equipment.push(item);
    }
    this.notify();
    return { ok: true };
  }

  unequipSlot(instanceId: string, slot: Equipment["slot"]): ActionResult {
    const hero = this.findHero(instanceId);
    if (!hero) return { ok: false, reason: "Hero not found" };

    hero.equipment = hero.equipment.filter((e) => e.slot !== slot);
    this.notify();
    return { ok: true };
  }

  // ── Buy Equipment from Shop ──

  buyEquipment(item: Equipment, cost: number): ActionResult {
    if (!this.canAffordGold(cost)) return { ok: false, reason: `Need ${cost} gold` };

    this.state.gold -= cost;
    this.notify();
    return { ok: true };
  }

  // ── Summon (costs crystals) ──

  summonHero(cost: number, hero: HeroInstance): ActionResult {
    if (!this.canAffordCrystals(cost)) return { ok: false, reason: `Need ${cost} crystals` };

    this.state.crystals -= cost;
    this.state.heroes.push(hero);
    this.notify();
    return { ok: true };
  }

  // ── Stats Calculation ──

  getHeroFullStats(instanceId: string): HeroStats | null {
    const hero = this.findHero(instanceId);
    if (!hero) return null;

    const template = getHeroById(hero.templateId);
    if (!template) return null;

    const lvl = hero.level - 1;
    const stats: HeroStats = {
      hp: Math.round(template.baseStats.hp + template.growthPerLevel.hp * lvl),
      atk: Math.round(template.baseStats.atk + template.growthPerLevel.atk * lvl),
      def: Math.round(template.baseStats.def + template.growthPerLevel.def * lvl),
      spd: Math.round(template.baseStats.spd + template.growthPerLevel.spd * lvl),
      critRate: template.baseStats.critRate + template.growthPerLevel.critRate * lvl,
      critDmg: template.baseStats.critDmg + template.growthPerLevel.critDmg * lvl,
    };

    for (const eq of hero.equipment) {
      if (eq.statBonus.hp) stats.hp += eq.statBonus.hp;
      if (eq.statBonus.atk) stats.atk += eq.statBonus.atk;
      if (eq.statBonus.def) stats.def += eq.statBonus.def;
      if (eq.statBonus.spd) stats.spd += eq.statBonus.spd;
      if (eq.statBonus.critRate) stats.critRate += eq.statBonus.critRate;
      if (eq.statBonus.critDmg) stats.critDmg += eq.statBonus.critDmg;
    }

    return stats;
  }

  getPower(instanceId: string): number {
    const stats = this.getHeroFullStats(instanceId);
    if (!stats) return 0;
    return Math.round(
      stats.hp * 0.5 + stats.atk * 2 + stats.def * 1.5 + stats.spd * 1 +
      stats.critRate * 100 + stats.critDmg * 50
    );
  }

  // ── Stage ──

  advanceStage(stageId: string) {
    this.state.currentStage = stageId;
    this.notify();
  }

  // ── Save helpers ──

  updateLastOnline() {
    this.state.lastOnlineAt = Date.now();
  }

  addPlayTime(seconds: number) {
    this.state.totalPlayTime += seconds;
  }

  toJSON(): GameState {
    return { ...this.state };
  }
}
