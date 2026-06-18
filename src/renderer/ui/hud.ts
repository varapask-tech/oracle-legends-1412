import type { HeroTemplate, HeroInstance } from "../../shared/types";
import { HERO_TEMPLATES } from "../../shared/heroes";
import { computeStats } from "./hero-card";

const RARITY_COLORS: Record<string, string> = {
  common: "#8a8a8a",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffd700",
};

export interface BattleHeroState {
  instance: HeroInstance;
  currentHp: number;
  maxHp: number;
}

export interface HudState {
  chapter: number;
  stage: number;
  wave: number;
  maxWave: number;
  heroes: BattleHeroState[];
  enemies: BattleHeroState[];
  autoSpeed: number;
  paused: boolean;
  gold: number;
  crystals: number;
}

let hudRoot: HTMLElement | null = null;
let onSpeedChange: ((speed: number) => void) | null = null;
let onPauseToggle: (() => void) | null = null;

export function initHud(callbacks?: {
  onSpeedChange?: (speed: number) => void;
  onPauseToggle?: () => void;
}): void {
  if (hudRoot) return;
  onSpeedChange = callbacks?.onSpeedChange ?? null;
  onPauseToggle = callbacks?.onPauseToggle ?? null;

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  hudRoot = document.createElement("div");
  hudRoot.id = "battle-hud";
  hudRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; font-family: 'Segoe UI', sans-serif;
  `;
  overlay.appendChild(hudRoot);
}

export function updateHud(state: HudState): void {
  if (!hudRoot) return;
  hudRoot.innerHTML = "";

  hudRoot.appendChild(buildTopBar(state));
  hudRoot.appendChild(buildHeroHpPanel(state.heroes, "left"));
  hudRoot.appendChild(buildHeroHpPanel(state.enemies, "right"));
  hudRoot.appendChild(buildBottomBar(state));
}

export function destroyHud(): void {
  hudRoot?.remove();
  hudRoot = null;
  onSpeedChange = null;
  onPauseToggle = null;
}

function buildTopBar(state: HudState): HTMLElement {
  const bar = document.createElement("div");
  bar.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 16px; pointer-events: auto;
    background: linear-gradient(180deg, rgba(10,5,30,0.85) 0%, transparent 100%);
  `;

  const stageInfo = document.createElement("div");
  stageInfo.style.cssText = "font-size: 14px; color: #ffd700; font-weight: bold;";
  stageInfo.textContent = `Chapter ${state.chapter} — Stage ${state.stage}`;
  bar.appendChild(stageInfo);

  const waveInfo = document.createElement("div");
  waveInfo.style.cssText = "font-size: 12px; color: #aaa;";
  waveInfo.textContent = `Wave ${state.wave}/${state.maxWave}`;
  bar.appendChild(waveInfo);

  const resources = document.createElement("div");
  resources.style.cssText = "display: flex; gap: 16px; font-size: 13px;";
  resources.innerHTML = `
    <span style="color:#ffd700">💰 ${formatNum(state.gold)}</span>
    <span style="color:#aa88ff">💎 ${formatNum(state.crystals)}</span>
  `;
  bar.appendChild(resources);

  return bar;
}

function buildHeroHpPanel(heroes: BattleHeroState[], side: "left" | "right"): HTMLElement {
  const panel = document.createElement("div");
  panel.style.cssText = `
    position: absolute;
    ${side}: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
  `;

  for (const h of heroes) {
    const template = HERO_TEMPLATES.find((t) => t.id === h.instance.templateId);
    if (!template) continue;

    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      ${side === "right" ? "flex-direction: row-reverse;" : ""}
    `;

    const nameTag = document.createElement("div");
    const color = RARITY_COLORS[template.rarity] ?? "#fff";
    nameTag.style.cssText = `
      font-size: 10px;
      color: ${color};
      width: 48px;
      text-align: ${side === "right" ? "right" : "left"};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    nameTag.textContent = template.name;
    row.appendChild(nameTag);

    const barContainer = document.createElement("div");
    barContainer.style.cssText = `
      width: 80px; height: 8px;
      background: #1a1a2e;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #333;
    `;

    const hpRatio = Math.max(0, Math.min(1, h.currentHp / h.maxHp));
    const barColor = hpRatio > 0.5 ? "#44cc44" : hpRatio > 0.2 ? "#ccaa00" : "#cc3333";

    const fill = document.createElement("div");
    fill.style.cssText = `
      width: ${hpRatio * 100}%;
      height: 100%;
      background: ${barColor};
      border-radius: 4px;
      transition: width 0.3s ease;
    `;
    barContainer.appendChild(fill);
    row.appendChild(barContainer);

    const hpText = document.createElement("div");
    hpText.style.cssText = "font-size: 9px; color: #888; width: 32px; text-align: center;";
    hpText.textContent = `${Math.ceil(h.currentHp)}`;
    row.appendChild(hpText);

    panel.appendChild(row);
  }

  return panel;
}

function buildBottomBar(state: HudState): HTMLElement {
  const bar = document.createElement("div");
  bar.style.cssText = `
    position: absolute; bottom: 0; left: 0; width: 100%;
    display: flex; justify-content: center; align-items: center;
    gap: 12px; padding: 12px;
    background: linear-gradient(0deg, rgba(10,5,30,0.85) 0%, transparent 100%);
    pointer-events: auto;
  `;

  const speeds = [1, 2, 4];
  for (const spd of speeds) {
    const btn = document.createElement("button");
    const active = state.autoSpeed === spd;
    btn.style.cssText = `
      padding: 6px 16px; font-size: 12px; font-weight: bold;
      border: 1px solid ${active ? "#ffd700" : "#444"};
      border-radius: 6px; cursor: pointer;
      background: ${active ? "rgba(255,215,0,0.15)" : "rgba(20,10,40,0.8)"};
      color: ${active ? "#ffd700" : "#888"};
      transition: all 0.15s;
    `;
    btn.textContent = `${spd}×`;
    btn.addEventListener("click", () => onSpeedChange?.(spd));
    bar.appendChild(btn);
  }

  const pauseBtn = document.createElement("button");
  pauseBtn.style.cssText = `
    padding: 6px 16px; font-size: 12px; font-weight: bold;
    border: 1px solid ${state.paused ? "#ff4444" : "#444"};
    border-radius: 6px; cursor: pointer;
    background: ${state.paused ? "rgba(255,68,68,0.15)" : "rgba(20,10,40,0.8)"};
    color: ${state.paused ? "#ff4444" : "#888"};
    margin-left: 8px;
    transition: all 0.15s;
  `;
  pauseBtn.textContent = state.paused ? "▶ Resume" : "⏸ Pause";
  pauseBtn.addEventListener("click", () => onPauseToggle?.());
  bar.appendChild(pauseBtn);

  return bar;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function showDamageNumber(
  container: HTMLElement,
  x: number,
  y: number,
  damage: number,
  isCrit: boolean
): void {
  const el = document.createElement("div");
  el.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    font-size: ${isCrit ? "22px" : "16px"};
    font-weight: bold;
    color: ${isCrit ? "#ffd700" : "#ff4444"};
    text-shadow: 0 0 4px rgba(0,0,0,0.8);
    pointer-events: none;
    z-index: 100;
    animation: dmg-float 0.8s ease-out forwards;
  `;
  el.textContent = isCrit ? `💥${damage}` : `-${damage}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 850);
}

const dmgStyle = document.createElement("style");
dmgStyle.textContent = `
  @keyframes dmg-float {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-40px) scale(0.7); }
  }
`;
document.head.appendChild(dmgStyle);
