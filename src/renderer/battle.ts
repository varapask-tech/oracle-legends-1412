import type { HeroTemplate } from "../shared/types";
import { COMBAT } from "../shared/balance";
import { STAGES, enemyStatsForStage } from "../shared/stages";
import { createBattleState, executeTurn, spawnNextWave, type BattleState, type BattleUnit } from "./systems/battle";
import { SpriteAnimator, FORMATION_HERO, FORMATION_ENEMY } from "./sprite-animator";

const CHAPTER_BG: Record<number, string> = {
  1: "/assets/backgrounds/bg-forest.png",
  2: "/assets/backgrounds/bg-thunder.png",
  3: "/assets/backgrounds/bg-mirror.png",
  4: "/assets/backgrounds/bg-shadow.png",
  5: "/assets/backgrounds/bg-temple.png",
};

function makeEnemyTemplate(enemyId: string, chapter: number, stage: number): HeroTemplate {
  const stats = enemyStatsForStage(chapter, stage);
  const classes: Array<"warrior" | "mage" | "archer" | "tank"> = ["warrior", "mage", "archer", "tank"];
  const elements: Array<"fire" | "water" | "earth" | "dark"> = ["fire", "water", "earth", "dark"];
  const hash = enemyId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const isBoss = enemyId.startsWith("boss-");
  return {
    id: enemyId,
    name: isBoss ? enemyId.replace("boss-", "").replace(/-/g, " ") : enemyId.replace(/-/g, " "),
    title: isBoss ? "Boss" : "Monster", rarity: isBoss ? "epic" : "common",
    element: elements[hash % elements.length], heroClass: classes[hash % classes.length],
    baseStats: { hp: stats.hp, atk: stats.atk, def: stats.def, spd: 80 + (hash % 30), critRate: isBoss ? 0.15 : 0.05, critDmg: isBoss ? 1.8 : 1.5 },
    growthPerLevel: { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0 },
    skills: isBoss ? [{ id: `${enemyId}-skill`, name: "Boss Rage", description: "", cooldown: 5, damageMultiplier: 2.0, targetType: "aoe" as const }] : [],
    description: "", modelColor: isBoss ? 0xaa2222 : 0x886644,
  };
}

export interface BattleCallbacks {
  onEnd: (result: "won" | "lost", gold: number, exp: number, crystals: number) => void;
}

interface UnitHandle {
  unit: BattleUnit;
  animator: SpriteAnimator;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  isHero: boolean;
}

export class Battle2D {
  private container: HTMLElement;
  private battleState: BattleState | null = null;
  private heroes: UnitHandle[] = [];
  private enemies: UnitHandle[] = [];
  private callbacks: BattleCallbacks;
  private speed = 1;
  private turnTimer = 0;
  private stageConfig: typeof STAGES[0] | null = null;
  private active = false;
  private actionQueue: Array<() => Promise<void>> = [];
  private processing = false;
  private fieldEl: HTMLElement | null = null;
  private width = 960;
  private height = 540;

  constructor(container: HTMLElement, callbacks: BattleCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  startBattle(stageId: string, heroTemplates: HeroTemplate[], heroLevels: number[]): void {
    this.stageConfig = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    const chapter = this.stageConfig.chapter;
    const enemyTemplates = this.stageConfig.enemies.map((id) => makeEnemyTemplate(id, chapter, this.stageConfig!.stage));
    this.battleState = createBattleState(heroTemplates, heroLevels, enemyTemplates, enemyTemplates.map(() => 1), 3);

    this.container.innerHTML = "";
    this.container.style.cssText = "width:100%; height:100%; position:relative; overflow:hidden; font-family:'Segoe UI',sans-serif;";

    const bgUrl = CHAPTER_BG[chapter] ?? CHAPTER_BG[1];
    this.container.innerHTML = `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:url('${bgUrl}') center/cover no-repeat, linear-gradient(180deg, #1a2a3a, #0a1a0a); z-index:0;"></div>`;

    this.fieldEl = document.createElement("div");
    this.fieldEl.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; z-index:2;";
    this.container.appendChild(this.fieldEl);

    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 960;
    this.height = rect.height || 540;

    this.heroes = this.battleState.heroes.map((u, i) => this.createUnit(u, true, i));
    this.enemies = this.battleState.enemies.map((u, i) => this.createUnit(u, false, i));

    this.addHUD();
    this.turnTimer = 0;
    this.active = true;
    this.actionQueue = [];
    this.processing = false;
  }

  private createUnit(unit: BattleUnit, isHero: boolean, index: number): UnitHandle {
    const formation = isHero ? FORMATION_HERO : FORMATION_ENEMY;
    const pos = formation[index % formation.length];
    const x = pos.x * this.width;
    const y = pos.y * this.height;

    const animator = new SpriteAnimator({
      container: this.fieldEl!,
      heroId: unit.template.id,
      x, y,
      facingRight: isHero,
      size: isHero ? 160 : 140,
      borderColor: isHero ? "#ffd700" : "#ff4444",
    });

    const hpContainer = document.createElement("div");
    hpContainer.style.cssText = `position:absolute; left:${x - 35}px; top:${y + 50}px; width:70px; z-index:6; text-align:center;`;

    const nameTag = document.createElement("div");
    nameTag.style.cssText = "font-size:10px; color:#fff; text-shadow:0 1px 3px #000; font-weight:bold; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
    nameTag.textContent = unit.name;
    hpContainer.appendChild(nameTag);

    const hpBar = document.createElement("div");
    hpBar.style.cssText = "width:70px; height:6px; background:#1a1a2e; border-radius:3px; overflow:hidden; border:1px solid #444;";
    const hpFill = document.createElement("div");
    hpFill.style.cssText = `width:100%; height:100%; background:${isHero ? "#44cc44" : "#cc4444"}; border-radius:3px; transition:width 0.3s;`;
    hpBar.appendChild(hpFill);
    hpContainer.appendChild(hpBar);

    const hpText = document.createElement("div");
    hpText.style.cssText = "font-size:9px; color:#aaa; margin-top:1px;";
    hpText.textContent = `${unit.currentHp}/${unit.maxHp}`;
    hpContainer.appendChild(hpText);

    this.fieldEl!.appendChild(hpContainer);

    return { unit, animator, hpFill, hpText, isHero };
  }

  private addHUD(): void {
    if (!this.stageConfig || !this.battleState) return;

    const top = document.createElement("div");
    top.style.cssText = "position:absolute; top:0; left:0; width:100%; padding:10px 20px; z-index:10; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(10,5,30,0.85), transparent);";
    top.innerHTML = `
      <div style="color:#ffd700; font-size:15px; font-weight:bold; text-shadow:0 2px 4px rgba(0,0,0,0.5);">Ch.${this.stageConfig.chapter} — Stage ${this.stageConfig.stage}</div>
      <div id="wave-info" style="color:#ddd; font-size:13px; text-shadow:0 1px 3px rgba(0,0,0,0.5);">Wave ${this.battleState.wave}/3</div>
    `;
    this.container.appendChild(top);

    const bottom = document.createElement("div");
    bottom.style.cssText = "position:absolute; bottom:0; left:0; width:100%; padding:12px; z-index:10; display:flex; justify-content:center; gap:10px; background:linear-gradient(0deg, rgba(10,5,30,0.85), transparent);";
    for (const spd of [1, 2, 4]) {
      const btn = document.createElement("button");
      const active = this.speed === spd;
      btn.style.cssText = `padding:8px 20px; font-size:13px; font-weight:bold; border-radius:6px; cursor:pointer; background:${active ? "rgba(255,215,0,0.2)" : "rgba(20,10,40,0.8)"}; border:1px solid ${active ? "#ffd700" : "#555"}; color:${active ? "#ffd700" : "#999"}; transition:all 0.15s;`;
      btn.textContent = `${spd}×`;
      btn.addEventListener("click", () => { this.speed = spd; });
      bottom.appendChild(btn);
    }
    const autoBtn = document.createElement("button");
    autoBtn.style.cssText = "padding:8px 20px; font-size:13px; border-radius:6px; cursor:pointer; background:rgba(68,204,68,0.15); border:1px solid #4c4; color:#4c4; font-weight:bold;";
    autoBtn.textContent = "AUTO ▶";
    bottom.appendChild(autoBtn);
    this.container.appendChild(bottom);
  }

  isActive() { return this.active; }

  update(dt: number): void {
    if (!this.active || !this.battleState) return;

    for (const h of [...this.heroes, ...this.enemies]) h.animator.update(dt);

    if (this.battleState.status === "fighting" && !this.processing) {
      this.turnTimer += dt * this.speed;
      if (this.turnTimer >= COMBAT.turnIntervalMs / 1000) {
        this.turnTimer -= COMBAT.turnIntervalMs / 1000;
        const action = executeTurn(this.battleState);
        if (action) this.queueAction(action);
        this.updateWaveInfo();
        this.checkEnd();
      }
    }

    if (this.battleState.status === "wave_clear" && this.stageConfig) {
      for (const e of this.enemies) e.animator.destroy();
      const enemies = this.stageConfig.enemies.map((id) => makeEnemyTemplate(id, this.stageConfig!.chapter, this.stageConfig!.stage));
      spawnNextWave(this.battleState, enemies, enemies.map(() => 1));
      this.enemies = this.battleState.enemies.map((u, i) => this.createUnit(u, false, i));
      this.updateWaveInfo();
    }
  }

  private queueAction(action: any): void {
    this.actionQueue.push(() => this.executeAction(action));
    if (!this.processing) this.processQueue();
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.actionQueue.length > 0) {
      const next = this.actionQueue.shift()!;
      await next();
    }
    this.processing = false;
  }

  private executeAction(action: any): Promise<void> {
    return new Promise((resolve) => {
      const attackerH = this.findHandle(action.attacker);
      if (!attackerH) { resolve(); return; }

      const targets = action.isAoe && action.aoeTargets
        ? action.aoeTargets.map((a: any) => ({ handle: this.findHandle(a.target), damage: a.damage, isCrit: a.isCrit, target: a.target }))
        : [{ handle: this.findHandle(action.target), damage: action.damage, isCrit: action.isCrit, target: action.target }];

      const mainTarget = targets[0]?.handle;
      if (!mainTarget) { resolve(); return; }

      const targetPos = mainTarget.animator.getPosition();
      attackerH.animator.playAttack(targetPos.x, targetPos.y, () => {
        for (const t of targets) {
          if (!t.handle) continue;
          t.handle.animator.playHit();
          this.updateHp(t.handle);
          this.showDamageNumber(t.handle, t.damage, t.isCrit);
          if (!t.target.alive) t.handle.animator.playDeath();
        }
      });

      setTimeout(resolve, 800 / this.speed);
    });
  }

  private updateHp(handle: UnitHandle): void {
    const ratio = Math.max(0, handle.unit.currentHp / handle.unit.maxHp);
    handle.hpFill.style.width = `${ratio * 100}%`;
    handle.hpFill.style.background = ratio > 0.5 ? (handle.isHero ? "#44cc44" : "#cc4444") : ratio > 0.25 ? "#ccaa00" : "#cc3333";
    handle.hpText.textContent = `${Math.max(0, handle.unit.currentHp)}/${handle.unit.maxHp}`;
  }

  private showDamageNumber(handle: UnitHandle, damage: number, isCrit: boolean): void {
    const pos = handle.animator.getPosition();
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${pos.x}px; top:${pos.y - 60}px; z-index:20;
      font-size:${isCrit ? "28px" : "20px"}; font-weight:bold;
      color:${isCrit ? "#ffd700" : "#ff4444"};
      text-shadow:0 0 8px ${isCrit ? "rgba(255,215,0,0.8)" : "rgba(255,0,0,0.5)"}, 0 2px 4px rgba(0,0,0,0.8);
      pointer-events:none;
      animation:dmg-fly 1s ease-out forwards;
      transform:translateX(-50%);
    `;
    el.textContent = isCrit ? `💥${damage}` : `-${damage}`;
    this.fieldEl?.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  private findHandle(unit: BattleUnit): UnitHandle | undefined {
    return this.heroes.find((h) => h.unit.id === unit.id) ?? this.enemies.find((h) => h.unit.id === unit.id);
  }

  private updateWaveInfo(): void {
    if (!this.battleState) return;
    const el = this.container.querySelector("#wave-info");
    if (el) el.textContent = `Wave ${this.battleState.wave}/3`;
  }

  private checkEnd(): void {
    if (!this.battleState || !this.stageConfig) return;
    const s = this.battleState.status as string;
    if (s === "won") {
      this.active = false;
      for (const h of this.heroes) if (h.unit.alive) h.animator.playVictory();
      const r = this.stageConfig.rewards;
      setTimeout(() => this.callbacks.onEnd("won", r.gold, r.exp, r.crystals), 1500);
    } else if (s === "lost") {
      this.active = false;
      setTimeout(() => this.callbacks.onEnd("lost", 0, 0, 0), 1500);
    }
  }

  destroy(): void {
    this.active = false;
    for (const h of [...this.heroes, ...this.enemies]) h.animator.destroy();
    this.heroes = [];
    this.enemies = [];
    this.battleState = null;
    this.actionQueue = [];
  }
}
