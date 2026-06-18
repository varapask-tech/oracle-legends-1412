import type { HeroTemplate } from "../shared/types";
import { COMBAT } from "../shared/balance";
import { STAGES, enemyStatsForStage } from "../shared/stages";
import { drawChibiSprite, getIdleFrame, getAttackFrame, getHitFrame } from "./sprites";
import { drawBattleBackground, type ChapterTheme } from "./backgrounds";
import { EffectsLayer } from "./effects";
import { createBattleState, executeTurn, spawnNextWave, type BattleState, type BattleUnit, type BattleAction } from "./systems/battle";
import { HERO_TEMPLATES } from "../shared/heroes";

const CHAPTER_THEMES: ChapterTheme[] = ["forest", "thunder", "mirror", "shadow", "temple"];

interface UnitDisplay {
  unit: BattleUnit;
  spriteCanvas: HTMLCanvasElement;
  x: number;
  y: number;
  animState: "idle" | "attacking" | "hit" | "dead";
  animProgress: number;
  facingRight: boolean;
}

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

export class Battle2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effects: EffectsLayer;
  private bgCanvas: HTMLCanvasElement | null = null;
  private battleState: BattleState | null = null;
  private heroDisplays: UnitDisplay[] = [];
  private enemyDisplays: UnitDisplay[] = [];
  private callbacks: BattleCallbacks;
  private speed = 1;
  private paused = false;
  private turnTimer = 0;
  private tick = 0;
  private stageConfig: typeof STAGES[0] | null = null;
  private active = false;

  constructor(canvas: HTMLCanvasElement, callbacks: BattleCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.effects = new EffectsLayer(canvas.width, canvas.height);
    this.callbacks = callbacks;
  }

  get effectsElement() { return this.effects.element; }

  startBattle(stageId: string, heroTemplates: HeroTemplate[], heroLevels: number[]): void {
    this.stageConfig = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    const chapter = this.stageConfig.chapter;

    this.bgCanvas = drawBattleBackground(this.canvas.width, this.canvas.height, CHAPTER_THEMES[(chapter - 1) % 5]);

    const enemyTemplates = this.stageConfig.enemies.map((id) => makeEnemyTemplate(id, chapter, this.stageConfig!.stage));
    const enemyLevels = enemyTemplates.map(() => 1);

    this.battleState = createBattleState(heroTemplates, heroLevels, enemyTemplates, enemyLevels, 3);
    this.heroDisplays = this.createDisplays(this.battleState.heroes, true);
    this.enemyDisplays = this.createDisplays(this.battleState.enemies, false);
    this.turnTimer = 0;
    this.tick = 0;
    this.active = true;
  }

  private createDisplays(units: BattleUnit[], isHero: boolean): UnitDisplay[] {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const startX = isHero ? w * 0.15 : w * 0.65;
    const spacing = 80;
    const baseY = h * 0.55;

    return units.map((unit, i) => ({
      unit,
      spriteCanvas: drawChibiSprite({
        heroClass: unit.template.heroClass,
        element: unit.template.element,
        rarity: unit.template.rarity,
        modelColor: unit.template.modelColor,
        size: 80,
      }),
      x: startX + (i % 2) * spacing * (isHero ? -1 : 1),
      y: baseY + (i - 1) * 70,
      animState: "idle",
      animProgress: 0,
      facingRight: isHero,
      }));
  }

  setSpeed(s: number) { this.speed = s; }
  setPaused(p: boolean) { this.paused = p; }
  isActive() { return this.active; }

  update(dt: number): void {
    if (!this.active || !this.battleState) return;

    this.tick++;
    this.updateAnimations(dt);
    this.effects.update(dt);

    if (!this.paused && this.battleState.status === "fighting") {
      this.turnTimer += dt * this.speed;
      if (this.turnTimer >= COMBAT.turnIntervalMs / 1000) {
        this.turnTimer -= COMBAT.turnIntervalMs / 1000;
        const action = executeTurn(this.battleState);
        if (action) this.playAction(action);
        this.checkBattleEnd();
      }
    }

    if (this.battleState.status === "wave_clear") {
      const nextIdx = this.battleState.wave;
      if (nextIdx < 3 && this.stageConfig) {
        const enemies = this.stageConfig.enemies.map((id) =>
          makeEnemyTemplate(id, this.stageConfig!.chapter, this.stageConfig!.stage));
        spawnNextWave(this.battleState, enemies, enemies.map(() => 1));
        this.enemyDisplays = this.createDisplays(this.battleState.enemies, false);
      }
    }

    this.render();
  }

  private playAction(action: BattleAction): void {
    const attackerD = this.findDisplay(action.attacker);
    if (attackerD) {
      attackerD.animState = "attacking";
      attackerD.animProgress = 0;
    }

    if (action.isAoe && action.aoeTargets) {
      for (const aoe of action.aoeTargets) {
        const td = this.findDisplay(aoe.target);
        if (td) {
          td.animState = "hit";
          td.animProgress = 0;
          this.effects.showDamage(td.x, td.y - 40, aoe.damage, aoe.target.template.element, aoe.isCrit);
          if (!aoe.target.alive) td.animState = "dead";
        }
      }
    } else {
      const td = this.findDisplay(action.target);
      if (td) {
        td.animState = "hit";
        td.animProgress = 0;
        this.effects.showDamage(td.x, td.y - 40, action.damage, action.target.template.element, action.isCrit);
        if (!action.target.alive) td.animState = "dead";
      }
    }

    if (action.isCrit) this.effects.screenShake(4, 0.2);
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

  private findDisplay(unit: BattleUnit): UnitDisplay | undefined {
    return this.heroDisplays.find((d) => d.unit.id === unit.id)
      ?? this.enemyDisplays.find((d) => d.unit.id === unit.id);
  }

  private updateAnimations(dt: number): void {
    for (const d of [...this.heroDisplays, ...this.enemyDisplays]) {
      if (d.animState === "attacking" || d.animState === "hit") {
        d.animProgress += dt * 2 * this.speed;
        if (d.animProgress >= 1) {
          d.animState = d.unit.alive ? "idle" : "dead";
          d.animProgress = 0;
        }
      }
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0, canvas.width, canvas.height);

    const allDisplays = [...this.heroDisplays, ...this.enemyDisplays];
    for (const d of allDisplays) {
      if (d.animState === "dead" && d.animProgress === 0) continue;

      let frame = getIdleFrame(this.tick);
      if (d.animState === "attacking") frame = getAttackFrame(d.animProgress, d.facingRight);
      else if (d.animState === "hit") frame = getHitFrame(d.animProgress);

      const alpha = d.animState === "dead" ? 0.3 : 1;
      ctx.globalAlpha = alpha;

      const dx = d.x + frame.offsetX - 40;
      const dy = d.y + frame.offsetY - 40;
      ctx.save();
      ctx.translate(dx + 40, dy + 40);
      ctx.scale(d.facingRight ? 1 : -1, 1);
      ctx.scale(frame.scaleX, frame.scaleY);
      ctx.drawImage(d.spriteCanvas, -40, -40, 80, 80);
      ctx.restore();

      ctx.globalAlpha = 1;

      this.drawHpBar(ctx, d);
      this.drawNameTag(ctx, d);
    }

    if (this.battleState) {
      this.drawWaveInfo(ctx);
    }

    this.effects.update(0.016);
  }

  private drawHpBar(ctx: CanvasRenderingContext2D, d: UnitDisplay): void {
    const ratio = Math.max(0, d.unit.currentHp / d.unit.maxHp);
    const bw = 60, bh = 6;
    const bx = d.x - bw / 2, by = d.y - 52;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(bx, by, bw, bh);

    const color = ratio > 0.5 ? "#44cc44" : ratio > 0.25 ? "#ccaa00" : "#cc3333";
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw * ratio, bh);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  private drawNameTag(ctx: CanvasRenderingContext2D, d: UnitDisplay): void {
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#ddd";
    ctx.textAlign = "center";
    ctx.fillText(d.unit.name, d.x, d.y - 56);
  }

  private drawWaveInfo(ctx: CanvasRenderingContext2D): void {
    if (!this.battleState || !this.stageConfig) return;
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText(
      `Chapter ${this.stageConfig.chapter} — Stage ${this.stageConfig.stage}  |  Wave ${this.battleState.wave}/${this.battleState.totalWaves}`,
      this.canvas.width / 2, 28,
    );
  }

  destroy(): void {
    this.active = false;
    this.battleState = null;
  }
}
