import { GameStateManager } from "../../systems/game-state";
import { SHARD_SHOP, buyShardShopItem } from "../../systems/shards";

export function createShardShopScreen(
  gsm: GameStateManager,
  onBack: () => void,
): HTMLElement {
  const screen = document.createElement("div");
  screen.style.cssText = `
    width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;
    padding: 24px; background: radial-gradient(ellipse at center, #1a0a3a 0%, #0a0a1a 100%);
    font-family: 'Segoe UI', sans-serif; color: #fff; overflow-y: auto;
  `;

  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 500px; margin-bottom: 20px;";

  const title = document.createElement("h2");
  title.style.cssText = "color: #ff88cc; margin: 0; font-size: 22px;";
  title.textContent = "💎 Shard Shop";
  header.appendChild(title);

  const backBtn = document.createElement("button");
  backBtn.style.cssText = `
    padding: 6px 16px; font-size: 12px; border-radius: 4px; cursor: pointer;
    background: rgba(40,30,60,0.8); border: 1px solid #666; color: #666;
  `;
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", onBack);
  header.appendChild(backBtn);

  screen.appendChild(header);

  const state = gsm.current as any;
  const shards = state.shards ?? 0;

  const shardDisplay = document.createElement("div");
  shardDisplay.style.cssText = "text-align: center; margin-bottom: 16px; font-size: 18px; color: #ff88cc;";
  shardDisplay.textContent = `💎 ${shards} Shards`;
  screen.appendChild(shardDisplay);

  const grid = document.createElement("div");
  grid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 500px; width: 100%;";

  for (const item of SHARD_SHOP) {
    const card = document.createElement("div");
    const canBuy = shards >= item.shardCost;
    card.style.cssText = `
      padding: 14px; border-radius: 10px;
      background: rgba(20, 10, 40, 0.8); border: 1px solid ${canBuy ? "#ff88cc" : "#333"};
    `;

    card.innerHTML = `
      <div style="font-size: 14px; color: #ff88cc; font-weight: bold; margin-bottom: 4px;">${item.name}</div>
      <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">${item.description}</div>
    `;

    const btn = document.createElement("button");
    btn.style.cssText = `
      padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; width: 100%;
      background: ${canBuy ? "rgba(255, 136, 204, 0.15)" : "rgba(60,40,80,0.3)"};
      border: 1px solid ${canBuy ? "#ff88cc" : "#444"};
      color: ${canBuy ? "#ff88cc" : "#555"};
    `;
    btn.textContent = `💎 ${item.shardCost} Shards`;
    btn.disabled = !canBuy;

    btn.addEventListener("click", () => {
      const result = buyShardShopItem(item.id, gsm);
      if (result.ok) {
        btn.textContent = "✅ Purchased!";
        btn.disabled = true;
        const newShards = (gsm.current as any).shards ?? 0;
        shardDisplay.textContent = `💎 ${newShards} Shards`;
      }
    });

    card.appendChild(btn);
    grid.appendChild(card);
  }

  screen.appendChild(grid);
  return screen;
}
