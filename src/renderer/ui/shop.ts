import type { Equipment, Rarity } from "../../shared/types";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#8a8a8a",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffd700",
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "🗡️",
  armor: "🛡️",
  accessory: "💍",
};

export interface ShopItem {
  equipment: Equipment;
  price: number;
  currency: "gold" | "crystals";
  sold?: boolean;
}

export interface ShopCallbacks {
  getGold: () => number;
  getCrystals: () => number;
  getShopItems: () => ShopItem[];
  onBuy: (itemId: string) => boolean;
  onBack: () => void;
  onRefresh?: () => void;
}

let shopRoot: HTMLElement | null = null;
let shopCallbacks: ShopCallbacks | null = null;

export function showShop(cbs: ShopCallbacks): void {
  destroyShop();
  shopCallbacks = cbs;

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  shopRoot = document.createElement("div");
  shopRoot.id = "shop-screen";
  shopRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5, 2, 15, 0.97);
    display: flex; flex-direction: column;
    font-family: 'Segoe UI', sans-serif; pointer-events: auto;
  `;
  overlay.appendChild(shopRoot);
  render();
}

function render() {
  if (!shopRoot || !shopCallbacks) return;
  shopRoot.innerHTML = "";

  const gold = shopCallbacks.getGold();
  const crystals = shopCallbacks.getCrystals();
  const items = shopCallbacks.getShopItems();

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px; border-bottom: 1px solid #2a1a4a;
  `;
  header.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <h2 style="margin:0; color:#44bb44; font-size:20px;">🏪 Shop</h2>
    </div>
    <div style="display:flex; gap:16px; font-size:14px;">
      <span style="color:#ffd700; font-weight:bold;">💰 ${formatNum(gold)}</span>
      <span style="color:#aa88ff; font-weight:bold;">💎 ${formatNum(crystals)}</span>
    </div>
  `;
  shopRoot.appendChild(header);

  const tabs = document.createElement("div");
  tabs.style.cssText = `
    display: flex; gap: 0; padding: 0 24px;
    border-bottom: 1px solid #1a1a2e;
  `;
  for (const tab of ["Equipment", "Items"]) {
    const t = document.createElement("div");
    const active = tab === "Equipment";
    t.style.cssText = `
      padding: 10px 24px; font-size: 13px; cursor: pointer;
      color: ${active ? "#44bb44" : "#555"};
      border-bottom: 2px solid ${active ? "#44bb44" : "transparent"};
      font-weight: ${active ? "bold" : "normal"};
    `;
    t.textContent = tab;
    tabs.appendChild(t);
  }
  shopRoot.appendChild(tabs);

  const grid = document.createElement("div");
  grid.style.cssText = `
    flex: 1; overflow-y: auto; padding: 16px 24px;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px; align-content: start;
  `;

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "grid-column: 1/-1; text-align:center; color:#444; padding:40px; font-size:14px;";
    empty.textContent = "No items available — check back later!";
    grid.appendChild(empty);
  }

  for (const item of items) {
    const card = createShopCard(item, gold, crystals);
    grid.appendChild(card);
  }

  shopRoot.appendChild(grid);

  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 24px; border-top: 1px solid #1a1a2e;
  `;

  const backBtn = document.createElement("button");
  backBtn.style.cssText = `
    padding: 8px 24px; font-size: 13px; font-weight: bold;
    border: 1px solid #444; border-radius: 8px;
    background: rgba(30,20,50,0.8); color: #888;
    cursor: pointer; transition: all 0.15s;
  `;
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => {
    destroyShop();
    shopCallbacks?.onBack();
  });
  footer.appendChild(backBtn);

  if (shopCallbacks.onRefresh) {
    const refreshBtn = document.createElement("button");
    refreshBtn.style.cssText = `
      padding: 8px 20px; font-size: 12px;
      border: 1px solid #44bb4444; border-radius: 8px;
      background: rgba(68,187,68,0.08); color: #44bb44;
      cursor: pointer; transition: all 0.15s;
    `;
    refreshBtn.textContent = "🔄 Refresh Shop";
    refreshBtn.addEventListener("click", () => {
      shopCallbacks?.onRefresh?.();
      render();
    });
    footer.appendChild(refreshBtn);
  }

  shopRoot.appendChild(footer);
}

function createShopCard(item: ShopItem, gold: number, crystals: number): HTMLElement {
  const { equipment: eq, price, currency, sold } = item;
  const color = RARITY_COLORS[eq.rarity];
  const canAfford = currency === "gold" ? gold >= price : crystals >= price;
  const disabled = sold || !canAfford;

  const card = document.createElement("div");
  card.style.cssText = `
    background: linear-gradient(135deg, rgba(20,15,40,0.9), rgba(10,5,20,0.9));
    border: 1px solid ${sold ? "#333" : color + "44"};
    border-radius: 12px; padding: 16px;
    opacity: ${sold ? "0.4" : "1"};
    transition: all 0.15s;
  `;

  if (!sold) {
    card.addEventListener("mouseenter", () => {
      card.style.borderColor = color;
      card.style.boxShadow = `0 2px 16px ${color}22`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.borderColor = `${color}44`;
      card.style.boxShadow = "";
    });
  }

  const topRow = document.createElement("div");
  topRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
  topRow.innerHTML = `
    <span style="font-size: 24px;">${SLOT_ICONS[eq.slot] ?? "📦"}</span>
    <span style="font-size: 9px; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px;">${eq.rarity}</span>
  `;
  card.appendChild(topRow);

  const name = document.createElement("div");
  name.style.cssText = `font-size: 14px; font-weight: bold; color: ${color}; margin-bottom: 4px;`;
  name.textContent = eq.name;
  card.appendChild(name);

  const slotLabel = document.createElement("div");
  slotLabel.style.cssText = "font-size: 11px; color: #666; margin-bottom: 10px; text-transform: capitalize;";
  slotLabel.textContent = eq.slot;
  card.appendChild(slotLabel);

  const stats = document.createElement("div");
  stats.style.cssText = "font-size: 11px; color: #aaa; margin-bottom: 12px; line-height: 1.5;";
  const bonuses = Object.entries(eq.statBonus)
    .filter(([_, v]) => v && v !== 0)
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, " $1").trim();
      const isPercent = k === "critRate" || k === "critDmg";
      const display = isPercent ? `+${((v as number) * 100).toFixed(1)}%` : `+${v}`;
      return `<span style="color:#44cc44">${display}</span> ${label}`;
    });
  stats.innerHTML = bonuses.join("<br>") || "<span style='color:#555'>No bonus</span>";
  card.appendChild(stats);

  const buyBtn = document.createElement("button");
  const currIcon = currency === "gold" ? "💰" : "💎";
  buyBtn.style.cssText = `
    width: 100%; padding: 8px; font-size: 12px; font-weight: bold;
    border: 1px solid ${disabled ? "#333" : "#44bb4488"};
    border-radius: 8px;
    background: ${disabled ? "rgba(30,30,30,0.5)" : "rgba(68,187,68,0.1)"};
    color: ${disabled ? "#555" : canAfford ? "#44bb44" : "#cc3333"};
    cursor: ${disabled ? "not-allowed" : "pointer"};
    transition: all 0.15s;
  `;
  buyBtn.textContent = sold ? "SOLD" : `${currIcon} ${formatNum(price)}`;

  if (!disabled) {
    buyBtn.addEventListener("mouseenter", () => {
      buyBtn.style.background = "rgba(68,187,68,0.2)";
    });
    buyBtn.addEventListener("mouseleave", () => {
      buyBtn.style.background = "rgba(68,187,68,0.1)";
    });
    buyBtn.addEventListener("click", () => {
      const success = shopCallbacks?.onBuy(eq.id);
      if (success) {
        buyBtn.textContent = "✅ Purchased!";
        buyBtn.style.color = "#ffd700";
        buyBtn.style.cursor = "default";
        setTimeout(() => render(), 600);
      } else {
        buyBtn.textContent = "❌ Not enough!";
        buyBtn.style.color = "#cc3333";
        setTimeout(() => render(), 800);
      }
    });
  }
  card.appendChild(buyBtn);

  return card;
}

export function refreshShop(): void {
  if (shopRoot && shopCallbacks) render();
}

export function destroyShop(): void {
  shopRoot?.remove();
  shopRoot = null;
  shopCallbacks = null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.floor(n));
}
