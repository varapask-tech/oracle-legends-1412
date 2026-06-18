import type { IdleReward } from "../../shared/types";
import { formatIdleTime } from "../systems/idle";

export function createIdlePopup(
  reward: IdleReward,
  onCollect: () => void,
): HTMLElement {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    background: "linear-gradient(135deg, #1a0a2e, #2a1a4e)",
    border: "2px solid #ffd700",
    borderRadius: "16px",
    padding: "32px 40px",
    textAlign: "center",
    color: "#fff",
    fontFamily: "sans-serif",
    maxWidth: "400px",
    boxShadow: "0 0 40px rgba(255, 215, 0, 0.3)",
  });

  const title = document.createElement("h2");
  title.textContent = "Welcome Back!";
  Object.assign(title.style, {
    color: "#ffd700",
    margin: "0 0 8px",
    fontSize: "24px",
  });

  const timeText = document.createElement("p");
  timeText.textContent = `คุณห่างไป ${formatIdleTime(reward.elapsedSeconds)}`;
  Object.assign(timeText.style, {
    color: "#aaa",
    margin: "0 0 24px",
    fontSize: "14px",
  });

  const rewardsContainer = document.createElement("div");
  Object.assign(rewardsContainer.style, {
    display: "flex",
    justifyContent: "center",
    gap: "32px",
    marginBottom: "24px",
  });

  rewardsContainer.appendChild(createRewardItem("Gold", reward.gold, "#ffd700"));
  rewardsContainer.appendChild(createRewardItem("EXP", reward.exp, "#44ff88"));

  const collectBtn = document.createElement("button");
  collectBtn.textContent = "รับรางวัล";
  Object.assign(collectBtn.style, {
    background: "linear-gradient(135deg, #ffd700, #ffaa00)",
    color: "#1a0a2e",
    border: "none",
    borderRadius: "8px",
    padding: "12px 40px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  });

  collectBtn.addEventListener("mouseenter", () => {
    collectBtn.style.transform = "scale(1.05)";
  });
  collectBtn.addEventListener("mouseleave", () => {
    collectBtn.style.transform = "scale(1)";
  });

  collectBtn.addEventListener("click", () => {
    onCollect();
    overlay.remove();
  });

  panel.appendChild(title);
  panel.appendChild(timeText);
  panel.appendChild(rewardsContainer);
  panel.appendChild(collectBtn);
  overlay.appendChild(panel);

  return overlay;
}

function createRewardItem(label: string, value: number, color: string): HTMLElement {
  const item = document.createElement("div");

  const amount = document.createElement("div");
  amount.textContent = formatNumber(value);
  Object.assign(amount.style, {
    fontSize: "28px",
    fontWeight: "bold",
    color,
  });

  const labelEl = document.createElement("div");
  labelEl.textContent = label;
  Object.assign(labelEl.style, {
    fontSize: "12px",
    color: "#999",
    marginTop: "4px",
  });

  item.appendChild(amount);
  item.appendChild(labelEl);
  return item;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
