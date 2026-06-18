import type { HeroTemplate, HeroInstance, GameState } from "../shared/types";
import { HERO_TEMPLATES } from "../shared/heroes";
import { STAGES, enemyStatsForStage } from "../shared/stages";
import { BattleScene } from "./scenes/battle-scene";
import { initHud, updateHud, destroyHud, type HudState, type BattleHeroState } from "./ui/hud";
import { showTeamSelect, destroyTeamSelect } from "./ui/team-select";

type Screen = "title" | "team-select" | "battle" | "rewards";

function makeEnemyTemplate(enemyId: string, chapter: number, stage: number): HeroTemplate {
  const stats = enemyStatsForStage(chapter, stage);
  const classes: Array<"warrior" | "mage" | "archer" | "tank"> = ["warrior", "mage", "archer", "tank"];
  const elements: Array<"fire" | "water" | "earth" | "dark"> = ["fire", "water", "earth", "dark"];
  const hash = enemyId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const isBoss = enemyId.startsWith("boss-");
  return {
    id: enemyId,
    name: isBoss ? enemyId.replace("boss-", "Boss ").replace(/-/g, " ") : enemyId.replace(/-/g, " "),
    title: isBoss ? "Chapter Boss" : "Monster",
    rarity: isBoss ? "epic" : "common",
    element: elements[hash % elements.length],
    heroClass: classes[hash % classes.length],
    baseStats: {
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: 80 + (hash % 30),
      critRate: isBoss ? 0.15 : 0.05,
      critDmg: isBoss ? 1.8 : 1.5,
    },
    growthPerLevel: { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0 },
    skills: isBoss
      ? [{
          id: `${enemyId}-skill`,
          name: "Boss Rage",
          description: "Powerful boss attack",
          cooldown: 5,
          damageMultiplier: 2.0,
          targetType: "aoe" as const,
        }]
      : [],
    description: "",
    modelColor: isBoss ? 0x880000 : 0x664422,
  };
}

function createStarterRoster(): HeroInstance[] {
  return HERO_TEMPLATES.slice(0, 3).map((t) => ({
    instanceId: `starter-${t.id}`,
    templateId: t.id,
    level: 1,
    exp: 0,
    stars: 1,
    equipment: [],
  }));
}

function createInitialGameState(): GameState {
  const roster = createStarterRoster();
  return {
    heroes: roster,
    team: roster.map((h) => h.instanceId),
    gold: 500,
    crystals: 100,
    currentStage: "1-1",
    lastOnlineAt: Date.now(),
    totalPlayTime: 0,
  };
}

export class Game {
  private canvas: HTMLCanvasElement;
  private battleScene: BattleScene;
  private gameState: GameState;
  private currentScreen: Screen = "title";
  private animFrameId = 0;
  private lastTime = 0;
  private autoSpeed = 1;
  private paused = false;
  private hudUpdateTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.battleScene = new BattleScene(canvas);
    this.gameState = createInitialGameState();
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  showTeamSelect(): void {
    this.currentScreen = "team-select";
    this.battleScene.setPaused(true);

    showTeamSelect(this.gameState.heroes, this.gameState.team, {
      onConfirm: (team) => {
        this.gameState.team = team;
        this.startBattle();
      },
      onCancel: () => {
        this.currentScreen = "title";
        this.showTitleScreen();
      },
    });
  }

  private startBattle(): void {
    destroyTeamSelect();
    this.currentScreen = "battle";

    const stageId = this.gameState.currentStage;
    const stageConfig = STAGES.find((s) => s.id === stageId) ?? STAGES[0];

    const heroTemplates: HeroTemplate[] = [];
    const heroLevels: number[] = [];
    for (const instanceId of this.gameState.team) {
      const instance = this.gameState.heroes.find((h) => h.instanceId === instanceId);
      if (!instance) continue;
      const template = HERO_TEMPLATES.find((t) => t.id === instance.templateId);
      if (!template) continue;
      heroTemplates.push(template);
      heroLevels.push(instance.level);
    }

    const waves = [];
    const enemyCount = Math.min(3, stageConfig.enemies.length || 3);
    for (let w = 0; w < 3; w++) {
      const templates: HeroTemplate[] = [];
      const levels: number[] = [];
      for (let e = 0; e < enemyCount; e++) {
        const enemyId = stageConfig.enemies[e % stageConfig.enemies.length] ?? "slime";
        templates.push(makeEnemyTemplate(enemyId, stageConfig.chapter, stageConfig.stage));
        levels.push(1);
      }
      waves.push({ templates, levels });
    }

    initHud({
      onSpeedChange: (speed) => {
        this.autoSpeed = speed;
        this.battleScene.setAutoSpeed(speed);
      },
      onPauseToggle: () => {
        this.paused = !this.paused;
        this.battleScene.setPaused(this.paused);
      },
    });

    this.battleScene.startBattle({
      heroTemplates,
      heroLevels,
      waves,
      autoSpeed: this.autoSpeed,
      onBattleEnd: (result) => this.handleBattleEnd(result),
    });
  }

  private handleBattleEnd(result: "won" | "lost"): void {
    this.currentScreen = "rewards";
    destroyHud();

    const stageConfig = STAGES.find((s) => s.id === this.gameState.currentStage) ?? STAGES[0];

    const overlay = document.getElementById("ui-overlay");
    if (!overlay) return;

    const popup = document.createElement("div");
    popup.id = "reward-popup";
    popup.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(5, 2, 15, 0.9);
      font-family: 'Segoe UI', sans-serif;
      pointer-events: auto;
    `;

    if (result === "won") {
      const rewards = stageConfig.rewards;
      this.gameState.gold += rewards.gold;
      this.gameState.crystals += rewards.crystals;

      for (const instance of this.gameState.heroes) {
        if (this.gameState.team.includes(instance.instanceId)) {
          instance.exp += rewards.exp;
          while (instance.exp >= instance.level * 100) {
            instance.exp -= instance.level * 100;
            instance.level++;
          }
        }
      }

      const stageIdx = STAGES.findIndex((s) => s.id === this.gameState.currentStage);
      if (stageIdx < STAGES.length - 1) {
        this.gameState.currentStage = STAGES[stageIdx + 1].id;
      }

      popup.innerHTML = `
        <h1 style="color: #ffd700; font-size: 36px; margin-bottom: 8px;">⚔️ Victory!</h1>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 24px;">${stageConfig.name}</p>
        <div style="display: flex; gap: 24px; margin-bottom: 32px;">
          <div style="text-align: center;">
            <div style="font-size: 24px;">💰</div>
            <div style="color: #ffd700; font-size: 18px; font-weight: bold;">+${rewards.gold}</div>
            <div style="color: #888; font-size: 11px;">Gold</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px;">✨</div>
            <div style="color: #88ccff; font-size: 18px; font-weight: bold;">+${rewards.exp}</div>
            <div style="color: #888; font-size: 11px;">EXP</div>
          </div>
          ${rewards.crystals > 0 ? `
          <div style="text-align: center;">
            <div style="font-size: 24px;">💎</div>
            <div style="color: #aa88ff; font-size: 18px; font-weight: bold;">+${rewards.crystals}</div>
            <div style="color: #888; font-size: 11px;">Crystals</div>
          </div>` : ""}
        </div>
      `;
    } else {
      popup.innerHTML = `
        <h1 style="color: #ff4444; font-size: 36px; margin-bottom: 8px;">💀 Defeated</h1>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 32px;">${stageConfig.name}</p>
        <p style="color: #888; font-size: 13px; margin-bottom: 24px;">Level up your heroes and try again!</p>
      `;
    }

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText = "display: flex; gap: 16px;";

    const continueBtn = document.createElement("button");
    continueBtn.style.cssText = `
      padding: 12px 48px; font-size: 16px; font-weight: bold; cursor: pointer;
      background: linear-gradient(135deg, #ffd700, #ff8c00);
      border: none; border-radius: 8px; color: #1a0a00;
      transition: transform 0.2s;
    `;
    continueBtn.textContent = result === "won" ? "Next Stage →" : "Retry";
    continueBtn.addEventListener("click", () => {
      popup.remove();
      this.startBattle();
    });
    continueBtn.addEventListener("mouseenter", () => { continueBtn.style.transform = "scale(1.05)"; });
    continueBtn.addEventListener("mouseleave", () => { continueBtn.style.transform = ""; });
    btnContainer.appendChild(continueBtn);

    const menuBtn = document.createElement("button");
    menuBtn.style.cssText = `
      padding: 12px 32px; font-size: 14px; font-weight: bold; cursor: pointer;
      background: rgba(40, 30, 60, 0.8);
      border: 1px solid #666; border-radius: 8px; color: #888;
      transition: transform 0.2s;
    `;
    menuBtn.textContent = "Change Team";
    menuBtn.addEventListener("click", () => {
      popup.remove();
      this.showTeamSelect();
    });
    btnContainer.appendChild(menuBtn);

    popup.appendChild(btnContainer);
    overlay.appendChild(popup);
  }

  private showTitleScreen(): void {
    const titleScreen = document.getElementById("title-screen");
    if (titleScreen) titleScreen.style.display = "flex";
    this.currentScreen = "title";
  }

  private buildHudState(): HudState {
    const battleState = this.battleScene.getState();
    if (!battleState) {
      return {
        chapter: 1, stage: 1, wave: 1, maxWave: 1,
        heroes: [], enemies: [],
        autoSpeed: this.autoSpeed, paused: this.paused,
        gold: this.gameState.gold, crystals: this.gameState.crystals,
      };
    }

    const stageConfig = STAGES.find((s) => s.id === this.gameState.currentStage) ?? STAGES[0];

    const mapUnits = (units: typeof battleState.heroes): BattleHeroState[] =>
      units.map((u) => {
        const instance = this.gameState.heroes.find((h) => h.instanceId === `starter-${u.template.id}`)
          ?? { instanceId: u.id, templateId: u.template.id, level: u.level, exp: 0, stars: 1, equipment: [] };
        return { instance, currentHp: u.currentHp, maxHp: u.maxHp };
      });

    return {
      chapter: stageConfig.chapter,
      stage: stageConfig.stage,
      wave: battleState.wave,
      maxWave: battleState.totalWaves,
      heroes: mapUnits(battleState.heroes),
      enemies: mapUnits(battleState.enemies),
      autoSpeed: this.autoSpeed,
      paused: this.paused,
      gold: this.gameState.gold,
      crystals: this.gameState.crystals,
    };
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.currentScreen === "battle") {
      this.battleScene.update(dt);

      this.hudUpdateTimer += dt;
      if (this.hudUpdateTimer >= 0.1) {
        this.hudUpdateTimer = 0;
        updateHud(this.buildHudState());
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.battleScene.destroy();
    destroyHud();
    destroyTeamSelect();
  }
}
