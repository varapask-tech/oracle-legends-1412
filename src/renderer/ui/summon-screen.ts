import type { HeroInstance, Rarity } from "../../shared/types";
import type { SummonResult, GachaState } from "../systems/gacha";
import { SUMMON_COST, pullsUntilPity } from "../systems/gacha";
import { createHeroCard } from "./hero-card";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#8a8a8a",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffd700",
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: "none",
  uncommon: "0 0 20px #44bb4444",
  rare: "0 0 30px #4488ff66",
  epic: "0 0 40px #aa44ff88",
  legendary: "0 0 60px #ffd700aa, 0 0 100px #ffd70044",
};

export interface SummonScreenCallbacks {
  onSummonOne: () => SummonResult | null;
  onSummonTen: () => SummonResult[] | null;
  onBack: () => void;
  getCrystals: () => number;
  getGachaState: () => GachaState;
}

let screenRoot: HTMLElement | null = null;

export function showSummonScreen(callbacks: SummonScreenCallbacks): void {
  destroySummonScreen();

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  screenRoot = document.createElement("div");
  screenRoot.id = "summon-screen";
  screenRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(ellipse at center, rgba(30,10,60,0.95) 0%, rgba(5,2,15,0.98) 100%);
    display: flex; flex-direction: column;
    font-family: 'Segoe UI', sans-serif; pointer-events: auto;
  `;
  overlay.appendChild(screenRoot);

  render(callbacks);
}

export function destroySummonScreen(): void {
  screenRoot?.remove();
  screenRoot = null;
}

function render(callbacks: SummonScreenCallbacks) {
  if (!screenRoot) return;
  screenRoot.innerHTML = "";

  const crystals = callbacks.getCrystals();
  const gachaState = callbacks.getGachaState();
  const pityLeft = pullsUntilPity(gachaState);

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px; border-bottom: 1px solid #2a1a4a;
  `;
  header.innerHTML = `
    <h2 style="margin:0; color:#aa44ff; font-size:20px;">✨ Summon</h2>
    <div style="display:flex; gap:16px; align-items:center; font-size:13px;">
      <span style="color:#aa88ff">💎 ${crystals}</span>
      <span style="color:#666">Pity in ${pityLeft} pulls</span>
    </div>
  `;
  screenRoot.appendChild(header);

  const resultArea = document.createElement("div");
  resultArea.id = "summon-results";
  resultArea.style.cssText = `
    flex: 1; display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 12px; padding: 24px;
    overflow-y: auto;
  `;

  const placeholder = document.createElement("div");
  placeholder.style.cssText = "color: #333; font-size: 16px; text-align: center;";
  placeholder.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 16px;">🔮</div>
    <div>Summon heroes to join your team</div>
  `;
  resultArea.appendChild(placeholder);
  screenRoot.appendChild(resultArea);

  const rateInfo = document.createElement("div");
  rateInfo.style.cssText = `
    display: flex; justify-content: center; gap: 16px; padding: 8px;
    font-size: 10px; color: #555;
  `;
  rateInfo.innerHTML = `
    <span>★ Common 60%</span>
    <span style="color:#44bb44">★★ Uncommon 25%</span>
    <span style="color:#4488ff">★★★ Rare 10%</span>
    <span style="color:#aa44ff">★★★★ Epic 4%</span>
    <span style="color:#ffd700">★★★★★ Legendary 1%</span>
  `;
  screenRoot.appendChild(rateInfo);

  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex; justify-content: center; gap: 16px;
    padding: 16px 24px; border-top: 1px solid #2a1a4a;
  `;

  const backBtn = createActionButton("← Back", "#666", "#666", true, () => {
    destroySummonScreen();
    callbacks.onBack();
  });
  footer.appendChild(backBtn);

  const canSingle = crystals >= SUMMON_COST.single;
  const singleBtn = createActionButton(
    `Summon ×1 (💎${SUMMON_COST.single})`,
    "#aa44ff",
    canSingle ? "#aa44ff" : "#444",
    canSingle,
    () => {
      const result = callbacks.onSummonOne();
      if (result) showResults([result], resultArea, callbacks);
    }
  );
  footer.appendChild(singleBtn);

  const canTen = crystals >= SUMMON_COST.ten;
  const tenBtn = createActionButton(
    `Summon ×10 (💎${SUMMON_COST.ten})`,
    "#ffd700",
    canTen ? "#ffd700" : "#444",
    canTen,
    () => {
      const results = callbacks.onSummonTen();
      if (results) showResults(results, resultArea, callbacks);
    }
  );
  footer.appendChild(tenBtn);

  screenRoot.appendChild(footer);
}

function showResults(
  results: SummonResult[],
  container: HTMLElement,
  callbacks: SummonScreenCallbacks
) {
  container.innerHTML = "";

  const sorted = [...results].sort((a, b) => {
    const order: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];
    return order.indexOf(a.rarity) - order.indexOf(b.rarity);
  });

  for (let i = 0; i < sorted.length; i++) {
    const result = sorted[i];
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      opacity: 0;
      transform: scale(0.5) rotateY(180deg);
      transition: all 0.4s ease-out;
      box-shadow: ${RARITY_GLOW[result.rarity]};
      border-radius: 12px;
    `;

    const card = createHeroCard({
      instance: result.hero,
      compact: results.length > 3,
    });

    if (result.pityTriggered) {
      const pityBadge = document.createElement("div");
      pityBadge.style.cssText = `
        position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
        background: #ffd700; color: #1a0a00; font-size: 9px; font-weight: bold;
        padding: 2px 8px; border-radius: 4px; white-space: nowrap;
      `;
      pityBadge.textContent = "PITY ★";
      card.style.position = "relative";
      card.appendChild(pityBadge);
    }

    wrapper.appendChild(card);
    container.appendChild(wrapper);

    setTimeout(() => {
      wrapper.style.opacity = "1";
      wrapper.style.transform = "scale(1) rotateY(0deg)";
    }, 100 + i * 120);
  }

  setTimeout(() => render(callbacks), 0);
}

function createActionButton(
  text: string,
  accent: string,
  borderColor: string,
  enabled: boolean,
  onClick: () => void
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.style.cssText = `
    padding: 10px 24px; font-size: 13px; font-weight: bold;
    border: 1px solid ${borderColor};
    border-radius: 8px; cursor: ${enabled ? "pointer" : "not-allowed"};
    background: ${enabled ? `rgba(${accent === "#ffd700" ? "255,215,0" : "170,68,255"},0.1)` : "rgba(30,20,50,0.8)"};
    color: ${enabled ? accent : "#555"};
    opacity: ${enabled ? "1" : "0.5"};
    transition: all 0.15s;
  `;
  if (enabled) {
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.05)";
      btn.style.boxShadow = `0 2px 12px ${accent}33`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
      btn.style.boxShadow = "";
    });
    btn.addEventListener("click", onClick);
  }
  return btn;
}
