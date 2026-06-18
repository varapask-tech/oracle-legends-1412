export type MenuAction = "battle" | "summon" | "heroes" | "settings";

export interface MainMenuCallbacks {
  onAction: (action: MenuAction) => void;
}

let menuRoot: HTMLElement | null = null;

const MENU_ITEMS: { action: MenuAction; icon: string; label: string; color: string }[] = [
  { action: "battle", icon: "⚔️", label: "Battle", color: "#ff6644" },
  { action: "summon", icon: "✨", label: "Summon", color: "#aa44ff" },
  { action: "heroes", icon: "👥", label: "Heroes", color: "#4488ff" },
  { action: "settings", icon: "⚙️", label: "Settings", color: "#888" },
];

export function showMainMenu(
  playerInfo: { gold: number; crystals: number; stageName: string },
  callbacks: MainMenuCallbacks
): void {
  destroyMainMenu();

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  menuRoot = document.createElement("div");
  menuRoot.id = "main-menu";
  menuRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(ellipse at center, rgba(20,10,50,0.9) 0%, rgba(5,2,15,0.97) 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Segoe UI', sans-serif; pointer-events: auto;
  `;
  overlay.appendChild(menuRoot);

  const header = document.createElement("div");
  header.style.cssText = "text-align: center; margin-bottom: 40px;";
  header.innerHTML = `
    <h1 style="font-size: 2.4rem; color: #ffd700; margin: 0;
      text-shadow: 0 0 20px rgba(255,215,0,0.4);">⚔️ Oracle Legends</h1>
    <p style="color: #aaa; font-size: 1rem; margin-top: 4px;">Universe 1412</p>
  `;
  menuRoot.appendChild(header);

  const resourceBar = document.createElement("div");
  resourceBar.style.cssText = `
    display: flex; gap: 24px; margin-bottom: 12px;
    font-size: 14px;
  `;
  resourceBar.innerHTML = `
    <span style="color:#ffd700">💰 ${formatNum(playerInfo.gold)}</span>
    <span style="color:#aa88ff">💎 ${formatNum(playerInfo.crystals)}</span>
  `;
  menuRoot.appendChild(resourceBar);

  const stageLabel = document.createElement("div");
  stageLabel.style.cssText = "color: #666; font-size: 12px; margin-bottom: 32px;";
  stageLabel.textContent = `📍 ${playerInfo.stageName}`;
  menuRoot.appendChild(stageLabel);

  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 16px; max-width: 360px;
  `;

  for (const item of MENU_ITEMS) {
    const btn = document.createElement("button");
    btn.style.cssText = `
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 8px; padding: 24px 16px;
      background: rgba(20, 10, 40, 0.8);
      border: 1px solid ${item.color}44;
      border-radius: 12px; cursor: pointer;
      transition: all 0.2s;
      min-width: 140px;
    `;

    const icon = document.createElement("span");
    icon.style.cssText = "font-size: 32px;";
    icon.textContent = item.icon;
    btn.appendChild(icon);

    const label = document.createElement("span");
    label.style.cssText = `font-size: 14px; font-weight: bold; color: ${item.color};`;
    label.textContent = item.label;
    btn.appendChild(label);

    btn.addEventListener("mouseenter", () => {
      btn.style.borderColor = item.color;
      btn.style.transform = "translateY(-3px)";
      btn.style.boxShadow = `0 4px 20px ${item.color}33`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.borderColor = `${item.color}44`;
      btn.style.transform = "";
      btn.style.boxShadow = "";
    });
    btn.addEventListener("click", () => callbacks.onAction(item.action));

    grid.appendChild(btn);
  }

  menuRoot.appendChild(grid);

  const footer = document.createElement("div");
  footer.style.cssText = "position: absolute; bottom: 16px; color: #333; font-size: 11px;";
  footer.textContent = "Oracle Legends v0.1 — Universe 1412";
  menuRoot.appendChild(footer);
}

export function destroyMainMenu(): void {
  menuRoot?.remove();
  menuRoot = null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
