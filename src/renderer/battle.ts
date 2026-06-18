import type { HeroTemplate } from "../shared/types";
import { COMBAT } from "../shared/balance";
import { STAGES, enemyStatsForStage } from "../shared/stages";
import { createBattleState, executeTurn, spawnNextWave, type BattleState, type BattleUnit } from "./systems/battle";

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
  "three-bloom": "/assets/characters/ms3-creative.png",
  "four-aegis": "/assets/characters/mr4-wellness.png",
  "aria-flameblade": "/assets/characters/aria-flame.png",
  "luna-tideweaver": "/assets/characters/luna-tide.png",
  "kael-stoneguard": "/assets/characters/kael-stone.png",
  "nyx-shadowstep": "/assets/characters/nyx-shadow.png",
  "sol-lightbringer": "/assets/characters/sol-dawn.png",
  "frost-whisper": "/assets/characters/frost-whisper.png",
  "ember-phoenix": "/assets/characters/ember-phoenix.png",
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
  hpFill: HTMLElement;
  isHero: boolean;
}

export class Battle2D {
  private container: HTMLElement;
  private battleState: BattleState | null = null;
  private heroUnits: UnitUI[] = [];
  private enemyUnits: UnitUI[] = [];
  private callbacks: BattleCallbacks;
  private speed = 1;
  private turnTimer = 0;
  private stageConfig: typeof STAGES[0] | null = null;
  private active = false;

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
    const bg = document.createElement("div");
    bg.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:url('${bgUrl}') center/cover no-repeat, linear-gradient(180deg, #1a2a3a, #0a1a0a); z-index:0;`;
    this.container.appendChild(bg);

    const field = document.createElement("div");
    field.style.cssText = "position:absolute; top:10%; left:0; width:100%; height:60%; z-index:2; display:flex; justify-content:space-around; align-items:center; padding:0 10%;";

    const heroSide = document.createElement("div");
    heroSide.id = "hero-side";
    heroSide.style.cssText = "display:flex; flex-direction:column; gap:12px; align-items:center;";
    this.heroUnits = this.battleState.heroes.map((u) => this.createUnitEl(u, true, heroSide));

    const enemySide = document.createElement("div");
    enemySide.id = "enemy-side";
    enemySide.style.cssText = "display:flex; flex-direction:column; gap:12px; align-items:center;";
    this.enemyUnits = this.battleState.enemies.map((u) => this.createUnitEl(u, false, enemySide));

    field.appendChild(heroSide);
    field.appendChild(enemySide);
    this.container.appendChild(field);

    this.addHUD();
    this.turnTimer = 0;
    this.active = true;
  }

  private createUnitEl(unit: BattleUnit, isHero: boolean, parent: HTMLElement): UnitUI {
    const el = document.createElement("div");
    el.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:4px; transition:transform 0.2s; position:relative;";

    const portraitUrl = HERO_PORTRAITS[unit.template.id] ?? "";
    const borderColor = isHero ? "#ffd700" : "#ff4444";

    if (portraitUrl) {
      const img = document.createElement("img");
      img.src = portraitUrl;
      img.style.cssText = `width:80px; height:80px; object-fit:contain; border-radius:10px; border:2px solid ${borderColor}; background:rgba(10,5,20,0.7); animation:unit-idle 2s ease-in-out infinite;`;
      if (!isHero) img.style.transform = "scaleX(-1)";
      el.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.style.cssText = `width:80px; height:80px; border-radius:10px; border:2px solid ${borderColor}; background:#${unit.template.modelColor.toString(16).padStart(6, "0")}; display:flex; align-items:center; justify-content:center; font-size:28px; animation:unit-idle 2s ease-in-out infinite;`;
      const elEmoji: Record<string, string> = { fire: "🔥", water: "💧", earth: "🌿", light: "⚡", dark: "🌑" };
      placeholder.textContent = elEmoji[unit.template.element] ?? "⚔️";
      el.appendChild(placeholder);
    }

    const name = document.createElement("div");
    name.style.cssText = "font-size:11px; color:#fff; text-shadow:0 1px 3px #000; font-weight:bold;";
    name.textContent = unit.name;
    el.appendChild(name);

    const hpBar = document.createElement("div");
    hpBar.style.cssText = "width:70px; height:7px; background:#1a1a2e; border-radius:4px; overflow:hidden; border:1px solid #333;";
    const hpFill = document.createElement("div");
    hpFill.style.cssText = `width:100%; height:100%; background:${isHero ? "#44cc44" : "#cc4444"}; border-radius:4px; transition:width 0.3s;`;
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);

    parent.appendChild(el);
    return { unit, el, hpFill, isHero };
  }

  private addHUD(): void {
    if (!this.stageConfig || !this.battleState) return;

    const top = document.createElement("div");
    top.style.cssText = "position:absolute; top:0; left:0; width:100%; padding:10px 20px; z-index:5; display:flex; justify-content:space-between; background:linear-gradient(180deg, rgba(10,5,30,0.9), transparent);";
    top.innerHTML = `
      <div style="color:#ffd700; font-size:15px; font-weight:bold;">Ch.${this.stageConfig.chapter} Stage ${this.stageConfig.stage}</div>
      <div id="wave-info" style="color:#aaa; font-size:13px;">Wave ${this.battleState.wave}/3</div>
    `;
    this.container.appendChild(top);

    const bottom = document.createElement("div");
    bottom.style.cssText = "position:absolute; bottom:0; left:0; width:100%; padding:12px; z-index:5; display:flex; justify-content:center; gap:10px; background:linear-gradient(0deg, rgba(10,5,30,0.9), transparent);";
    for (const spd of [1, 2, 4]) {
      const btn = document.createElement("button");
      btn.style.cssText = `padding:6px 18px; font-size:13px; font-weight:bold; border-radius:6px; cursor:pointer; background:${this.speed === spd ? "rgba(255,215,0,0.2)" : "rgba(20,10,40,0.8)"}; border:1px solid ${this.speed === spd ? "#ffd700" : "#444"}; color:${this.speed === spd ? "#ffd700" : "#888"};`;
      btn.textContent = `${spd}×`;
      btn.addEventListener("click", () => { this.speed = spd; });
      bottom.appendChild(btn);
    }
    const autoBtn = document.createElement("button");
    autoBtn.style.cssText = "padding:6px 18px; font-size:13px; border-radius:6px; cursor:pointer; background:rgba(68,204,68,0.2); border:1px solid #4c4; color:#4c4; font-weight:bold;";
    autoBtn.textContent = "AUTO";
    bottom.appendChild(autoBtn);
    this.container.appendChild(bottom);
  }

  isActive() { return this.active; }

  update(dt: number): void {
    if (!this.active || !this.battleState) return;
    if (this.battleState.status === "fighting") {
      this.turnTimer += dt * this.speed;
      if (this.turnTimer >= COMBAT.turnIntervalMs / 1000) {
        this.turnTimer -= COMBAT.turnIntervalMs / 1000;
        const action = executeTurn(this.battleState);
        if (action) this.playAction(action);
        const wi = this.container.querySelector("#wave-info");
        if (wi) wi.textContent = `Wave ${this.battleState.wave}/3`;
        this.checkEnd();
      }
    }
    if (this.battleState.status === "wave_clear" && this.stageConfig) {
      const enemies = this.stageConfig.enemies.map((id) => makeEnemyTemplate(id, this.stageConfig!.chapter, this.stageConfig!.stage));
      spawnNextWave(this.battleState, enemies, enemies.map(() => 1));
      const side = this.container.querySelector("#enemy-side");
      if (side) { side.innerHTML = ""; this.enemyUnits = this.battleState.enemies.map((u) => this.createUnitEl(u, false, side as HTMLElement)); }
    }
  }

  private playAction(action: any): void {
    const aUI = this.findUI(action.attacker);
    if (aUI) {
      aUI.el.style.transform = aUI.isHero ? "translateX(40px) scale(1.15)" : "translateX(-40px) scale(1.15)";
      setTimeout(() => { aUI.el.style.transform = ""; }, 350);
    }
    const hit = (ui: UnitUI | undefined, damage: number, isCrit: boolean) => {
      if (!ui) return;
      const ratio = Math.max(0, ui.unit.currentHp / ui.unit.maxHp);
      ui.hpFill.style.width = `${ratio * 100}%`;
      ui.hpFill.style.background = ratio > 0.5 ? (ui.isHero ? "#44cc44" : "#cc4444") : ratio > 0.25 ? "#ccaa00" : "#cc3333";
      ui.el.style.transform = "translateX(-6px)";
      const firstChild = ui.el.firstElementChild as HTMLElement;
      if (firstChild) firstChild.style.filter = "brightness(2)";
      setTimeout(() => { ui.el.style.transform = ""; if (firstChild) firstChild.style.filter = ""; }, 200);
      this.showDmg(ui.el, damage, isCrit);
      if (!ui.unit.alive) { ui.el.style.opacity = "0.3"; ui.el.style.transform = "scale(0.8)"; if (firstChild) firstChild.style.filter = "grayscale(1)"; }
    };
    if (action.isAoe && action.aoeTargets) { for (const a of action.aoeTargets) hit(this.findUI(a.target), a.damage, a.isCrit); }
    else hit(this.findUI(action.target), action.damage, action.isCrit);
  }

  private showDmg(parent: HTMLElement, dmg: number, crit: boolean): void {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute; top:-10px; left:50%; font-size:${crit ? "22px" : "16px"}; font-weight:bold; color:${crit ? "#ffd700" : "#ff4444"}; text-shadow:0 0 6px ${crit ? "rgba(255,215,0,0.8)" : "rgba(255,0,0,0.5)"}; pointer-events:none; z-index:20; animation:dmg-float 0.8s ease-out forwards;`;
    el.textContent = crit ? `${dmg}!` : `-${dmg}`;
    parent.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  private findUI(unit: BattleUnit): UnitUI | undefined {
    return this.heroUnits.find((u) => u.unit.id === unit.id) ?? this.enemyUnits.find((u) => u.unit.id === unit.id);
  }

  private checkEnd(): void {
    if (!this.battleState || !this.stageConfig) return;
    const s = this.battleState.status as string;
    if (s === "won") { this.active = false; const r = this.stageConfig.rewards; setTimeout(() => this.callbacks.onEnd("won", r.gold, r.exp, r.crystals), 1200); }
    else if (s === "lost") { this.active = false; setTimeout(() => this.callbacks.onEnd("lost", 0, 0, 0), 1200); }
  }

  destroy(): void { this.active = false; this.battleState = null; this.heroUnits = []; this.enemyUnits = []; }
}
