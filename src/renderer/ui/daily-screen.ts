import { DailyMissionManager, type Mission, type MissionReward } from "../../systems/daily-missions";

export class DailyScreen {
  private el: HTMLDivElement;
  private manager: DailyMissionManager;
  private onReward: (reward: MissionReward) => void;
  private onClose: () => void;

  constructor(
    container: HTMLElement,
    onReward: (reward: MissionReward) => void,
    onClose: () => void,
  ) {
    this.manager = new DailyMissionManager();
    this.onReward = onReward;
    this.onClose = onClose;

    this.el = document.createElement("div");
    this.el.style.cssText = `
      width:100%; height:100%; display:flex; flex-direction:column; align-items:center;
      padding:20px; background:radial-gradient(ellipse at center, #1a0a3a 0%, #0a0a1a 100%);
      font-family:'Segoe UI',sans-serif; color:#fff; overflow-y:auto;
    `;
    container.appendChild(this.el);
    this.render();
  }

  private render() {
    this.el.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center; width:100%; max-width:560px; margin-bottom:16px;";

    const title = document.createElement("h2");
    title.style.cssText = "color:#ffd700; margin:0; font-size:20px;";
    title.textContent = `📋 ภารกิจประจำวัน (${this.manager.completedCount}/${this.manager.missions.length})`;
    header.appendChild(title);

    const backBtn = document.createElement("button");
    backBtn.textContent = "← Menu";
    backBtn.style.cssText = `
      padding:6px 16px; font-size:12px; border-radius:6px; cursor:pointer;
      background:rgba(40,30,60,0.8); border:1px solid #666; color:#666;
    `;
    backBtn.onclick = () => this.onClose();
    header.appendChild(backBtn);
    this.el.appendChild(header);

    const grid = document.createElement("div");
    grid.style.cssText = "display:flex; flex-direction:column; gap:8px; width:100%; max-width:560px;";

    for (const m of this.manager.missions) {
      grid.appendChild(this.renderMission(m));
    }

    this.el.appendChild(grid);

    const weeklySection = document.createElement("div");
    weeklySection.style.cssText = "width:100%; max-width:560px; margin-top:24px;";

    const weekTitle = document.createElement("h3");
    weekTitle.style.cssText = "color:#ffd700; font-size:16px; margin-bottom:12px;";
    weekTitle.textContent = `🏆 โบนัสรายสัปดาห์ (${this.manager.weekly.missionsCompleted} missions)`;
    weeklySection.appendChild(weekTitle);

    const milestoneRow = document.createElement("div");
    milestoneRow.style.cssText = "display:flex; gap:8px; flex-wrap:wrap;";

    this.manager.weekly.milestones.forEach((ms, i) => {
      const chip = document.createElement("div");
      const canClaim = !ms.claimed && this.manager.weekly.missionsCompleted >= ms.required;
      const done = ms.claimed;
      chip.style.cssText = `
        padding:10px 16px; border-radius:8px; text-align:center; cursor:${canClaim ? "pointer" : "default"};
        background:${done ? "rgba(68,170,68,0.15)" : canClaim ? "rgba(255,215,0,0.15)" : "rgba(20,10,40,0.8)"};
        border:1px solid ${done ? "#4a4" : canClaim ? "#ffd700" : "#3a2a5a"};
        flex:1; min-width:100px;
      `;
      chip.innerHTML = `
        <div style="font-size:11px; color:#888;">${ms.required} missions</div>
        <div style="font-size:13px; color:${done ? "#4a4" : canClaim ? "#ffd700" : "#aaa"}; font-weight:bold;">
          ${done ? "✅ รับแล้ว" : this.formatReward(ms.reward)}
        </div>
      `;
      if (canClaim) {
        chip.onclick = () => {
          const reward = this.manager.claimWeeklyMilestone(i);
          if (reward) {
            this.onReward(reward);
            this.render();
          }
        };
      }
      milestoneRow.appendChild(chip);
    });

    weeklySection.appendChild(milestoneRow);
    this.el.appendChild(weeklySection);
  }

  private renderMission(m: Mission): HTMLElement {
    const row = document.createElement("div");
    const canClaim = m.completed && !m.claimed;
    row.style.cssText = `
      display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px;
      background:${m.claimed ? "rgba(68,170,68,0.08)" : "rgba(20,10,40,0.8)"};
      border:1px solid ${m.claimed ? "#2a4a2a" : canClaim ? "#ffd700" : "#2a1a4a"};
    `;

    const info = document.createElement("div");
    info.style.cssText = "flex:1;";
    info.innerHTML = `
      <div style="font-size:13px; font-weight:bold; color:${m.claimed ? "#6a8a6a" : "#e0d0ff"};">${m.title}</div>
      <div style="font-size:11px; color:#888;">${m.description}</div>
    `;
    row.appendChild(info);

    const progress = document.createElement("div");
    progress.style.cssText = "text-align:center; min-width:60px;";

    if (m.claimed) {
      progress.innerHTML = `<div style="color:#4a4; font-size:12px;">✅ รับแล้ว</div>`;
    } else if (m.completed) {
      const btn = document.createElement("button");
      btn.textContent = "รับ!";
      btn.style.cssText = `
        padding:4px 14px; font-size:12px; font-weight:bold; border-radius:6px; cursor:pointer;
        background:linear-gradient(135deg,#ffd700,#ff8c00); border:none; color:#1a0a00;
      `;
      btn.onclick = () => {
        const reward = this.manager.claimReward(m.id);
        if (reward) {
          this.onReward(reward);
          this.render();
        }
      };
      progress.appendChild(btn);
    } else {
      const bar = document.createElement("div");
      bar.style.cssText = "width:60px; height:6px; background:#1a1a2e; border-radius:3px; overflow:hidden;";
      const fill = document.createElement("div");
      const ratio = m.target > 0 ? m.progress / m.target : 0;
      fill.style.cssText = `width:${ratio * 100}%; height:100%; background:linear-gradient(90deg,#4488ff,#44aaff); border-radius:3px; transition:width 0.3s;`;
      bar.appendChild(fill);
      progress.appendChild(bar);

      const label = document.createElement("div");
      label.style.cssText = "font-size:10px; color:#888; margin-top:2px;";
      label.textContent = `${m.progress}/${m.target}`;
      progress.appendChild(label);
    }

    row.appendChild(progress);

    const reward = document.createElement("div");
    reward.style.cssText = "font-size:11px; color:#aaa; min-width:70px; text-align:right;";
    reward.textContent = this.formatReward(m.reward);
    row.appendChild(reward);

    return row;
  }

  private formatReward(r: MissionReward): string {
    const parts: string[] = [];
    if (r.gold) parts.push(`💰${r.gold}`);
    if (r.crystals) parts.push(`💎${r.crystals}`);
    if (r.exp) parts.push(`✨${r.exp}`);
    return parts.join(" ");
  }

  dispose() {
    this.el.remove();
  }
}
