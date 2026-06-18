import type { StageReward } from "../../shared/types";

export interface RewardPopupData {
  stageName: string;
  rewards: StageReward;
  expGained: number;
  levelUps: { heroName: string; oldLevel: number; newLevel: number }[];
}

export interface RewardPopupCallbacks {
  onContinue: () => void;
  onRetry: () => void;
}

let popupRoot: HTMLElement | null = null;

export function showRewardPopup(
  data: RewardPopupData,
  callbacks: RewardPopupCallbacks
): void {
  destroyRewardPopup();

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  popupRoot = document.createElement("div");
  popupRoot.id = "reward-popup";
  popupRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    font-family: 'Segoe UI', sans-serif;
    pointer-events: auto;
    animation: reward-fade-in 0.3s ease-out;
  `;
  overlay.appendChild(popupRoot);

  const card = document.createElement("div");
  card.style.cssText = `
    background: linear-gradient(135deg, #1a0a2e, #0a0a1a);
    border: 1px solid #ffd70044;
    border-radius: 16px;
    padding: 32px;
    min-width: 340px;
    max-width: 440px;
    text-align: center;
    animation: reward-scale-in 0.4s ease-out;
  `;
  popupRoot.appendChild(card);

  const title = document.createElement("div");
  title.style.cssText = `
    font-size: 24px; font-weight: bold; color: #ffd700;
    text-shadow: 0 0 20px rgba(255,215,0,0.4);
    margin-bottom: 4px;
  `;
  title.textContent = "🎉 Victory!";
  card.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.style.cssText = "font-size: 13px; color: #888; margin-bottom: 24px;";
  subtitle.textContent = data.stageName;
  card.appendChild(subtitle);

  const rewardsGrid = document.createElement("div");
  rewardsGrid.style.cssText = `
    display: flex; justify-content: center; gap: 24px;
    margin-bottom: 20px;
  `;

  const rewardItems: { icon: string; label: string; value: string; color: string }[] = [
    { icon: "💰", label: "Gold", value: `+${formatNum(data.rewards.gold)}`, color: "#ffd700" },
    { icon: "⚡", label: "EXP", value: `+${formatNum(data.expGained)}`, color: "#44cc44" },
  ];
  if (data.rewards.crystals > 0) {
    rewardItems.push({
      icon: "💎",
      label: "Crystals",
      value: `+${data.rewards.crystals}`,
      color: "#aa88ff",
    });
  }

  for (const item of rewardItems) {
    const el = document.createElement("div");
    el.style.cssText = `
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      border: 1px solid ${item.color}22;
    `;
    el.innerHTML = `
      <span style="font-size: 28px;">${item.icon}</span>
      <span style="font-size: 16px; font-weight: bold; color: ${item.color};">${item.value}</span>
      <span style="font-size: 10px; color: #666;">${item.label}</span>
    `;
    rewardsGrid.appendChild(el);
  }
  card.appendChild(rewardsGrid);

  if (data.levelUps.length > 0) {
    const levelSection = document.createElement("div");
    levelSection.style.cssText = `
      margin-bottom: 20px; padding: 12px;
      background: rgba(68, 204, 68, 0.05);
      border: 1px solid #44cc4422;
      border-radius: 8px;
    `;

    const levelTitle = document.createElement("div");
    levelTitle.style.cssText = "font-size: 11px; color: #44cc44; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;";
    levelTitle.textContent = "⬆ Level Up!";
    levelSection.appendChild(levelTitle);

    for (const lu of data.levelUps) {
      const row = document.createElement("div");
      row.style.cssText = "font-size: 13px; color: #ccc; margin-top: 4px;";
      row.innerHTML = `
        <span style="color:#ffd700">${lu.heroName}</span>
        <span style="color:#666">Lv.${lu.oldLevel}</span>
        <span style="color:#44cc44"> → Lv.${lu.newLevel}</span>
      `;
      levelSection.appendChild(row);
    }
    card.appendChild(levelSection);
  }

  if (data.rewards.dropTable.length > 0) {
    const dropSection = document.createElement("div");
    dropSection.style.cssText = "margin-bottom: 20px; font-size: 12px; color: #888;";
    dropSection.textContent = `📦 ${data.rewards.dropTable.length} item(s) dropped`;
    card.appendChild(dropSection);
  }

  const buttons = document.createElement("div");
  buttons.style.cssText = "display: flex; justify-content: center; gap: 12px; margin-top: 8px;";

  const retryBtn = document.createElement("button");
  retryBtn.style.cssText = `
    padding: 10px 28px; font-size: 13px; font-weight: bold;
    border: 1px solid #666; border-radius: 8px;
    background: rgba(40,30,60,0.8); color: #888;
    cursor: pointer; transition: all 0.15s;
  `;
  retryBtn.textContent = "🔄 Retry";
  retryBtn.addEventListener("click", () => {
    destroyRewardPopup();
    callbacks.onRetry();
  });
  retryBtn.addEventListener("mouseenter", () => {
    retryBtn.style.borderColor = "#aaa";
    retryBtn.style.color = "#ccc";
  });
  retryBtn.addEventListener("mouseleave", () => {
    retryBtn.style.borderColor = "#666";
    retryBtn.style.color = "#888";
  });
  buttons.appendChild(retryBtn);

  const continueBtn = document.createElement("button");
  continueBtn.style.cssText = `
    padding: 10px 28px; font-size: 13px; font-weight: bold;
    border: none; border-radius: 8px;
    background: linear-gradient(135deg, #ffd700, #ff8c00);
    color: #1a0a00; cursor: pointer;
    transition: all 0.15s;
  `;
  continueBtn.textContent = "Next Stage →";
  continueBtn.addEventListener("click", () => {
    destroyRewardPopup();
    callbacks.onContinue();
  });
  continueBtn.addEventListener("mouseenter", () => {
    continueBtn.style.transform = "scale(1.05)";
    continueBtn.style.boxShadow = "0 2px 16px rgba(255,215,0,0.3)";
  });
  continueBtn.addEventListener("mouseleave", () => {
    continueBtn.style.transform = "";
    continueBtn.style.boxShadow = "";
  });
  buttons.appendChild(continueBtn);

  card.appendChild(buttons);

  const animStyle = document.createElement("style");
  animStyle.textContent = `
    @keyframes reward-fade-in {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes reward-scale-in {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  popupRoot.appendChild(animStyle);
}

export function showDefeatPopup(
  stageName: string,
  callbacks: { onRetry: () => void; onBack: () => void }
): void {
  destroyRewardPopup();

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  popupRoot = document.createElement("div");
  popupRoot.id = "reward-popup";
  popupRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    font-family: 'Segoe UI', sans-serif;
    pointer-events: auto;
  `;
  overlay.appendChild(popupRoot);

  const card = document.createElement("div");
  card.style.cssText = `
    background: linear-gradient(135deg, #2a0a0a, #0a0a1a);
    border: 1px solid #ff444444;
    border-radius: 16px; padding: 32px;
    min-width: 300px; text-align: center;
  `;

  card.innerHTML = `
    <div style="font-size: 24px; font-weight: bold; color: #ff4444; margin-bottom: 4px;">
      💀 Defeated
    </div>
    <div style="font-size: 13px; color: #888; margin-bottom: 24px;">${stageName}</div>
    <div style="font-size: 13px; color: #aaa; margin-bottom: 24px;">
      Strengthen your team and try again!
    </div>
  `;

  const buttons = document.createElement("div");
  buttons.style.cssText = "display: flex; justify-content: center; gap: 12px;";

  const backBtn = document.createElement("button");
  backBtn.style.cssText = `
    padding: 10px 28px; font-size: 13px; font-weight: bold;
    border: 1px solid #666; border-radius: 8px;
    background: rgba(40,30,60,0.8); color: #888;
    cursor: pointer; transition: all 0.15s;
  `;
  backBtn.textContent = "← Menu";
  backBtn.addEventListener("click", () => {
    destroyRewardPopup();
    callbacks.onBack();
  });
  buttons.appendChild(backBtn);

  const retryBtn = document.createElement("button");
  retryBtn.style.cssText = `
    padding: 10px 28px; font-size: 13px; font-weight: bold;
    border: none; border-radius: 8px;
    background: linear-gradient(135deg, #ff6644, #ff4444);
    color: #fff; cursor: pointer; transition: all 0.15s;
  `;
  retryBtn.textContent = "🔄 Retry";
  retryBtn.addEventListener("click", () => {
    destroyRewardPopup();
    callbacks.onRetry();
  });
  buttons.appendChild(retryBtn);

  card.appendChild(buttons);
  popupRoot.appendChild(card);
}

export function destroyRewardPopup(): void {
  popupRoot?.remove();
  popupRoot = null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
