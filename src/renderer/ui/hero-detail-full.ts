import type { HeroInstance, Equipment } from "../../shared/types";
import { getHeroById, HERO_TEMPLATES } from "../../shared/heroes";
import { GameStateManager } from "../../systems/game-state";
import { canAdvanceStar, advanceStar, dupesRequired, goldCostForStar, MAX_STARS, starStatMultiplier } from "../../systems/star-advancement";
import { dismantleHero, shardValueForHero } from "../../systems/shards";
import { EQUIPMENT_DB, getAvailableEquipment } from "../../data/equipment";

const RARITY_COLORS: Record<string, string> = { common: "#888", uncommon: "#4b4", rare: "#48f", epic: "#a4f", legendary: "#ffd700" };
const ELEMENT_EMOJI: Record<string, string> = { fire: "🔥", water: "💧", earth: "🌿", light: "⚡", dark: "🌑" };

const PORTRAITS: Record<string, string> = {
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

export function createHeroDetailScreen(
  hero: HeroInstance,
  gsm: GameStateManager,
  onBack: () => void,
): HTMLElement {
  const template = getHeroById(hero.templateId);
  if (!template) {
    const err = document.createElement("div");
    err.textContent = "Hero not found";
    return err;
  }

  const color = RARITY_COLORS[template.rarity] ?? "#888";
  const screen = document.createElement("div");
  screen.style.cssText = `
    width:100%; height:100%; display:flex; flex-direction:column; align-items:center;
    padding:20px; background:radial-gradient(ellipse at center, #1a0a3a 0%, #0a0a1a 100%);
    font-family:'Segoe UI',sans-serif; color:#fff; overflow-y:auto;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex; justify-content:space-between; align-items:center; width:100%; max-width:500px; margin-bottom:16px;";
  const backBtn = makeBtn("← Back", "#666", onBack);
  backBtn.style.cssText += "padding:6px 16px; font-size:12px;";
  const titleEl = document.createElement("h2");
  titleEl.style.cssText = `color:${color}; margin:0; font-size:20px;`;
  titleEl.textContent = `${template.name} — ${template.title}`;
  header.appendChild(titleEl);
  header.appendChild(backBtn);
  screen.appendChild(header);

  // Portrait + Info
  const infoRow = document.createElement("div");
  infoRow.style.cssText = "display:flex; gap:16px; width:100%; max-width:500px; margin-bottom:16px;";

  const portrait = document.createElement("div");
  portrait.style.cssText = `width:120px; height:120px; border-radius:12px; overflow:hidden; border:3px solid ${color}; flex-shrink:0;`;
  const img = document.createElement("img");
  img.src = PORTRAITS[template.id] ?? "";
  img.style.cssText = "width:100%; height:100%; object-fit:cover;";
  img.onerror = () => { portrait.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(20,10,40,0.8);font-size:40px;">${ELEMENT_EMOJI[template.element] ?? "🦸"}</div>`; };
  portrait.appendChild(img);
  infoRow.appendChild(portrait);

  const infoCol = document.createElement("div");
  infoCol.style.cssText = "flex:1;";
  infoCol.innerHTML = `
    <div style="font-size:12px; color:${color}; margin-bottom:4px;">${template.rarity.toUpperCase()} ${template.heroClass}</div>
    <div style="font-size:11px; color:#aaa; margin-bottom:4px;">${ELEMENT_EMOJI[template.element] ?? ""} ${template.element} | Lv.${hero.level}</div>
    <div style="font-size:16px; margin-bottom:8px;">${"⭐".repeat(hero.stars)}${"☆".repeat(MAX_STARS - hero.stars)}</div>
    <div style="font-size:10px; color:#888;">${template.description}</div>
  `;
  infoRow.appendChild(infoCol);
  screen.appendChild(infoRow);

  // Stats
  const stats = gsm.getHeroFullStats(hero.instanceId);
  if (stats) {
    const power = gsm.getPower(hero.instanceId);
    const statsGrid = document.createElement("div");
    statsGrid.style.cssText = "display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; width:100%; max-width:500px; margin-bottom:16px;";
    const statItems = [
      { label: "HP", value: stats.hp, color: "#44ff88" },
      { label: "ATK", value: stats.atk, color: "#ff6644" },
      { label: "DEF", value: stats.def, color: "#4488ff" },
      { label: "SPD", value: stats.spd, color: "#ffaa44" },
      { label: "CRIT", value: `${(stats.critRate * 100).toFixed(1)}%`, color: "#ff88cc" },
      { label: "PWR", value: power, color: "#ffd700" },
    ];
    for (const s of statItems) {
      const cell = document.createElement("div");
      cell.style.cssText = `padding:8px; border-radius:6px; background:rgba(20,10,40,0.6); text-align:center;`;
      cell.innerHTML = `<div style="font-size:10px; color:#888;">${s.label}</div><div style="font-size:14px; color:${s.color}; font-weight:bold;">${s.value}</div>`;
      statsGrid.appendChild(cell);
    }
    screen.appendChild(statsGrid);
  }

  // Level Up
  const levelSection = document.createElement("div");
  levelSection.style.cssText = "width:100%; max-width:500px; margin-bottom:12px;";
  const lvlCost = gsm.levelUpCost(hero);
  const lvlBtn = makeBtn(`Level Up → Lv.${hero.level + 1} (💰${lvlCost})`, gsm.canAffordGold(lvlCost) ? "#ffd700" : "#666", () => {
    const result = gsm.levelUpHero(hero.instanceId);
    if (result.ok) {
      refreshScreen();
    }
  });
  lvlBtn.style.width = "100%";
  levelSection.appendChild(lvlBtn);
  screen.appendChild(levelSection);

  // Star Advancement
  if (hero.stars < MAX_STARS) {
    const starSection = document.createElement("div");
    starSection.style.cssText = "width:100%; max-width:500px; padding:12px; border-radius:8px; background:rgba(20,10,40,0.6); border:1px solid #ffd700; margin-bottom:12px;";

    const targetStar = hero.stars + 1;
    const dupeCount = gsm.current.heroes.filter(h => h.templateId === hero.templateId && h.instanceId !== hero.instanceId).length;
    const dupesNeeded = dupesRequired(targetStar);
    const goldNeeded = goldCostForStar(targetStar);
    const check = canAdvanceStar(hero, gsm);

    starSection.innerHTML = `
      <div style="font-size:13px; color:#ffd700; font-weight:bold; margin-bottom:6px;">⭐ Star Advance → ${targetStar}</div>
      <div style="font-size:11px; color:#aaa; margin-bottom:8px;">Copies: ${dupeCount}/${dupesNeeded} | Gold: 💰${gsm.gold.toLocaleString()}/${goldNeeded.toLocaleString()}</div>
    `;
    const starBtn = makeBtn(`Advance ⭐${targetStar}`, check.ok ? "#ffd700" : "#666", () => {
      const result = advanceStar(hero.instanceId, gsm);
      if (result.ok) refreshScreen();
    });
    starBtn.style.width = "100%";
    starBtn.disabled = !check.ok;
    starSection.appendChild(starBtn);
    screen.appendChild(starSection);
  }

  // Equipment
  const equipSection = document.createElement("div");
  equipSection.style.cssText = "width:100%; max-width:500px; margin-bottom:12px;";
  equipSection.innerHTML = `<div style="font-size:13px; color:#4488ff; font-weight:bold; margin-bottom:8px;">🛡️ Equipment</div>`;

  const slots: Array<"weapon" | "armor" | "accessory"> = ["weapon", "armor", "accessory"];
  for (const slot of slots) {
    const equipped = hero.equipment.find(e => e.slot === slot);
    const slotDiv = document.createElement("div");
    slotDiv.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-radius:6px; background:rgba(20,10,40,0.4); margin-bottom:4px;";

    if (equipped) {
      const eqColor = RARITY_COLORS[equipped.rarity] ?? "#888";
      slotDiv.innerHTML = `
        <div><span style="font-size:12px; color:${eqColor}; font-weight:bold;">${equipped.name}</span> <span style="font-size:10px; color:#888;">(${slot})</span></div>
      `;
      const unequipBtn = makeBtn("Remove", "#666", () => {
        gsm.unequipSlot(hero.instanceId, slot);
        refreshScreen();
      });
      unequipBtn.style.cssText += "padding:3px 10px; font-size:10px;";
      slotDiv.appendChild(unequipBtn);
    } else {
      slotDiv.innerHTML = `<div style="font-size:11px; color:#555;">${slot} — empty</div>`;
    }
    equipSection.appendChild(slotDiv);
  }

  // Available equipment to equip
  const stageNum = parseInt(gsm.current.currentStage.split("-")[0] ?? "1", 10) * 10;
  const available = getAvailableEquipment(stageNum).filter(e => !hero.equipment.some(eq => eq.id === e.equipment.id));
  if (available.length > 0) {
    const availLabel = document.createElement("div");
    availLabel.style.cssText = "font-size:10px; color:#888; margin:8px 0 4px;";
    availLabel.textContent = "Available equipment:";
    equipSection.appendChild(availLabel);

    for (const item of available.slice(0, 6)) {
      const eqColor = RARITY_COLORS[item.equipment.rarity] ?? "#888";
      const chip = document.createElement("button");
      chip.style.cssText = `
        display:inline-block; padding:4px 10px; margin:2px; border-radius:4px; cursor:pointer;
        background:rgba(20,10,40,0.6); border:1px solid ${eqColor}; color:${eqColor}; font-size:10px;
      `;
      chip.textContent = `${item.equipment.name} (💰${item.cost})`;
      chip.addEventListener("click", () => {
        if (gsm.spendGold(item.cost)) {
          gsm.equipItem(hero.instanceId, item.equipment);
          refreshScreen();
        }
      });
      equipSection.appendChild(chip);
    }
  }
  screen.appendChild(equipSection);

  // Dismantle
  if (!gsm.current.team.includes(hero.instanceId)) {
    const dismantleSection = document.createElement("div");
    dismantleSection.style.cssText = "width:100%; max-width:500px; margin-top:12px;";
    const shardValue = shardValueForHero(hero);
    const dismantleBtn = makeBtn(`🗑️ Dismantle (→ 💎${shardValue} shards)`, "#ff4444", () => {
      const result = dismantleHero(hero.instanceId, gsm);
      if (result.ok) onBack();
    });
    dismantleBtn.style.width = "100%";
    dismantleSection.appendChild(dismantleBtn);
    screen.appendChild(dismantleSection);
  }

  function refreshScreen() {
    const parent = screen.parentElement;
    if (!parent) return;
    const updated = gsm.findHero(hero.instanceId);
    if (!updated) { onBack(); return; }
    const newScreen = createHeroDetailScreen(updated, gsm, onBack);
    parent.replaceChild(newScreen, screen);
  }

  return screen;
}

function makeBtn(text: string, color: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  const isGold = color === "#ffd700";
  btn.style.cssText = `
    padding:10px 24px; font-size:13px; font-weight:bold; cursor:pointer; border-radius:8px;
    background:${isGold ? "linear-gradient(135deg,#ffd700,#ff8c00)" : color === "#ff4444" ? "rgba(255,40,40,0.15)" : "rgba(40,30,60,0.8)"};
    border:1px solid ${color}; color:${isGold ? "#1a0a00" : color};
    transition:transform 0.15s;
  `;
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.03)"; });
  btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  return btn;
}
