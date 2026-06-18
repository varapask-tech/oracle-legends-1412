import type { HeroInstance } from "../../shared/types";
import { createHeroCard, getTemplate, computeStats } from "./hero-card";

export interface TeamSelectCallbacks {
  onConfirm: (team: string[]) => void;
  onCancel: () => void;
}

const MAX_TEAM_SIZE = 5;

let selectRoot: HTMLElement | null = null;

export function showTeamSelect(
  roster: HeroInstance[],
  currentTeam: string[],
  callbacks: TeamSelectCallbacks
): void {
  destroyTeamSelect();

  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  const selected = new Set(currentTeam);

  selectRoot = document.createElement("div");
  selectRoot.id = "team-select";
  selectRoot.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5, 2, 15, 0.95);
    display: flex; flex-direction: column;
    font-family: 'Segoe UI', sans-serif;
    pointer-events: auto;
  `;
  overlay.appendChild(selectRoot);

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #2a1a4a;
  `;

  const title = document.createElement("h2");
  title.style.cssText = "margin: 0; color: #ffd700; font-size: 20px;";
  title.textContent = "⚔️ Select Team";
  header.appendChild(title);

  const counter = document.createElement("span");
  counter.id = "team-counter";
  counter.style.cssText = "color: #aaa; font-size: 14px;";
  header.appendChild(counter);
  selectRoot.appendChild(header);

  const teamSlots = document.createElement("div");
  teamSlots.id = "team-slots";
  teamSlots.style.cssText = `
    display: flex; gap: 10px; padding: 16px 24px;
    justify-content: center; align-items: center;
    min-height: 140px;
    background: rgba(20, 10, 40, 0.5);
    border-bottom: 1px solid #2a1a4a;
  `;
  selectRoot.appendChild(teamSlots);

  const rosterArea = document.createElement("div");
  rosterArea.style.cssText = `
    flex: 1; overflow-y: auto; padding: 16px 24px;
  `;

  const rosterLabel = document.createElement("div");
  rosterLabel.style.cssText = "color: #888; font-size: 12px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;";
  rosterLabel.textContent = "Hero Roster";
  rosterArea.appendChild(rosterLabel);

  const rosterGrid = document.createElement("div");
  rosterGrid.id = "roster-grid";
  rosterGrid.style.cssText = `
    display: flex; flex-wrap: wrap; gap: 10px;
    justify-content: center;
  `;
  rosterArea.appendChild(rosterGrid);
  selectRoot.appendChild(rosterArea);

  const detailPanel = document.createElement("div");
  detailPanel.id = "hero-detail";
  detailPanel.style.cssText = `
    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
    width: 200px; background: rgba(20, 10, 40, 0.9);
    border: 1px solid #3a2a5a; border-radius: 10px;
    padding: 16px; display: none;
  `;
  selectRoot.appendChild(detailPanel);

  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex; justify-content: center; gap: 16px;
    padding: 16px 24px;
    border-top: 1px solid #2a1a4a;
  `;

  const cancelBtn = createButton("Cancel", "#666", () => {
    destroyTeamSelect();
    callbacks.onCancel();
  });
  footer.appendChild(cancelBtn);

  const confirmBtn = createButton("Confirm ⚔️", "#ffd700", () => {
    destroyTeamSelect();
    callbacks.onConfirm([...selected]);
  });
  confirmBtn.id = "confirm-btn";
  footer.appendChild(confirmBtn);
  selectRoot.appendChild(footer);

  function render() {
    teamSlots.innerHTML = "";
    for (let i = 0; i < MAX_TEAM_SIZE; i++) {
      const slotIds = [...selected];
      const heroId = slotIds[i];
      const hero = heroId ? roster.find((h) => h.instanceId === heroId) : undefined;

      if (hero) {
        const card = createHeroCard({
          instance: hero,
          compact: true,
          selected: true,
          onClick: (h) => {
            selected.delete(h.instanceId);
            render();
          },
        });
        teamSlots.appendChild(card);
      } else {
        const slot = document.createElement("div");
        slot.style.cssText = `
          width: 100px; height: 120px;
          border: 2px dashed #3a2a5a;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #3a2a5a; font-size: 24px;
        `;
        slot.textContent = "+";
        teamSlots.appendChild(slot);
      }
    }

    rosterGrid.innerHTML = "";
    const sorted = [...roster].sort((a, b) => {
      const tA = getTemplate(a);
      const tB = getTemplate(b);
      const rarityOrder = ["legendary", "epic", "rare", "uncommon", "common"];
      const rA = rarityOrder.indexOf(tA?.rarity ?? "common");
      const rB = rarityOrder.indexOf(tB?.rarity ?? "common");
      if (rA !== rB) return rA - rB;
      return b.level - a.level;
    });

    for (const hero of sorted) {
      const isSelected = selected.has(hero.instanceId);
      const card = createHeroCard({
        instance: hero,
        compact: false,
        selected: isSelected,
        onClick: (h) => {
          if (isSelected) {
            selected.delete(h.instanceId);
          } else if (selected.size < MAX_TEAM_SIZE) {
            selected.add(h.instanceId);
          }
          render();
        },
      });

      card.addEventListener("mouseenter", () => showDetail(hero));
      card.addEventListener("mouseleave", () => {
        detailPanel.style.display = "none";
      });

      rosterGrid.appendChild(card);
    }

    const counterEl = document.getElementById("team-counter");
    if (counterEl) counterEl.textContent = `${selected.size} / ${MAX_TEAM_SIZE}`;

    const confirmBtnEl = document.getElementById("confirm-btn") as HTMLButtonElement | null;
    if (confirmBtnEl) {
      const ready = selected.size > 0;
      confirmBtnEl.disabled = !ready;
      confirmBtnEl.style.opacity = ready ? "1" : "0.4";
      confirmBtnEl.style.cursor = ready ? "pointer" : "not-allowed";
    }
  }

  function showDetail(hero: HeroInstance) {
    const template = getTemplate(hero);
    if (!template) return;

    const stats = computeStats(template, hero.level);
    detailPanel.style.display = "block";
    detailPanel.innerHTML = `
      <div style="color:#ffd700; font-size:16px; font-weight:bold; margin-bottom:4px;">
        ${template.name}
      </div>
      <div style="color:#888; font-size:11px; margin-bottom:8px;">
        ${template.title}
      </div>
      <div style="color:#aaa; font-size:11px; margin-bottom:12px; line-height:1.4;">
        ${template.description}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px;">
        <div style="color:#888">HP</div><div style="color:#44cc44">${stats.hp}</div>
        <div style="color:#888">ATK</div><div style="color:#ff6644">${stats.atk}</div>
        <div style="color:#888">DEF</div><div style="color:#4488ff">${stats.def}</div>
        <div style="color:#888">SPD</div><div style="color:#ffaa00">${stats.spd}</div>
        <div style="color:#888">CRIT</div><div style="color:#ffd700">${stats.critRate}%</div>
        <div style="color:#888">C.DMG</div><div style="color:#ffd700">${stats.critDmg}%</div>
      </div>
      <div style="margin-top:12px; padding-top:8px; border-top:1px solid #2a1a4a;">
        <div style="color:#ffd700; font-size:11px; font-weight:bold; margin-bottom:4px;">
          ${template.skills[0]?.name ?? "—"}
        </div>
        <div style="color:#888; font-size:10px; line-height:1.3;">
          ${template.skills[0]?.description ?? ""}<br/>
          CD: ${template.skills[0]?.cooldown ?? 0}s · ${template.skills[0]?.damageMultiplier ?? 0}× DMG
        </div>
      </div>
    `;
  }

  render();
}

export function destroyTeamSelect(): void {
  selectRoot?.remove();
  selectRoot = null;
}

function createButton(text: string, color: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.style.cssText = `
    padding: 10px 32px; font-size: 14px; font-weight: bold;
    border: 1px solid ${color}; border-radius: 8px;
    cursor: pointer;
    background: ${color === "#ffd700" ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(40,30,60,0.8)"};
    color: ${color === "#ffd700" ? "#1a0a00" : color};
    transition: transform 0.15s, box-shadow 0.15s;
  `;
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.05)";
    btn.style.boxShadow = `0 2px 12px ${color}44`;
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "";
    btn.style.boxShadow = "";
  });
  return btn;
}
