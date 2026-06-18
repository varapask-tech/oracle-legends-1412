import type { HeroTemplate, HeroInstance, Rarity } from "../../shared/types";
import { HERO_TEMPLATES } from "../../shared/heroes";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#8a8a8a",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffd700",
};

const RARITY_BG: Record<Rarity, string> = {
  common: "linear-gradient(135deg, #2a2a2a, #1a1a1a)",
  uncommon: "linear-gradient(135deg, #1a2e1a, #0a1a0a)",
  rare: "linear-gradient(135deg, #0a1a3e, #0a0a2e)",
  epic: "linear-gradient(135deg, #2a0a3e, #1a0a2e)",
  legendary: "linear-gradient(135deg, #3e2a0a, #2e1a00)",
};

const ELEMENT_EMOJI: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🌿",
  light: "⚡",
  dark: "🌑",
};

const CLASS_EMOJI: Record<string, string> = {
  warrior: "⚔️",
  mage: "🔮",
  archer: "🏹",
  healer: "💚",
  tank: "🛡️",
};

export function getTemplate(instance: HeroInstance): HeroTemplate | undefined {
  return HERO_TEMPLATES.find((t) => t.id === instance.templateId);
}

export function computeStats(template: HeroTemplate, level: number) {
  const g = template.growthPerLevel;
  const b = template.baseStats;
  const mult = level - 1;
  return {
    hp: Math.round(b.hp + g.hp * mult),
    atk: Math.round(b.atk + g.atk * mult),
    def: Math.round(b.def + g.def * mult),
    spd: Math.round(b.spd + g.spd * mult),
    critRate: Math.round((b.critRate + g.critRate * mult) * 1000) / 10,
    critDmg: Math.round((b.critDmg + g.critDmg * mult) * 100),
  };
}

export interface HeroCardOptions {
  instance: HeroInstance;
  compact?: boolean;
  selected?: boolean;
  onClick?: (instance: HeroInstance) => void;
}

export function createHeroCard(opts: HeroCardOptions): HTMLElement {
  const { instance, compact, selected, onClick } = opts;
  const template = getTemplate(instance);
  if (!template) {
    const el = document.createElement("div");
    el.textContent = "???";
    return el;
  }

  const color = RARITY_COLORS[template.rarity];
  const bg = RARITY_BG[template.rarity];

  const card = document.createElement("div");
  card.className = "hero-card" + (selected ? " selected" : "");
  card.style.cssText = `
    background: ${bg};
    border: 2px solid ${color};
    border-radius: 10px;
    padding: ${compact ? "8px" : "12px"};
    width: ${compact ? "100px" : "160px"};
    cursor: ${onClick ? "pointer" : "default"};
    transition: transform 0.15s, box-shadow 0.15s;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    ${selected ? `box-shadow: 0 0 12px ${color};` : ""}
  `;

  card.addEventListener("mouseenter", () => {
    card.style.transform = "translateY(-3px)";
    card.style.boxShadow = `0 4px 16px ${color}66`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = selected ? "translateY(-2px)" : "";
    card.style.boxShadow = selected ? `0 0 12px ${color}` : "";
  });

  if (onClick) card.addEventListener("click", () => onClick(instance));

  const portrait = document.createElement("div");
  portrait.style.cssText = `
    width: ${compact ? "48px" : "80px"};
    height: ${compact ? "48px" : "80px"};
    border-radius: 8px;
    background: #${template.modelColor.toString(16).padStart(6, "0")};
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${compact ? "20px" : "32px"};
    border: 1px solid ${color}44;
  `;
  portrait.textContent = ELEMENT_EMOJI[template.element] ?? "✨";
  card.appendChild(portrait);

  const name = document.createElement("div");
  name.style.cssText = `
    font-size: ${compact ? "11px" : "14px"};
    font-weight: bold;
    color: ${color};
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  name.textContent = template.name;
  card.appendChild(name);

  const meta = document.createElement("div");
  meta.style.cssText = `
    font-size: ${compact ? "9px" : "11px"};
    color: #aaa;
    text-align: center;
    margin-top: 2px;
  `;
  meta.textContent = `${CLASS_EMOJI[template.heroClass] ?? ""} Lv.${instance.level} ${compact ? "" : "⭐".repeat(instance.stars)}`;
  card.appendChild(meta);

  if (!compact) {
    const stats = computeStats(template, instance.level);
    const statsEl = document.createElement("div");
    statsEl.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      margin-top: 8px;
      font-size: 10px;
      color: #ccc;
    `;
    const statEntries = [
      ["HP", stats.hp],
      ["ATK", stats.atk],
      ["DEF", stats.def],
      ["SPD", stats.spd],
    ];
    for (const [label, val] of statEntries) {
      const s = document.createElement("div");
      s.style.cssText = "display:flex; justify-content:space-between; padding:1px 4px;";
      s.innerHTML = `<span style="color:#888">${label}</span><span>${val}</span>`;
      statsEl.appendChild(s);
    }
    card.appendChild(statsEl);
  }

  const rarityBadge = document.createElement("div");
  rarityBadge.style.cssText = `
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 8px;
    color: ${color};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
  `;
  rarityBadge.textContent = template.rarity.slice(0, 3);
  card.appendChild(rarityBadge);

  return card;
}
