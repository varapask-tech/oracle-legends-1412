export type MenuAction = "battle" | "summon" | "heroes" | "shop" | "settings";

export interface PlayerInfo {
  gold: number;
  crystals: number;
  stageName: string;
  teamPower: number;
  heroCount: number;
}

export interface MainMenuCallbacks {
  onAction: (action: MenuAction) => void;
  getPlayerInfo: () => PlayerInfo;
}

let menuRoot: HTMLElement | null = null;
let callbacks: MainMenuCallbacks | null = null;

const MENU_ITEMS: { action: MenuAction; icon: string; label: string; sublabel: string; color: string; bg: string }[] = [
  { action: "battle", icon: "⚔️", label: "Battle", sublabel: "Campaign", color: "#ff6644", bg: "linear-gradient(135deg, #3a1500, #1a0a00)" },
  { action: "summon", icon: "✨", label: "Summon", sublabel: "Gacha", color: "#aa44ff", bg: "linear-gradient(135deg, #2a0a3a, #150520)" },
  { action: "heroes", icon: "👥", label: "Heroes", sublabel: "Upgrade", color: "#4488ff", bg: "linear-gradient(135deg, #0a1a3a, #050a20)" },
  { action: "shop", icon: "🏪", label: "Shop", sublabel: "Equipment", color: "#44bb44", bg: "linear-gradient(135deg, #0a2a0a, #051505)" },
];

export function showMainMenu(cbs: MainMenuCallbacks): void {
  destroyMainMenu();
  callbacks = cbs;

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  menuRoot = document.createElement("div");
  menuRoot.id = "main-menu";
  menuRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(ellipse at 50% 30%, rgba(30,15,60,0.95) 0%, rgba(5,2,15,0.99) 100%);
    display: flex; flex-direction: column; align-items: center;
    font-family: 'Segoe UI', sans-serif; pointer-events: auto;
    overflow-y: auto;
  `;
  overlay.appendChild(menuRoot);
  render();
}

function render() {
  if (!menuRoot || !callbacks) return;
  const info = callbacks.getPlayerInfo();
  menuRoot.innerHTML = "";

  const spacer = document.createElement("div");
  spacer.style.cssText = "flex: 1; min-height: 40px;";
  menuRoot.appendChild(spacer);

  const header = document.createElement("div");
  header.style.cssText = "text-align: center; margin-bottom: 24px;";
  header.innerHTML = `
    <h1 style="font-size: 2rem; color: #ffd700; margin: 0;
      text-shadow: 0 0 20px rgba(255,215,0,0.3), 0 2px 4px rgba(0,0,0,0.5);">
      ⚔️ Oracle Legends
    </h1>
    <p style="color: #888; font-size: 0.9rem; margin-top: 4px;">Universe 1412</p>
  `;
  menuRoot.appendChild(header);

  const resourceBar = document.createElement("div");
  resourceBar.style.cssText = `
    display: flex; gap: 20px; margin-bottom: 8px;
    padding: 8px 20px; border-radius: 20px;
    background: rgba(20,10,40,0.6); border: 1px solid #ffffff0a;
  `;
  resourceBar.innerHTML = `
    <span style="color:#ffd700; font-size: 15px; font-weight: bold;">💰 ${formatNum(info.gold)}</span>
    <span style="color:#aa88ff; font-size: 15px; font-weight: bold;">💎 ${formatNum(info.crystals)}</span>
  `;
  menuRoot.appendChild(resourceBar);

  const infoRow = document.createElement("div");
  infoRow.style.cssText = "display: flex; gap: 16px; color: #555; font-size: 11px; margin-bottom: 28px;";
  infoRow.innerHTML = `
    <span>📍 ${info.stageName}</span>
    <span>⚡ Power ${formatNum(info.teamPower)}</span>
    <span>👥 ${info.heroCount} Heroes</span>
  `;
  menuRoot.appendChild(infoRow);

  const grid = document.createElement("div");
  grid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 380px; width: 90%;";

  for (const item of MENU_ITEMS) {
    const btn = document.createElement("button");
    btn.style.cssText = `
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; padding: 28px 16px;
      background: ${item.bg}; border: 1px solid ${item.color}33;
      border-radius: 14px; cursor: pointer; transition: all 0.2s;
      position: relative; overflow: hidden;
    `;

    btn.innerHTML = `
      <span style="font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${item.icon}</span>
      <span style="font-size: 15px; font-weight: bold; color: ${item.color};">${item.label}</span>
      <span style="font-size: 10px; color: #666;">${item.sublabel}</span>
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.borderColor = `${item.color}88`;
      btn.style.transform = "translateY(-2px)";
      btn.style.boxShadow = `0 6px 24px ${item.color}22`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.borderColor = `${item.color}33`;
      btn.style.transform = "";
      btn.style.boxShadow = "";
    });
    btn.addEventListener("click", () => callbacks?.onAction(item.action));
    grid.appendChild(btn);
  }

  menuRoot.appendChild(grid);

  const spacer2 = document.createElement("div");
  spacer2.style.cssText = "flex: 1.5; min-height: 40px;";
  menuRoot.appendChild(spacer2);
}

export function refreshMainMenu(): void {
  if (menuRoot && callbacks) render();
}

export function destroyMainMenu(): void {
  menuRoot?.remove();
  menuRoot = null;
  callbacks = null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.floor(n));
}
