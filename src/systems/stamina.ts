import type { HeroInstance } from "../shared/types";
import { GameStateManager } from "./game-state";

const BASE_STAMINA = 15;
const STAMINA_PER_BOMB = 1;
const RECHARGE_RATE_MS = 120_000;
const MAX_STAMINA_MULTIPLIER = 1;

export interface HeroStamina {
  heroId: string;
  current: number;
  max: number;
  lastRechargeAt: number;
  isDeployed: boolean;
}

export interface HouseLevel {
  level: number;
  rechargeBonusPercent: number;
  cost: number;
}

export const HOUSE_UPGRADES: HouseLevel[] = [
  { level: 1, rechargeBonusPercent: 0, cost: 0 },
  { level: 2, rechargeBonusPercent: 10, cost: 1000 },
  { level: 3, rechargeBonusPercent: 25, cost: 3000 },
  { level: 4, rechargeBonusPercent: 40, cost: 8000 },
  { level: 5, rechargeBonusPercent: 60, cost: 20000 },
];

export class StaminaManager {
  private staminaMap = new Map<string, HeroStamina>();
  private houseLevel = 1;

  constructor(heroes: HeroInstance[]) {
    for (const hero of heroes) {
      this.staminaMap.set(hero.instanceId, {
        heroId: hero.instanceId,
        current: BASE_STAMINA,
        max: BASE_STAMINA,
        lastRechargeAt: Date.now(),
        isDeployed: false,
      });
    }
  }

  getStamina(heroId: string): HeroStamina | undefined {
    return this.staminaMap.get(heroId);
  }

  addHero(hero: HeroInstance) {
    if (!this.staminaMap.has(hero.instanceId)) {
      this.staminaMap.set(hero.instanceId, {
        heroId: hero.instanceId,
        current: BASE_STAMINA,
        max: BASE_STAMINA,
        lastRechargeAt: Date.now(),
        isDeployed: false,
      });
    }
  }

  deploy(heroId: string): boolean {
    const s = this.staminaMap.get(heroId);
    if (!s || s.current <= 0 || s.isDeployed) return false;
    s.isDeployed = true;
    return true;
  }

  recall(heroId: string) {
    const s = this.staminaMap.get(heroId);
    if (!s) return;
    s.isDeployed = false;
    s.lastRechargeAt = Date.now();
  }

  useBomb(heroId: string): boolean {
    const s = this.staminaMap.get(heroId);
    if (!s || s.current < STAMINA_PER_BOMB) return false;
    s.current -= STAMINA_PER_BOMB;
    if (s.current <= 0) {
      s.isDeployed = false;
      s.lastRechargeAt = Date.now();
    }
    return true;
  }

  rechargeAll() {
    const now = Date.now();
    const bonusMultiplier = 1 + (HOUSE_UPGRADES[this.houseLevel - 1]?.rechargeBonusPercent ?? 0) / 100;
    const effectiveRate = RECHARGE_RATE_MS / bonusMultiplier;

    for (const s of this.staminaMap.values()) {
      if (s.isDeployed || s.current >= s.max) continue;
      const elapsed = now - s.lastRechargeAt;
      const recharged = Math.floor(elapsed / effectiveRate);
      if (recharged > 0) {
        s.current = Math.min(s.max, s.current + recharged);
        s.lastRechargeAt = now;
      }
    }
  }

  getHouseLevel(): number {
    return this.houseLevel;
  }

  upgradeHouse(gsm: GameStateManager): boolean {
    if (this.houseLevel >= HOUSE_UPGRADES.length) return false;
    const next = HOUSE_UPGRADES[this.houseLevel];
    if (!gsm.spendGold(next.cost)) return false;
    this.houseLevel++;
    return true;
  }

  getNextHouseUpgrade(): HouseLevel | null {
    if (this.houseLevel >= HOUSE_UPGRADES.length) return null;
    return HOUSE_UPGRADES[this.houseLevel];
  }

  getDeployedHeroes(): string[] {
    return Array.from(this.staminaMap.values())
      .filter((s) => s.isDeployed)
      .map((s) => s.heroId);
  }

  getRestingHeroes(): HeroStamina[] {
    return Array.from(this.staminaMap.values())
      .filter((s) => !s.isDeployed && s.current < s.max);
  }

  toJSON() {
    return {
      houseLevel: this.houseLevel,
      heroes: Array.from(this.staminaMap.values()),
    };
  }

  loadFromJSON(data: { houseLevel: number; heroes: HeroStamina[] }) {
    this.houseLevel = data.houseLevel;
    for (const h of data.heroes) {
      this.staminaMap.set(h.heroId, h);
    }
  }
}
