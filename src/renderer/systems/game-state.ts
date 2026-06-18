import type { GameState, HeroInstance } from "../../shared/types";
import { GOLD, CRYSTALS, EXP } from "../../shared/balance";
import { HERO_TEMPLATES } from "../../shared/heroes";

const INITIAL_HERO_IDS = ["sol-lightbringer"];

function createStarterHeroes(): HeroInstance[] {
  return INITIAL_HERO_IDS.map((templateId) => ({
    instanceId: `starter_${templateId}`,
    templateId,
    level: 1,
    exp: 0,
    stars: 1,
    equipment: [],
  }));
}

export function createInitialState(): GameState {
  const starters = createStarterHeroes();
  return {
    heroes: starters,
    team: starters.map((h) => h.instanceId),
    gold: GOLD.startingGold,
    crystals: CRYSTALS.startingCrystals,
    currentStage: "1-1",
    lastOnlineAt: Date.now(),
    totalPlayTime: 0,
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
    this.listeners.forEach((fn) => fn());
  }

  addHero(hero: HeroInstance) {
    this.state.heroes.push(hero);
    this.notify();
  }

  setTeam(instanceIds: string[]) {
    this.state.team = instanceIds.slice(0, 5);
    this.notify();
  }

  addGold(amount: number) {
    this.state.gold = Math.max(0, this.state.gold + amount);
    this.notify();
  }

  spendGold(amount: number): boolean {
    if (this.state.gold < amount) return false;
    this.state.gold -= amount;
    this.notify();
    return true;
  }

  addCrystals(amount: number) {
    this.state.crystals = Math.max(0, this.state.crystals + amount);
    this.notify();
  }

  spendCrystals(amount: number): boolean {
    if (this.state.crystals < amount) return false;
    this.state.crystals -= amount;
    this.notify();
    return true;
  }

  advanceStage(stageId: string) {
    this.state.currentStage = stageId;
    this.notify();
  }

  addExpToHero(instanceId: string, amount: number) {
    const hero = this.state.heroes.find((h) => h.instanceId === instanceId);
    if (!hero) return;

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
    const perHero = Math.floor(amount / Math.max(1, this.state.team.length));
    for (const id of this.state.team) {
      this.addExpToHero(id, perHero);
    }
  }

  updateLastOnline() {
    this.state.lastOnlineAt = Date.now();
  }

  addPlayTime(seconds: number) {
    this.state.totalPlayTime += seconds;
  }

  getHeroByInstance(instanceId: string): HeroInstance | undefined {
    return this.state.heroes.find((h) => h.instanceId === instanceId);
  }

  getTemplate(templateId: string) {
    return HERO_TEMPLATES.find((t) => t.id === templateId);
  }
}
