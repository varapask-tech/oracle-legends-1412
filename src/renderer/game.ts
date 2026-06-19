import type { HeroTemplate } from "../shared/types";
import { HERO_TEMPLATES } from "../shared/heroes";
import { STAGES } from "../shared/stages";
import { GameStateManager, createInitialState } from "../systems/game-state";
import { Battle2D } from "./battle";
import { GridMap } from "./grid-map";
import { BombManager } from "./bomb";
import { HeroAgent } from "./hero-agent";
import { DailyMissionManager } from "../systems/daily-missions";
import { DailyScreen } from "./ui/daily-screen";
import { BattleVFX } from "./battle-vfx";
import { SaveManager, initGame, type OfflineRewards } from "../systems/save-manager";

type Screen = "menu" | "battle" | "heroes" | "summon" | "shop" | "rewards" | "daily";

const PORTRAITS: Record<string, string> = {
  "zero-void": "/assets/characters/mr0-zero.png",
  "one-thunder": "/assets/characters/mr1-thunder.png",
  "two-crystal": "/assets/characters/ms2-crystal.png",
  "three-star": "/assets/characters/ms3-creative.png",
  "four-earth": "/assets/characters/mr4-wellness.png",
  "aria-flame": "/assets/characters/aria-flame.png",
  "luna-tide": "/assets/characters/luna-tide.png",
  "kael-stone": "/assets/characters/kael-stone.png",
  "nyx-shadow": "/assets/characters/nyx-shadow.png",
  "sol-dawn": "/assets/characters/sol-dawn.png",
  "frost-whisper": "/assets/characters/frost-whisper.png",
  "ember-phoenix": "/assets/characters/ember-phoenix.png",
};

const ELEMENT_EMOJI: Record<string, string> = { fire: "🔥", water: "💧", earth: "🌿", light: "⚡", dark: "🌑" };

function heroPortrait(id: string, size: number, borderColor: string): string {
  const url = PORTRAITS[id];
  if (url) {
    return `<img src="${url}" style="width:${size}px; height:${size}px; object-fit:contain; border-radius:8px; border:2px solid ${borderColor}; background:rgba(10,5,20,0.6);" onerror="this.style.display='none'">`;
  }
  const tmpl = HERO_TEMPLATES.find((t) => t.id === id);
  return `<div style="width:${size}px; height:${size}px; border-radius:8px; border:2px solid ${borderColor}; background:#${(tmpl?.modelColor ?? 0x333333).toString(16).padStart(6, "0")}; display:flex; align-items:center; justify-content:center; font-size:${size/2}px;">${ELEMENT_EMOJI[tmpl?.element ?? "dark"] ?? "✨"}</div>`;
}

export class Game {
  private gsm: GameStateManager;
  private battle: Battle2D | null = null;
  private currentScreen: Screen = "menu";
  private container: HTMLElement;
  private animFrameId = 0;
  private lastTime = 0;

  private dailyMgr: DailyMissionManager;
  private saveMgr: SaveManager | null = null;
  private offlineRewards: OfflineRewards | null = null;
  private gridMap: GridMap | null = null;
  private bombMgr: BombManager | null = null;
  private heroAgents: HeroAgent[] = [];

  constructor(container: HTMLElement) {
    this.container = container;

    const { gsm, isNewGame, offlineRewards } = initGame();
    this.gsm = gsm;
    this.offlineRewards = offlineRewards;

    this.dailyMgr = new DailyMissionManager();
    BattleVFX.injectStyles();

    this.saveMgr = new SaveManager(this.gsm);
    this.saveMgr.start();
  }

  start(): void {
    if (this.offlineRewards && this.offlineRewards.elapsedSeconds >= 60) {
      this.showOfflineRewards(this.offlineRewards);
      this.offlineRewards = null;
    } else {
      this.showMenu();
    }
  }

  private showOfflineRewards(rewards: OfflineRewards): void {
    this.clear();
    const hours = Math.floor(rewards.elapsedSeconds / 3600);
    const mins = Math.floor((rewards.elapsedSeconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    this.gsm.addGold(rewards.gold);
    this.gsm.addExpToTeam(rewards.exp);

    const screen = document.createElement("div");
    screen.style.cssText = `
      width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:radial-gradient(ellipse at center, #1a0a3a 0%, #0a0a1a 100%);
      font-family:'Segoe UI',sans-serif; color:#fff;
    `;
    screen.innerHTML = `
      <h1 style="color:#ffd700; font-size:28px; margin-bottom:8px;">🌙 Welcome Back!</h1>
      <p style="color:#aaa; font-size:14px; margin-bottom:24px;">You were away for ${timeStr}</p>
      <div style="display:flex; gap:24px; margin-bottom:32px;">
        <div style="text-align:center"><div style="font-size:28px">💰</div><div style="color:#ffd700; font-size:22px; font-weight:bold">+${rewards.gold}</div><div style="color:#888; font-size:12px">Gold</div></div>
        <div style="text-align:center"><div style="font-size:28px">✨</div><div style="color:#88ccff; font-size:22px; font-weight:bold">+${rewards.exp}</div><div style="color:#888; font-size:12px">EXP</div></div>
      </div>
    `;
    const btn = this.makeBtn("Collect! →", "#ffd700", () => this.showMenu());
    screen.appendChild(btn);
    this.container.appendChild(screen);
  }

  private clear(): void {
    this.container.innerHTML = "";
    if (this.battle) { this.battle.destroy(); this.battle = null; }
    for (const agent of this.heroAgents) agent.destroy();
    this.heroAgents = [];
    this.gridMap = null;
    this.bombMgr = null;
    cancelAnimationFrame(this.animFrameId);
  }

  private startTreasureHunt(): void {
    this.clear();
    this.currentScreen = "battle";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:100%; height:100%; position:relative; background:#1a2a1a; display:flex; flex-direction:column; align-items:center; justify-content:center;";
    this.container.appendChild(wrapper);

    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute; top:0; left:0; width:100%; padding:10px 20px; z-index:20; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(10,5,30,0.9), transparent);";
    hud.innerHTML = `
      <div style="color:#ffd700; font-size:15px; font-weight:bold;">💣 Treasure Hunt</div>
      <div style="display:flex; gap:16px; font-size:13px;">
        <span style="color:#ffd700">💰 ${this.gsm.current.gold}</span>
        <span style="color:#aa88ff">💎 ${this.gsm.current.crystals}</span>
      </div>
    `;
    wrapper.appendChild(hud);

    this.gridMap = new GridMap();
    this.gridMap.generate(1);
    this.gridMap.render();

    const mapContainer = document.createElement("div");
    mapContainer.style.cssText = "position:relative; display:inline-block;";
    mapContainer.appendChild(this.gridMap.element);
    wrapper.appendChild(mapContainer);

    this.bombMgr = new BombManager(this.gridMap);

    const bombCanvas = document.createElement("canvas");
    bombCanvas.width = this.gridMap.width;
    bombCanvas.height = this.gridMap.height;
    bombCanvas.style.cssText = "position:absolute; top:0; left:0; pointer-events:none; z-index:8;";
    mapContainer.appendChild(bombCanvas);
    const bombCtx = bombCanvas.getContext("2d")!;

    this.bombMgr.onExplosion = (result) => {
      let goldGained = 0;
      for (const t of result.tiles) {
        if (t.was === "chest") {
          goldGained += 20 + Math.floor(Math.random() * 30);
          this.gsm.addCrystals(Math.random() < 0.3 ? 1 : 0);
        } else if (t.was === "block") {
          goldGained += 2 + Math.floor(Math.random() * 5);
        }
      }
      if (goldGained > 0) {
        this.gsm.addGold(goldGained);
        const goldLabel = document.createElement("div");
        goldLabel.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:20px; font-weight:bold; color:#ffd700; text-shadow:0 0 8px rgba(255,215,0,0.8); pointer-events:none; z-index:30; animation:dmg-fly 1s ease-out forwards;";
        goldLabel.textContent = `+${goldGained} 💰`;
        mapContainer.appendChild(goldLabel);
        setTimeout(() => goldLabel.remove(), 1100);
      }
      this.gridMap?.render();
      hud.querySelector("span")!.textContent = `💰 ${this.gsm.current.gold}`;
    };

    const spawnPositions: [number, number][] = [];
    for (let sy = 1; sy <= 9; sy++) for (let sx = 1; sx <= 3; sx++) {
      if (this.gridMap.isWalkable(sx, sy)) spawnPositions.push([sx, sy]);
    }
    const allHeroes = this.gsm.current.heroes;
    for (let i = 0; i < Math.min(allHeroes.length, 15, spawnPositions.length); i++) {
      const inst = allHeroes[i];
      if (!inst) continue;
      const tmpl = HERO_TEMPLATES.find((t) => t.id === inst.templateId);
      if (!tmpl) continue;
      const [sx, sy] = spawnPositions[i];
      const agent = new HeroAgent({
        id: inst.instanceId,
        template: tmpl,
        startX: sx,
        startY: sy,
        container: mapContainer,
        map: this.gridMap,
        bombs: this.bombMgr,
      });
      this.heroAgents.push(agent);
    }

    const bottomBar = document.createElement("div");
    bottomBar.style.cssText = "position:absolute; bottom:0; left:0; width:100%; padding:12px; z-index:20; display:flex; justify-content:center; gap:12px; background:linear-gradient(0deg, rgba(10,5,30,0.9), transparent);";
    const menuBtn = this.makeBtn("← Menu", "#666", () => this.showMenu());
    menuBtn.style.cssText += "padding:6px 20px; font-size:13px;";
    bottomBar.appendChild(menuBtn);

    const newMapBtn = this.makeBtn("🗺️ New Map", "#ffd700", () => {
      for (const a of this.heroAgents) a.destroy();
      this.heroAgents = [];
      this.gridMap!.generate(1 + Math.floor(Math.random() * 3));
      this.gridMap!.render();
      this.bombMgr = new BombManager(this.gridMap!);
      this.bombMgr.onExplosion = (result) => {
        let g = 0;
        for (const t of result.tiles) g += t.was === "chest" ? 25 : 3;
        if (g > 0) this.gsm.addGold(g);
        this.gridMap?.render();
      };
      const newSpawns: [number, number][] = [];
      for (let sy = 1; sy <= 9; sy++) for (let sx = 1; sx <= 3; sx++) {
        if (this.gridMap!.isWalkable(sx, sy)) newSpawns.push([sx, sy]);
      }
      const heroes = this.gsm.current.heroes;
      for (let i = 0; i < Math.min(heroes.length, 15, newSpawns.length); i++) {
        const inst = heroes[i];
        if (!inst) continue;
        const tmpl = HERO_TEMPLATES.find((t) => t.id === inst.templateId);
        if (!tmpl) continue;
        const [sx, sy] = newSpawns[i];
        this.heroAgents.push(new HeroAgent({ id: inst.instanceId, template: tmpl, startX: sx, startY: sy, container: mapContainer, map: this.gridMap!, bombs: this.bombMgr! }));
      }
    });
    newMapBtn.style.cssText += "padding:6px 20px; font-size:13px;";
    bottomBar.appendChild(newMapBtn);
    wrapper.appendChild(bottomBar);

    this.lastTime = performance.now();
    const huntLoop = () => {
      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      for (const agent of this.heroAgents) agent.update(dt);
      this.bombMgr!.update(dt);

      bombCtx.clearRect(0, 0, bombCanvas.width, bombCanvas.height);
      this.bombMgr!.render(bombCtx);

      if (this.currentScreen === "battle") {
        this.animFrameId = requestAnimationFrame(huntLoop);
      }
    };
    this.animFrameId = requestAnimationFrame(huntLoop);
  }

  showMenu(): void {
    this.clear();
    this.currentScreen = "menu";
    const state = this.gsm.current;

    const menu = document.createElement("div");
    menu.style.cssText = `
      width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at center, #1a0a3a 0%, #0a0a1a 100%);
      font-family: 'Segoe UI', sans-serif; color: #fff;
    `;

    menu.innerHTML = `
      <h1 style="color:#ffd700; font-size:32px; text-shadow:0 0 20px rgba(255,215,0,0.5); margin-bottom:4px;">⚔️ Oracle Legends</h1>
      <p style="color:#888; font-size:13px; margin-bottom:8px;">Universe 1412</p>
      <div style="display:flex; gap:16px; margin-bottom:24px; font-size:14px;">
        <span style="color:#ffd700">💰 ${state.gold}</span>
        <span style="color:#aa88ff">💎 ${state.crystals}</span>
        <span style="color:#aaa">🦸 ${state.heroes.length} heroes</span>
        <span style="color:#aaa">📍 Stage ${state.currentStage}</span>
      </div>
    `;

    const unclaimedDaily = this.dailyMgr.missions.filter((m) => m.completed && !m.claimed).length;
    const dailyBadge = unclaimedDaily > 0 ? ` (${unclaimedDaily}!)` : "";

    const buttons = [
      { label: "💣 Treasure Hunt", desc: "Deploy heroes, collect loot!", action: () => this.startTreasureHunt() },
      { label: "🎰 Summon", desc: `💎${10} per pull`, action: () => this.showSummon() },
      { label: "🦸 Heroes", desc: `${state.heroes.length} heroes`, action: () => this.showHeroes() },
      { label: "🏪 Shop", desc: "Buy equipment", action: () => this.showShop() },
      { label: `📋 Quests${dailyBadge}`, desc: `${this.dailyMgr.completedCount}/9 done`, action: () => this.showDaily() },
      { label: "⚔️ Battle", desc: "Classic auto-battle", action: () => this.startBattle() },
    ];

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:12px; width:320px;";
    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        padding:16px; border-radius:10px; cursor:pointer; border:1px solid #3a2a5a;
        background:rgba(20,10,40,0.8); color:#fff; font-size:16px; font-weight:bold;
        transition:transform 0.15s, border-color 0.15s;
      `;
      btn.innerHTML = `${b.label}<br><span style="font-size:11px; color:#888; font-weight:normal">${b.desc}</span>`;
      btn.addEventListener("click", b.action);
      btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; btn.style.borderColor = "#ffd700"; });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; btn.style.borderColor = "#3a2a5a"; });
      grid.appendChild(btn);
    }
    menu.appendChild(grid);
    this.container.appendChild(menu);
  }

  private startBattle(): void {
    this.clear();
    this.currentScreen = "battle";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:100%; height:100%; position:relative; background:#0a0a1a;";
    this.container.appendChild(wrapper);

    this.battle = new Battle2D(wrapper, {
      onEnd: (result, gold, exp, crystals) => {
        if (result === "won") {
          this.gsm.addGold(gold);
          this.gsm.addCrystals(crystals);
          this.gsm.addExpToTeam(exp);
          this.trackBattleWin();
          this.trackGoldEarned(gold);
          this.trackExpEarned(exp);
          const idx = STAGES.findIndex((s) => s.id === this.gsm.current.currentStage);
          if (idx < STAGES.length - 1) this.gsm.advanceStage(STAGES[idx + 1].id);
        }
        this.showRewards(result, gold, exp, crystals);
      },
    });

    const heroTemplates: HeroTemplate[] = [];
    const heroLevels: number[] = [];
    for (const id of this.gsm.current.team) {
      const inst = this.gsm.findHero(id);
      if (!inst) continue;
      const tmpl = HERO_TEMPLATES.find((t) => t.id === inst.templateId);
      if (!tmpl) continue;
      heroTemplates.push(tmpl);
      heroLevels.push(inst.level);
    }

    this.battle.startBattle(this.gsm.current.currentStage, heroTemplates, heroLevels);
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (this.battle?.isActive()) {
      this.battle.update(dt);
    }
    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  private showRewards(result: "won" | "lost", gold: number, exp: number, crystals: number): void {
    this.currentScreen = "rewards";
    cancelAnimationFrame(this.animFrameId);

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:rgba(5,2,15,0.92); font-family:'Segoe UI',sans-serif;
    `;

    if (result === "won") {
      overlay.innerHTML = `
        <h1 style="color:#ffd700; font-size:36px; margin-bottom:8px;">⚔️ Victory!</h1>
        <div style="display:flex; gap:24px; margin:24px 0;">
          <div style="text-align:center"><div style="font-size:24px">💰</div><div style="color:#ffd700; font-size:20px; font-weight:bold">+${gold}</div><div style="color:#888; font-size:11px">Gold</div></div>
          <div style="text-align:center"><div style="font-size:24px">✨</div><div style="color:#88ccff; font-size:20px; font-weight:bold">+${exp}</div><div style="color:#888; font-size:11px">EXP</div></div>
          ${crystals > 0 ? `<div style="text-align:center"><div style="font-size:24px">💎</div><div style="color:#aa88ff; font-size:20px; font-weight:bold">+${crystals}</div><div style="color:#888; font-size:11px">Crystals</div></div>` : ""}
        </div>
      `;
    } else {
      overlay.innerHTML = `
        <h1 style="color:#ff4444; font-size:36px; margin-bottom:8px;">💀 Defeated</h1>
        <p style="color:#888; margin-bottom:24px;">Level up your heroes and try again!</p>
      `;
    }

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex; gap:12px;";

    const nextBtn = this.makeBtn(result === "won" ? "Next Stage →" : "Retry", "#ffd700", () => this.startBattle());
    btns.appendChild(nextBtn);

    const menuBtn = this.makeBtn("Menu", "#666", () => this.showMenu());
    btns.appendChild(menuBtn);

    overlay.appendChild(btns);
    this.container.querySelector("div")?.appendChild(overlay);
  }

  private showSummon(): void {
    this.clear();
    this.currentScreen = "summon";
    const state = this.gsm.current;

    const screen = this.makeScreen("🎰 Summon");

    const info = document.createElement("div");
    info.style.cssText = "text-align:center; margin-bottom:24px;";
    info.innerHTML = `<span style="color:#aa88ff; font-size:18px">💎 ${state.crystals} Crystals</span>`;
    screen.appendChild(info);

    const results = document.createElement("div");
    results.id = "summon-results";
    results.style.cssText = "display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:24px; min-height:100px;";
    screen.appendChild(results);

    const pullOne = this.makeBtn("Pull ×1 (💎10)", "#aa88ff", () => {
      if (!this.gsm.spendCrystals(10)) return;
      this.trackSummon();
      this.doSummon(1, results, info);
    });
    const pullTen = this.makeBtn("Pull ×10 (💎90)", "#ffd700", () => {
      if (!this.gsm.spendCrystals(90)) return;
      this.trackSummon();
      this.doSummon(10, results, info);
    });

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex; gap:12px; justify-content:center;";
    btnRow.appendChild(pullOne);
    btnRow.appendChild(pullTen);
    screen.appendChild(btnRow);
    this.container.appendChild(screen);
  }

  private doSummon(count: number, results: HTMLElement, info: HTMLElement): void {
    results.innerHTML = "";
    const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
    const rarityColors: Record<string, string> = { common: "#888", uncommon: "#4b4", rare: "#48f", epic: "#a4f", legendary: "#ffd700" };

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let rarity = "common";
      if (roll < 0.01) rarity = "legendary";
      else if (roll < 0.05) rarity = "epic";
      else if (roll < 0.15) rarity = "rare";
      else if (roll < 0.40) rarity = "uncommon";

      const pool = HERO_TEMPLATES.filter((h) => h.rarity === rarity);
      const tmpl = pool.length ? pool[Math.floor(Math.random() * pool.length)] : HERO_TEMPLATES[0];

      this.gsm.addHero({
        instanceId: `summon_${Date.now()}_${i}`,
        templateId: tmpl.id,
        level: 1, exp: 0, stars: 1, equipment: [],
      });

      const card = document.createElement("div");
      card.style.cssText = `
        width:90px; padding:8px; border-radius:8px; text-align:center;
        background:rgba(20,10,40,0.8); border:2px solid ${rarityColors[rarity]};
        animation: summon-pop 0.3s ease ${i * 0.1}s both;
      `;
      card.innerHTML = `
        <div style="display:flex; justify-content:center; margin-bottom:4px;">${heroPortrait(tmpl.id, 56, rarityColors[rarity])}</div>
        <div style="font-size:11px; color:${rarityColors[rarity]}; font-weight:bold;">${tmpl.name}</div>
        <div style="font-size:9px; color:#888;">${rarity}</div>
      `;
      results.appendChild(card);
    }

    info.innerHTML = `<span style="color:#aa88ff; font-size:18px">💎 ${this.gsm.current.crystals} Crystals</span>`;
  }

  private showHeroes(): void {
    this.clear();
    this.currentScreen = "heroes";
    const state = this.gsm.current;

    const screen = this.makeScreen("🦸 Heroes");

    const grid = document.createElement("div");
    grid.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; justify-content:center; overflow-y:auto; max-height:400px;";

    const rarityColors: Record<string, string> = { common: "#888", uncommon: "#4b4", rare: "#48f", epic: "#a4f", legendary: "#ffd700" };

    for (const hero of state.heroes) {
      const tmpl = HERO_TEMPLATES.find((t) => t.id === hero.templateId);
      if (!tmpl) continue;

      const card = document.createElement("div");
      const color = rarityColors[tmpl.rarity] ?? "#888";
      card.style.cssText = `
        width:120px; padding:10px; border-radius:8px; cursor:pointer;
        background:rgba(20,10,40,0.8); border:2px solid ${color};
        text-align:center; transition:transform 0.15s;
      `;
      card.innerHTML = `
        <div style="display:flex; justify-content:center; margin-bottom:6px;">${heroPortrait(tmpl.id, 64, color)}</div>
        <div style="font-size:13px; color:${color}; font-weight:bold;">${tmpl.name}</div>
        <div style="font-size:11px; color:#aaa;">Lv.${hero.level} ${tmpl.heroClass}</div>
        <div style="font-size:10px; color:#888; margin-top:4px;">HP ${tmpl.baseStats.hp + tmpl.growthPerLevel.hp * (hero.level - 1)} ATK ${tmpl.baseStats.atk + tmpl.growthPerLevel.atk * (hero.level - 1)}</div>
      `;

      const lvlBtn = document.createElement("button");
      const cost = Math.round(50 * 1.12 ** (hero.level - 1));
      lvlBtn.style.cssText = `
        margin-top:6px; padding:4px 12px; font-size:10px; border-radius:4px; cursor:pointer;
        background:rgba(255,215,0,0.15); border:1px solid #ffd700; color:#ffd700;
      `;
      lvlBtn.textContent = `Level Up (💰${cost})`;
      lvlBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gsm.spendGold(cost)) {
          this.gsm.addExpToHero(hero.instanceId, 9999);
          this.trackLevelUp();
          this.showHeroes();
        }
      });
      card.appendChild(lvlBtn);

      card.addEventListener("mouseenter", () => { card.style.transform = "scale(1.05)"; });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
      grid.appendChild(card);
    }

    screen.appendChild(grid);
    this.container.appendChild(screen);
  }

  private showShop(): void {
    this.clear();
    this.currentScreen = "shop";

    const screen = this.makeScreen("🏪 Shop");

    const goldDisplay = document.createElement("div");
    goldDisplay.style.cssText = "text-align:center; margin-bottom:16px;";
    goldDisplay.innerHTML = `<span style="color:#ffd700; font-size:18px">💰 ${this.gsm.current.gold} Gold</span>`;
    screen.appendChild(goldDisplay);

    const items = [
      { name: "ดาบไม้", slot: "weapon", stats: "ATK +5", cost: 100, rarity: "common" },
      { name: "ดาบเหล็ก", slot: "weapon", stats: "ATK +15", cost: 500, rarity: "uncommon" },
      { name: "ดาบเงิน", slot: "weapon", stats: "ATK +30", cost: 1500, rarity: "rare" },
      { name: "เสื้อหนัง", slot: "armor", stats: "HP +50, DEF +5", cost: 120, rarity: "common" },
      { name: "เกราะเหล็ก", slot: "armor", stats: "HP +120, DEF +15", cost: 600, rarity: "uncommon" },
      { name: "เกราะเงิน", slot: "armor", stats: "HP +250, DEF +30", cost: 1800, rarity: "rare" },
      { name: "แหวนธรรมดา", slot: "accessory", stats: "SPD +5", cost: 80, rarity: "common" },
      { name: "แหวนเงิน", slot: "accessory", stats: "SPD +12, CRIT +3%", cost: 400, rarity: "uncommon" },
    ];

    const rarityColors: Record<string, string> = { common: "#888", uncommon: "#4b4", rare: "#48f", epic: "#a4f", legendary: "#ffd700" };

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:10px; max-width:500px; margin:0 auto;";

    for (const item of items) {
      const card = document.createElement("div");
      const color = rarityColors[item.rarity];
      const canBuy = this.gsm.current.gold >= item.cost;
      card.style.cssText = `
        padding:12px; border-radius:8px;
        background:rgba(20,10,40,0.8); border:1px solid ${color};
      `;
      card.innerHTML = `
        <div style="font-size:13px; color:${color}; font-weight:bold;">${item.name}</div>
        <div style="font-size:10px; color:#aaa;">${item.slot} — ${item.stats}</div>
      `;

      const buyBtn = document.createElement("button");
      buyBtn.style.cssText = `
        margin-top:6px; padding:4px 16px; font-size:11px; border-radius:4px; cursor:pointer; width:100%;
        background:${canBuy ? "rgba(255,215,0,0.15)" : "rgba(100,0,0,0.2)"};
        border:1px solid ${canBuy ? "#ffd700" : "#600"};
        color:${canBuy ? "#ffd700" : "#666"};
      `;
      buyBtn.textContent = `Buy 💰${item.cost}`;
      buyBtn.disabled = !canBuy;
      buyBtn.addEventListener("click", () => {
        if (this.gsm.spendGold(item.cost)) {
          this.trackShopBuy();
          buyBtn.textContent = "✅ Purchased!";
          buyBtn.disabled = true;
          goldDisplay.innerHTML = `<span style="color:#ffd700; font-size:18px">💰 ${this.gsm.current.gold} Gold</span>`;
        }
      });
      card.appendChild(buyBtn);
      grid.appendChild(card);
    }

    screen.appendChild(grid);
    this.container.appendChild(screen);
  }

  private makeScreen(title: string): HTMLElement {
    const screen = document.createElement("div");
    screen.style.cssText = `
      width:100%; height:100%; display:flex; flex-direction:column; align-items:center;
      padding:24px; background:radial-gradient(ellipse at center, #1a0a3a 0%, #0a0a1a 100%);
      font-family:'Segoe UI',sans-serif; color:#fff; overflow-y:auto;
    `;

    const header = document.createElement("div");
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center; width:100%; max-width:500px; margin-bottom:20px;";

    const h = document.createElement("h2");
    h.style.cssText = "color:#ffd700; margin:0; font-size:22px;";
    h.textContent = title;
    header.appendChild(h);

    const backBtn = this.makeBtn("← Menu", "#666", () => this.showMenu());
    backBtn.style.cssText += "padding:6px 16px; font-size:12px;";
    header.appendChild(backBtn);

    screen.appendChild(header);
    this.container.appendChild(screen);
    return screen;
  }

  private makeBtn(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    const isGold = color === "#ffd700";
    btn.style.cssText = `
      padding:10px 28px; font-size:14px; font-weight:bold; cursor:pointer; border-radius:8px;
      background:${isGold ? "linear-gradient(135deg,#ffd700,#ff8c00)" : "rgba(40,30,60,0.8)"};
      border:1px solid ${color}; color:${isGold ? "#1a0a00" : color};
      transition:transform 0.15s;
    `;
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    return btn;
  }

  private showDaily(): void {
    this.clear();
    this.currentScreen = "daily";
    new DailyScreen(
      this.container,
      (reward) => {
        if (reward.gold) this.gsm.addGold(reward.gold);
        if (reward.crystals) this.gsm.addCrystals(reward.crystals);
      },
      () => this.showMenu(),
    );
  }

  private trackBattleWin() { this.dailyMgr.trackProgress("battle-3"); this.dailyMgr.trackProgress("battle-10"); }
  private trackSummon() { this.dailyMgr.trackProgress("summon-1"); }
  private trackLevelUp() { this.dailyMgr.trackProgress("levelup-1"); }
  private trackShopBuy() { this.dailyMgr.trackProgress("shop-1"); }
  private trackGoldEarned(amount: number) { this.dailyMgr.trackProgress("gold-1000", amount); }
  private trackExpEarned(amount: number) { this.dailyMgr.trackProgress("exp-500", amount); }

  destroy(): void {
    this.clear();
  }
}
