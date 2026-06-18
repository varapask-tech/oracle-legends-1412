import type { HeroTemplate } from "../shared/types";
import { COMBAT } from "../shared/balance";
import { STAGES, enemyStatsForStage } from "../shared/stages";
import { createBattleState, executeTurn, spawnNextWave, type BattleState, type BattleUnit } from "./systems/battle";
import { HERO_TEMPLATES } from "../shared/heroes";

const CHAPTER_BG: Record<number, string> = {
  1: "/assets/backgrounds/bg-forest.png",
  2: "/assets/backgrounds/bg-thunder.png",
  3: "/assets/backgrounds/bg-mirror.png",
  4: "/assets/backgrounds/bg-shadow.png",
  5: "/assets/backgrounds/bg-temple.png",
};

const HERO_PORTRAITS: Record<string, string> = {
  "zero-void": "/assets/characters/mr0-zero.png",
  "one-thunder": "/assets/characters/mr1-thunder.png",
  "two-crystal": "/assets/characters/ms2-crystal.png",
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
    title: isBoss ? "Boss" : "Monster",
    rarity: isBoss ? "epic" : "common",
    element: elements[hash % elements.length],
    heroClass: classes[hash % classes.length],
    baseStats: { hp: stats.hp, atk: stats.atk, def: stats.def, spd: 80 + (hash % 30), critRate: isBoss ? 0.15 : 0.05, critDmg: isBoss ? 1.8 : 1.5 },
    growthPerLevel: { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0 },
    skills: isBoss ? [{ id: `${enemyId}-skill`, name: "Boss Rage", description: "", cooldown: 5, damageMultiplier: 2.0, targetType: "aoe" as const }] : [],
    description: "", modelColor: isBoss ? 0xaa2222 : 0x886644,
  };
}

export interface BattleCallbacks {
  onEnd: (result: "won" | "lost", gold: number, exp: number, crystals: number) => void;
}

interface UnitUI {
  unit: BattleUnit;
  el: HTMLElement;
  portraitImg: HTMLImageElement;
  hpBar: HTMLElement;
  hpFill: HTMLElement;
  nameEl: HTMLElement;
  isHero: boolean;
  baseX: number;
  animState: "idle" | "attacking" | "hit" | "dead";
}

export class Battle2D {
  private container: HTMLElement;
  private battleState: BattleState | null = null;
  private heroUnits: UnitUI[] = [];
  private enemyUnits: UnitUI[] = [];
  private callbacks: BattleCallbacks;
  private speed = 1;
  private paused = false;
  private turnTimer = 0;
  private stageConfig: typeof STAGES[0] | null = null;
  private active = false;
  private damageLayer: HTMLElement;
  private sidePortraitLeft: HTMLElement;
  private sidePortraitRight: HTMLElement;

  constructor(container: HTMLElement, callbacks: BattleCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.damageLayer = document.createElement("div");
    this.damageLayer.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;";
    this.sidePortraitLeft = document.createElement("div");
    this.sidePortraitRight = document.createElement("div");
  }

  startBattle(stageId: string, heroTemplates: HeroTemplate[], heroLevels: number[]): void {
    this.stageConfig = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    const chapter = this.stageConfig.chapter;

    const enemyTemplates = this.stageConfig.enemies.map((id) => makeEnemyTemplate(id, chapter, this.stageConfig!.stage));
    this.battleState = createBattleState(heroTemplates, heroLevels, enemyTemplates, enemyTemplates.map(() => 1), 3);

    this.container.innerHTML = "";
    this.container.style.cssText = "width:100%; height:100%; position:relative; overflow:hidden; font-family:'Segoe UI',sans-serif;";

    const bgUrl = CHAPTER_BG[chapter] ?? CHAPTER_BG[1];
    const bg = document.createElement("div");
    bg.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:url('${bgUrl}') center/cover no-repeat, linear-gradient(180deg, #1a2a3a, #0a1a0a); z-index:0;`;
    this.container.appendChild(bg);

    this.setupSidePortraits(heroTemplates, enemyTemplates);
    this.setupBattleField();
    this.setupHUD();

    this.container.appendChild(this.damageLayer);
    this.turnTimer = 0;
    this.active = true;
  }

  private setupSidePortraits(heroes: HeroTemplate[], enemies: HeroTemplate[]): void {
    const leftPortrait = HERO_PORTRAITS[heroes[0]?.id ?? ""] ?? "";
    const rightPortrait = HERO_PORTRAITS[enemies[0]?.id ?? ""] ?? "";

    this.sidePortraitLeft.style.cssText = `
      position:absolute; left:-20px; top:50%; transform:translateY(-50%);
      width:200px; height:350px; z-index:1; opacity:0.3;
      background:${leftPortrait ? `url('${leftPortrait}') center/contain no-repeat` : "none"};
      filter:blur(2px);
    `;
    this.container.appendChild(this.sidePortraitLeft);

    if (rightPortrait) {
      this.sidePortraitRight.style.cssText = `
        position:absolute; right:-20px; top:50%; transform:translateY(-50%) scaleX(-1);
        width:200px; height:350px; z-index:1; opacity:0.3;
        background:url('${rightPortrait}') center/contain no-repeat;
        filter:blur(2px);
      `;
      this.container.appendChild(this.sidePortraitRight);
    }
  }

  private setupBattleField(): void {
    if (!this.battleState) return;

    const field = document.createElement("div");
    field.style.cssText = "position:absolute; top:15%; left:0; width:100%; height:55%; z-index:2; display:flex; justify-content:space-between; align-items:center; padding:0 15%;";

    const heroSide = document.createElement("div");
    heroSide.style.cssText = "display:flex; flex-direction:column; gap:8px; align-items:center;";
    this.heroUnits = this.battleState.heroes.map((unit, i) => this.createUnitUI(unit, true, heroSide));

    const vs = document.createElement("div");
    vs.style.cssText = "font-size:24px; color:#ffd700; text-shadow:0 0 10px rgba(255,215,0,0.5); font-weight:bold;";
    vs.textContent = "⚔️";

    const enemySide = document.createElement("div");
    enemySide.style.cssText = "display:flex; flex-direction:column; gap:8px; align-items:center;";
    this.enemyUnits = this.battleState.enemies.map((unit, i) => this.createUnitUI(unit, false, enemySide));

    field.appendChild(heroSide);
    field.appendChild(vs);
    field.appendChild(enemySide);
    this.container.appendChild(field);
  }

  private createUnitUI(unit: BattleUnit, isHero: boolean, parent: HTMLElement): UnitUI {
    const el = document.createElement("div");
    el.style.cssText = `
      display:flex; flex-direction:column; align-items:center; gap:4px;
      transition:transform 0.15s; position:relative;
    `;

    const portraitUrl = HERO_PORTRAITS[unit.template.id] ?? "";
    const portraitImg = document.createElement("img");
    if (portraitUrl) {
      portraitImg.src = portraitUrl;
    }
    portraitImg.style.cssText = `
      width:72px; height:72px; object-fit:contain; border-radius:8px;
      border:2px solid ${isHero ? "#ffd700" : "#ff4444"};
      background:rgba(10,5,20,0.6);
      image-rendering:auto;
      ${!isHero ? "transform:scaleX(-1);" : ""}
    `;
    if (!portraitUrl) {
      portraitImg.style.background = `#${unit.template.modelColor.toString(16).padStart(6, "0")}`;
      portraitImg.alt = unit.name;
    }
    portraitImg.style.cssText += "animation: unit-idle 2s ease-in-out infinite;";
    el.appendChild(portraitImg);

    const nameEl = document.createElement("div");
    nameEl.style.cssText = "font-size:10px; color:#fff; text-shadow:0 1px 2px #000; text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
    nameEl.textContent = unit.name;
    el.appendChild(nameEl);

    const hpBar = document.createElement("div");
    hpBar.style.cssText = "width:64px; height:6px; background:#1a1a2e; border-radius:3px; overflow:hidden; border:1px solid #333;";
    const hpFill = document.createElement("div");
    hpFill.style.cssText = `width:100%; height:100%; background:${isHero ? "#44cc44" : "#cc4444"}; border-radius:3px; transition:width 0.3s;`;
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);

    parent.appendChild(el);
    return { unit, el, portraitImg, hpBar, hpFill, nameEl, isHero, baseX: 0, animState: "idle" };
  }

  private setupHUD(): void {
    if (!this.stageConfig || !this.battleState) return;

    const topBar = document.createElement("div");
    topBar.style.cssText = `
      position:absolute; top:0; left:0; width:100%; padding:8px 16px; z-index:5;
      display:flex; justify-content:space-between; align-items:center;
      background:linear-gradient(180deg, rgba(10,5,30,0.9), transparent);
    `;
    topBar.innerHTML = `
      <div style="color:#ffd700; font-size:14px; font-weight:bold;">Chapter ${this.stageConfig.chapter} — Stage ${this.stageConfig.stage}</div>
      <div id="wave-info" style="color:#aaa; font-size:12px;">Wave ${this.battleState.wave}/3</div>
    `;
    this.container.appendChild(topBar);

    const bottomBar = document.createElement("div");
    bottomBar.style.cssText = `
      position:absolute; bottom:0; left:0; width:100%; padding:12px 16px; z-index:5;
      display:flex; justify-content:center; gap:12px; align-items:center;
      background:linear-gradient(0deg, rgba(10,5,30,0.9), transparent);
    `;

    for (const spd of [1, 2, 4]) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        padding:6px 16px; font-size:12px; font-weight:bold; border-radius:6px; cursor:pointer;
        background:${this.speed === spd ? "rgba(255,215,0,0.15)" : "rgba(20,10,40,0.8)"};
        border:1px solid ${this.speed === spd ? "#ffd700" : "#444"};
        color:${this.speed === spd ? "#ffd700" : "#888"};
      `;
      btn.textContent = `${spd}×`;
      btn.addEventListener("click", () => { this.speed = spd; });
      bottomBar.appendChild(btn);
    }

    const autoBtn = document.createElement("button");
    autoBtn.style.cssText = "padding:6px 16px; font-size:12px; border-radius:6px; cursor:pointer; background:rgba(68,204,68,0.15); border:1px solid #4c4; color:#4c4; font-weight:bold;";
    autoBtn.textContent = "AUTO";
    bottomBar.appendChild(autoBtn);

    this.container.appendChild(bottomBar);
  }

  isActive() { return this.active; }

  update(dt: number): void {
    if (!this.active || !this.battleState || this.paused) return;

    if (this.battleState.status === "fighting") {
      this.turnTimer += dt * this.speed;
      if (this.turnTimer >= COMBAT.turnIntervalMs / 1000) {
        this.turnTimer -= COMBAT.turnIntervalMs / 1000;
        const action = executeTurn(this.battleState);
        if (action) this.playAction(action);

        const waveInfo = this.container.querySelector("#wave-info");
        if (waveInfo) waveInfo.textContent = `Wave ${this.battleState.wave}/3`;

        this.checkBattleEnd();
      }
    }

    if (this.battleState.status === "wave_clear" && this.stageConfig) {
      const enemies = this.stageConfig.enemies.map((id) =>
        makeEnemyTemplate(id, this.stageConfig!.chapter, this.stageConfig!.stage));
      spawnNextWave(this.battleState, enemies, enemies.map(() => 1));
      this.rebuildEnemies();
    }
  }

  private playAction(action: any): void {
    const attackerUI = this.findUI(action.attacker);
    const targetUI = this.findUI(action.target);

    if (attackerUI) {
      attackerUI.el.style.transform = attackerUI.isHero ? "translateX(30px) scale(1.1)" : "translateX(-30px) scale(1.1)";
      setTimeout(() => { attackerUI.el.style.transform = ""; }, 300);
    }

    const applyHit = (ui: UnitUI | undefined, damage: number, isCrit: boolean) => {
      if (!ui) return;
      const ratio = Math.max(0, ui.unit.currentHp / ui.unit.maxHp);
      ui.hpFill.style.width = `${ratio * 100}%`;
      ui.hpFill.style.background = ratio > 0.5 ? (ui.isHero ? "#44cc44" : "#cc4444") : ratio > 0.25 ? "#ccaa00" : "#cc3333";

      ui.el.style.transform = "translateX(-5px)";
      ui.portraitImg.style.filter = "brightness(2)";
      setTimeout(() => {
        ui.el.style.transform = "";
        ui.portraitImg.style.filter = "";
      }, 150);

      this.showDamageNumber(ui.el, damage, isCrit);

      if (!ui.unit.alive) {
        ui.el.style.opacity = "0.3";
        ui.el.style.transform = "scale(0.8)";
        ui.portraitImg.style.filter = "grayscale(1)";
      }
    };

    if (action.isAoe && action.aoeTargets) {
      for (const aoe of action.aoeTargets) {
        applyHit(this.findUI(aoe.target), aoe.damage, aoe.isCrit);
      }
    } else {
      applyHit(targetUI, action.damage, action.isCrit);
    }
  }

  private showDamageNumber(parentEl: HTMLElement, damage: number, isCrit: boolean): void {
    const dmg = document.createElement("div");
    dmg.style.cssText = `
      position:absolute; top:-10px; left:50%; transform:translateX(-50%);
      font-size:${isCrit ? "22px" : "16px"}; font-weight:bold;
      color:${isCrit ? "#ffd700" : "#ff4444"};
      text-shadow:0 0 6px ${isCrit ? "rgba(255,215,0,0.8)" : "rgba(255,0,0,0.5)"}, 0 1px 2px #000;
      pointer-events:none; z-index:20;
      animation:dmg-float 0.8s ease-out forwards;
    `;
    dmg.textContent = isCrit ? `${damage}!` : `-${damage}`;
    parentEl.appendChild(dmg);
    setTimeout(() => dmg.remove(), 900);
  }

  private findUI(unit: BattleUnit): UnitUI | undefined {
    return this.heroUnits.find((u) => u.unit.id === unit.id)
      ?? this.enemyUnits.find((u) => u.unit.id === unit.id);
  }

  private rebuildEnemies(): void {
    if (!this.battleState) return;
    const enemySide = this.enemyUnits[0]?.el.parentElement;
    if (!enemySide) return;
    enemySide.innerHTML = "";
    this.enemyUnits = this.battleState.enemies.map((unit) => this.createUnitUI(unit, false, enemySide));
  }

  private checkBattleEnd(): void {
    if (!this.battleState || !this.stageConfig) return;
    const s = this.battleState.status as string;
    if (s === "won") {
      this.active = false;
      const r = this.stageConfig.rewards;
      setTimeout(() => this.callbacks.onEnd("won", r.gold, r.exp, r.crystals), 1200);
    } else if (s === "lost") {
      this.active = false;
      setTimeout(() => this.callbacks.onEnd("lost", 0, 0, 0), 1200);
    }
  }

  destroy(): void {
    this.active = false;
    this.battleState = null;
    this.heroUnits = [];
    this.enemyUnits = [];
  }
}
