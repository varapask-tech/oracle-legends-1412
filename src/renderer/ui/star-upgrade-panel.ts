import type { HeroInstance } from "../../shared/types";
import { getHeroById } from "../../shared/heroes";
import { GameStateManager } from "../../systems/game-state";
import {
  canAdvanceStar,
  advanceStar,
  dupesRequired,
  goldCostForStar,
  MAX_STARS,
} from "../../systems/star-advancement";
import { RARITY_COLORS } from "../assets";

export function createStarUpgradePanel(
  hero: HeroInstance,
  gsm: GameStateManager,
  onUpdate: () => void,
): HTMLElement {
  const template = getHeroById(hero.templateId);
  const panel = document.createElement("div");
  panel.style.cssText = `
    padding: 16px; border-radius: 10px; margin-top: 12px;
    background: rgba(20, 10, 40, 0.6); border: 1px solid #ffd700;
  `;

  const title = document.createElement("div");
  title.style.cssText = "font-size: 14px; color: #ffd700; margin-bottom: 8px; font-weight: bold;";
  title.textContent = `⭐ Star Advancement (${hero.stars}/${MAX_STARS})`;
  panel.appendChild(title);

  const starsDisplay = document.createElement("div");
  starsDisplay.style.cssText = "font-size: 20px; margin-bottom: 8px;";
  starsDisplay.textContent = "⭐".repeat(hero.stars) + "☆".repeat(MAX_STARS - hero.stars);
  panel.appendChild(starsDisplay);

  if (hero.stars >= MAX_STARS) {
    const maxLabel = document.createElement("div");
    maxLabel.style.cssText = "color: #ffd700; font-size: 12px;";
    maxLabel.textContent = "Max Stars Reached!";
    panel.appendChild(maxLabel);
    return panel;
  }

  const check = canAdvanceStar(hero, gsm);
  const targetStar = hero.stars + 1;
  const dupeCount = gsm.current.heroes.filter(
    (h) => h.templateId === hero.templateId && h.instanceId !== hero.instanceId,
  ).length;

  const info = document.createElement("div");
  info.style.cssText = "font-size: 11px; color: #aaa; margin-bottom: 8px;";
  info.innerHTML = `
    Copies: ${dupeCount}/${dupesRequired(targetStar)}<br>
    Gold: 💰${gsm.gold.toLocaleString()} / ${goldCostForStar(targetStar).toLocaleString()}
  `;
  panel.appendChild(info);

  const btn = document.createElement("button");
  btn.style.cssText = `
    padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;
    background: ${check.ok ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(60,40,80,0.5)"};
    border: 1px solid ${check.ok ? "#ffd700" : "#444"};
    color: ${check.ok ? "#1a0a00" : "#666"};
  `;
  btn.textContent = `Advance to ⭐${targetStar}`;
  btn.disabled = !check.ok;

  btn.addEventListener("click", () => {
    const result = advanceStar(hero.instanceId, gsm);
    if (result.ok) {
      btn.textContent = `✅ Now ⭐${hero.stars}!`;
      btn.disabled = true;
      setTimeout(onUpdate, 500);
    }
  });

  panel.appendChild(btn);
  return panel;
}
