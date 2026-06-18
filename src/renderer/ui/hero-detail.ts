import type { HeroTemplate, HeroInstance, HeroStats, Equipment, Rarity } from "../../shared/types";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#8a8a8a",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffd700",
};

const STAT_COLORS: Record<string, string> = {
  hp: "#44cc44",
  atk: "#ff6644",
  def: "#4488ff",
  spd: "#ffaa00",
  critRate: "#ffd700",
  critDmg: "#ffd700",
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "🗡️",
  armor: "🛡️",
  accessory: "💍",
};

export interface HeroDetailData {
  instance: HeroInstance;
  template: HeroTemplate;
  computedStats: HeroStats;
  levelUpCost: number;
  canLevelUp: boolean;
  equippedItems: Equipment[];
  availableEquipment: Equipment[];
}

export interface HeroDetailCallbacks {
  getHeroData: () => HeroDetailData;
  onLevelUp: () => boolean;
  onEquip: (equipmentId: string) => boolean;
  onUnequip: (slot: string) => boolean;
  onBack: () => void;
  getGold: () => number;
}

let detailRoot: HTMLElement | null = null;
let detailCallbacks: HeroDetailCallbacks | null = null;

export function showHeroDetail(cbs: HeroDetailCallbacks): void {
  destroyHeroDetail();
  detailCallbacks = cbs;

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  detailRoot = document.createElement("div");
  detailRoot.id = "hero-detail";
  detailRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5, 2, 15, 0.97);
    display: flex; flex-direction: column;
    font-family: 'Segoe UI', sans-serif; pointer-events: auto;
  `;
  overlay.appendChild(detailRoot);
  render();
}

function render() {
  if (!detailRoot || !detailCallbacks) return;
  detailRoot.innerHTML = "";

  const data = detailCallbacks.getHeroData();
  const gold = detailCallbacks.getGold();
  const { instance, template, computedStats, levelUpCost, canLevelUp, equippedItems, availableEquipment } = data;
  const color = RARITY_COLORS[template.rarity];

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px; border-bottom: 1px solid #2a1a4a;
  `;
  header.innerHTML = `
    <h2 style="margin:0; color:${color}; font-size:20px;">${template.name}</h2>
    <span style="color:#ffd700; font-size:14px; font-weight:bold;">💰 ${formatNum(gold)}</span>
  `;
  detailRoot.appendChild(header);

  const content = document.createElement("div");
  content.style.cssText = "flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; gap: 24px;";

  const leftPanel = document.createElement("div");
  leftPanel.style.cssText = "flex: 1; min-width: 240px;";

  const portrait = document.createElement("div");
  portrait.style.cssText = `
    width: 120px; height: 120px; border-radius: 16px;
    background: #${template.modelColor.toString(16).padStart(6, "0")};
    border: 2px solid ${color};
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; margin-bottom: 16px;
    box-shadow: 0 4px 20px ${color}33;
  `;
  portrait.textContent = "⚔️";
  leftPanel.appendChild(portrait);

  const info = document.createElement("div");
  info.style.cssText = "margin-bottom: 16px;";
  info.innerHTML = `
    <div style="color:${color}; font-size:18px; font-weight:bold; margin-bottom:2px;">${template.name}</div>
    <div style="color:#888; font-size:12px; margin-bottom:8px;">${template.title}</div>
    <div style="display:flex; gap:8px; font-size:11px; color:#666; margin-bottom:8px;">
      <span style="color:${color}; text-transform:uppercase;">${template.rarity}</span>
      <span>•</span>
      <span style="text-transform:capitalize;">${template.heroClass}</span>
      <span>•</span>
      <span style="text-transform:capitalize;">${template.element}</span>
    </div>
    <div style="color:#777; font-size:11px; line-height:1.4;">${template.description}</div>
  `;
  leftPanel.appendChild(info);

  const levelSection = document.createElement("div");
  levelSection.style.cssText = `
    background: rgba(20,15,40,0.6); border: 1px solid #2a1a4a;
    border-radius: 10px; padding: 14px; margin-bottom: 16px;
  `;

  const levelHeader = document.createElement("div");
  levelHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;";
  levelHeader.innerHTML = `
    <span style="color:#fff; font-size:16px; font-weight:bold;">Lv. ${instance.level}</span>
    <span style="color:#666; font-size:11px;">⭐ ${instance.stars} Stars</span>
  `;
  levelSection.appendChild(levelHeader);

  const lvlBtn = document.createElement("button");
  const affordable = gold >= levelUpCost;
  const canDo = canLevelUp && affordable;
  lvlBtn.style.cssText = `
    width: 100%; padding: 10px; font-size: 13px; font-weight: bold;
    border: 1px solid ${canDo ? "#44cc44" : "#333"};
    border-radius: 8px;
    background: ${canDo ? "rgba(68,204,68,0.1)" : "rgba(30,30,30,0.5)"};
    color: ${canDo ? "#44cc44" : "#555"};
    cursor: ${canDo ? "pointer" : "not-allowed"};
    transition: all 0.15s;
  `;
  lvlBtn.textContent = canLevelUp ? `⬆ Level Up (💰${formatNum(levelUpCost)})` : "MAX LEVEL";

  if (canDo) {
    lvlBtn.addEventListener("mouseenter", () => { lvlBtn.style.background = "rgba(68,204,68,0.2)"; });
    lvlBtn.addEventListener("mouseleave", () => { lvlBtn.style.background = "rgba(68,204,68,0.1)"; });
    lvlBtn.addEventListener("click", () => {
      const success = detailCallbacks?.onLevelUp();
      if (success) {
        lvlBtn.textContent = "✅ Level Up!";
        lvlBtn.style.color = "#ffd700";
        setTimeout(() => render(), 400);
      }
    });
  }
  levelSection.appendChild(lvlBtn);
  leftPanel.appendChild(levelSection);

  content.appendChild(leftPanel);

  const rightPanel = document.createElement("div");
  rightPanel.style.cssText = "flex: 1.2; min-width: 260px;";

  const statsSection = document.createElement("div");
  statsSection.style.cssText = `
    background: rgba(20,15,40,0.6); border: 1px solid #2a1a4a;
    border-radius: 10px; padding: 14px; margin-bottom: 16px;
  `;
  statsSection.innerHTML = `<div style="color:#888; font-size:11px; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">Stats</div>`;

  const statEntries: [string, string, number | string][] = [
    ["HP", "hp", computedStats.hp],
    ["ATK", "atk", computedStats.atk],
    ["DEF", "def", computedStats.def],
    ["SPD", "spd", computedStats.spd],
    ["CRIT", "critRate", `${(computedStats.critRate * 100).toFixed(1)}%`],
    ["C.DMG", "critDmg", `${(computedStats.critDmg * 100).toFixed(0)}%`],
  ];

  for (const [label, key, val] of statEntries) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; padding:4px 0; font-size:13px;";
    row.innerHTML = `
      <span style="color:#888">${label}</span>
      <span style="color:${STAT_COLORS[key] ?? "#ccc"}; font-weight:bold;">${typeof val === "number" ? Math.round(val) : val}</span>
    `;
    statsSection.appendChild(row);
  }
  rightPanel.appendChild(statsSection);

  const equipSection = document.createElement("div");
  equipSection.style.cssText = `
    background: rgba(20,15,40,0.6); border: 1px solid #2a1a4a;
    border-radius: 10px; padding: 14px; margin-bottom: 16px;
  `;
  equipSection.innerHTML = `<div style="color:#888; font-size:11px; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">Equipment</div>`;

  for (const slot of ["weapon", "armor", "accessory"] as const) {
    const equipped = equippedItems.find((e) => e.slot === slot);
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 8px; margin-bottom: 6px;
      background: rgba(10,5,20,0.5); border-radius: 8px;
      border: 1px solid ${equipped ? RARITY_COLORS[equipped.rarity] + "33" : "#1a1a2e"};
    `;

    const icon = document.createElement("span");
    icon.style.cssText = "font-size: 20px; width: 28px; text-align: center;";
    icon.textContent = SLOT_ICONS[slot] ?? "📦";
    row.appendChild(icon);

    if (equipped) {
      const info = document.createElement("div");
      info.style.cssText = "flex: 1;";
      info.innerHTML = `
        <div style="font-size:12px; color:${RARITY_COLORS[equipped.rarity]}; font-weight:bold;">${equipped.name}</div>
        <div style="font-size:10px; color:#666;">${Object.entries(equipped.statBonus).filter(([_, v]) => v).map(([k, v]) => `+${v} ${k}`).join(", ")}</div>
      `;
      row.appendChild(info);

      const unequipBtn = document.createElement("button");
      unequipBtn.style.cssText = "padding:4px 8px; font-size:10px; border:1px solid #44444488; border-radius:4px; background:transparent; color:#888; cursor:pointer;";
      unequipBtn.textContent = "✕";
      unequipBtn.addEventListener("click", () => {
        detailCallbacks?.onUnequip(slot);
        render();
      });
      row.appendChild(unequipBtn);
    } else {
      const empty = document.createElement("div");
      empty.style.cssText = "flex:1; font-size:11px; color:#444;";
      empty.textContent = `Empty ${slot}`;
      row.appendChild(empty);
    }
    equipSection.appendChild(row);
  }

  if (availableEquipment.length > 0) {
    const availLabel = document.createElement("div");
    availLabel.style.cssText = "color:#666; font-size:10px; margin-top:12px; margin-bottom:6px;";
    availLabel.textContent = "Available:";
    equipSection.appendChild(availLabel);

    const availGrid = document.createElement("div");
    availGrid.style.cssText = "display:flex; flex-wrap:wrap; gap:6px;";

    for (const eq of availableEquipment.slice(0, 6)) {
      const chip = document.createElement("button");
      const eqColor = RARITY_COLORS[eq.rarity];
      chip.style.cssText = `
        padding: 4px 10px; font-size: 10px;
        border: 1px solid ${eqColor}44; border-radius: 6px;
        background: rgba(20,15,40,0.6); color: ${eqColor};
        cursor: pointer; transition: all 0.15s;
      `;
      chip.textContent = `${SLOT_ICONS[eq.slot] ?? ""} ${eq.name}`;
      chip.addEventListener("click", () => {
        detailCallbacks?.onEquip(eq.id);
        render();
      });
      availGrid.appendChild(chip);
    }
    equipSection.appendChild(availGrid);
  }

  rightPanel.appendChild(equipSection);

  if (template.skills.length > 0) {
    const skillSection = document.createElement("div");
    skillSection.style.cssText = `
      background: rgba(20,15,40,0.6); border: 1px solid #2a1a4a;
      border-radius: 10px; padding: 14px;
    `;
    skillSection.innerHTML = `<div style="color:#888; font-size:11px; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">Skills</div>`;

    for (const skill of template.skills) {
      const row = document.createElement("div");
      row.style.cssText = "padding: 6px 0;";
      row.innerHTML = `
        <div style="font-size:13px; color:#ffd700; font-weight:bold;">${skill.name}</div>
        <div style="font-size:11px; color:#888; margin-top:2px;">${skill.description}</div>
        <div style="font-size:10px; color:#555; margin-top:2px;">CD: ${skill.cooldown}s · ${skill.damageMultiplier}× DMG · ${skill.targetType}</div>
      `;
      skillSection.appendChild(row);
    }
    rightPanel.appendChild(skillSection);
  }

  content.appendChild(rightPanel);
  detailRoot.appendChild(content);

  const footer = document.createElement("div");
  footer.style.cssText = "padding: 12px 24px; border-top: 1px solid #1a1a2e;";
  const backBtn = document.createElement("button");
  backBtn.style.cssText = `
    padding: 8px 24px; font-size: 13px; font-weight: bold;
    border: 1px solid #444; border-radius: 8px;
    background: rgba(30,20,50,0.8); color: #888;
    cursor: pointer; transition: all 0.15s;
  `;
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => {
    destroyHeroDetail();
    detailCallbacks?.onBack();
  });
  footer.appendChild(backBtn);
  detailRoot.appendChild(footer);
}

export function refreshHeroDetail(): void {
  if (detailRoot && detailCallbacks) render();
}

export function destroyHeroDetail(): void {
  detailRoot?.remove();
  detailRoot = null;
  detailCallbacks = null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.floor(n));
}
