import type { Equipment } from "../../shared/types";
import { GameStateManager } from "../../systems/game-state";
import {
  toEnhanced,
  enhanceEquipment,
  enhanceCost,
  canEnhance,
  MAX_ENHANCE,
  type EnhancedEquipment,
} from "../../systems/equipment-enhance";

export function createEnhancePanel(
  equipment: Equipment,
  gsm: GameStateManager,
  onUpdate: () => void,
): HTMLElement {
  const enhanced = toEnhanced(equipment);

  const panel = document.createElement("div");
  panel.style.cssText = `
    padding: 12px; border-radius: 8px; margin-top: 8px;
    background: rgba(20, 10, 40, 0.6); border: 1px solid #4488ff;
  `;

  const title = document.createElement("div");
  title.style.cssText = "font-size: 13px; color: #4488ff; margin-bottom: 6px; font-weight: bold;";
  title.textContent = `🔧 Enhance: ${equipment.name} +${enhanced.enhanceLevel}`;
  panel.appendChild(title);

  if (enhanced.substats.length > 0) {
    const subsLabel = document.createElement("div");
    subsLabel.style.cssText = "font-size: 10px; color: #88ccff; margin-bottom: 6px;";
    subsLabel.innerHTML = enhanced.substats
      .map((s) => `${s.stat}: +${s.value}`)
      .join(" | ");
    panel.appendChild(subsLabel);
  }

  const nextUnlock = 3 - (enhanced.enhanceLevel % 3);
  const info = document.createElement("div");
  info.style.cssText = "font-size: 10px; color: #888; margin-bottom: 8px;";
  info.textContent = canEnhance(enhanced)
    ? `Cost: 💰${enhanceCost(enhanced)} | New substat in ${nextUnlock} levels`
    : `Max +${MAX_ENHANCE} reached!`;
  panel.appendChild(info);

  if (canEnhance(enhanced)) {
    const btn = document.createElement("button");
    const cost = enhanceCost(enhanced);
    const affordable = gsm.canAffordGold(cost);
    btn.style.cssText = `
      padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;
      background: ${affordable ? "rgba(68, 136, 255, 0.2)" : "rgba(60,40,80,0.3)"};
      border: 1px solid ${affordable ? "#4488ff" : "#444"};
      color: ${affordable ? "#4488ff" : "#666"};
    `;
    btn.textContent = `Enhance +${enhanced.enhanceLevel + 1} (💰${cost})`;
    btn.disabled = !affordable;

    btn.addEventListener("click", () => {
      const result = enhanceEquipment(enhanced, gsm);
      if (result.ok) {
        if (result.newSubstat) {
          btn.textContent = `✨ +${enhanced.enhanceLevel}! New: ${result.newSubstat.stat} +${result.newSubstat.value}`;
        } else {
          btn.textContent = `✅ +${enhanced.enhanceLevel}!`;
        }
        btn.disabled = true;
        setTimeout(onUpdate, 500);
      }
    });

    panel.appendChild(btn);
  }

  return panel;
}
