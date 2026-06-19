import type { HeroInstance, HeroTemplate } from "../../shared/types";
import { HERO_TEMPLATES } from "../../shared/heroes";

const MAX_HUNT_HEROES = 15;

const RARITY_COLORS: Record<string, string> = {
  legendary: "#ffd700", epic: "#aa44ff", rare: "#4488ff",
  uncommon: "#44bb44", common: "#888",
};
const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
const ELEMENT_EMOJI: Record<string, string> = { fire: "\u{1F525}", water: "\u{1F4A7}", earth: "\u{1F33F}", light: "⚡", dark: "\u{1F311}" };

const PORTRAITS: Record<string, string> = {
  "zero-void": "/assets/characters/mr0-zero.png",
  "one-thunder": "/assets/characters/mr1-thunder.png",
  "two-crystal": "/assets/characters/ms2-crystal.png",
  "three-bloom": "/assets/characters/ms3-creative.png",
  "four-aegis": "/assets/characters/mr4-wellness.png",
  "aria-flameblade": "/assets/characters/aria-flame.png",
  "luna-tideweaver": "/assets/characters/luna-tide.png",
  "kael-stoneguard": "/assets/characters/kael-stone.png",
  "nyx-shadowstep": "/assets/characters/nyx-shadow.png",
  "sol-lightbringer": "/assets/characters/sol-dawn.png",
  "frost-whisper": "/assets/characters/frost-whisper.png",
  "ember-phoenix": "/assets/characters/ember-phoenix.png",
};

function getTmpl(h: HeroInstance): HeroTemplate | undefined {
  return HERO_TEMPLATES.find(t => t.id === h.templateId);
}

function makePortraitEl(tmpl: HeroTemplate, size: number): HTMLElement {
  const url = PORTRAITS[tmpl.id];
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;background:rgba(10,5,20,0.6);`;
    img.onerror = () => { img.style.display = "none"; };
    return img;
  }
  const div = document.createElement("div");
  div.style.cssText = `width:${size}px;height:${size}px;border-radius:8px;background:#${tmpl.modelColor.toString(16).padStart(6,"0")};display:flex;align-items:center;justify-content:center;font-size:${size/2}px;`;
  div.textContent = ELEMENT_EMOJI[tmpl.element] ?? "✨";
  return div;
}

export interface HuntSelectResult {
  heroIds: string[];
}

export function showHuntSelect(
  container: HTMLElement,
  heroes: HeroInstance[],
  onConfirm: (selected: string[]) => void,
  onCancel: () => void,
): void {
  container.innerHTML = "";

  const selected = new Set<string>();
  const sorted = [...heroes]
    .map(h => ({ hero: h, tmpl: getTmpl(h) }))
    .filter(h => h.tmpl)
    .sort((a, b) => {
      const rA = RARITY_ORDER.indexOf(a.tmpl!.rarity);
      const rB = RARITY_ORDER.indexOf(b.tmpl!.rarity);
      if (rA !== rB) return rA - rB;
      return b.hero.level - a.hero.level;
    });

  const screen = document.createElement("div");
  screen.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;background:radial-gradient(ellipse at center,#1a0a3a 0%,#0a0a1a 100%);font-family:'Segoe UI',sans-serif;color:#fff;";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #2a1a4a40;flex-shrink:0;";
  const title = document.createElement("h2");
  title.style.cssText = "margin:0;color:#ffd700;font-size:20px;";
  title.textContent = "\u{1F4A3} Deploy Heroes";
  header.appendChild(title);
  const counter = document.createElement("span");
  counter.style.cssText = "color:#aaa;font-size:14px;";
  header.appendChild(counter);
  screen.appendChild(header);

  const selectedBar = document.createElement("div");
  selectedBar.style.cssText = "display:flex;gap:6px;padding:12px 24px;min-height:72px;align-items:center;background:rgba(20,10,40,0.3);border-bottom:1px solid #2a1a4a40;flex-shrink:0;overflow-x:auto;";
  screen.appendChild(selectedBar);

  const rosterWrap = document.createElement("div");
  rosterWrap.style.cssText = "flex:1;overflow-y:auto;padding:16px 24px;";
  const rosterGrid = document.createElement("div");
  rosterGrid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;";
  rosterWrap.appendChild(rosterGrid);
  screen.appendChild(rosterWrap);

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;justify-content:center;gap:16px;padding:14px 24px;border-top:1px solid #2a1a4a40;flex-shrink:0;";
  const cancelBtn = makeBtn("← Menu", "#666", onCancel);
  footer.appendChild(cancelBtn);

  const selectAllBtn = makeBtn("Select All", "#4488ff", () => {
    if (selected.size === sorted.length || selected.size >= MAX_HUNT_HEROES) {
      selected.clear();
    } else {
      selected.clear();
      for (let i = 0; i < Math.min(sorted.length, MAX_HUNT_HEROES); i++) {
        selected.add(sorted[i].hero.instanceId);
      }
    }
    render();
  });
  footer.appendChild(selectAllBtn);

  const confirmBtn = makeBtn(`Deploy! \u{1F4A3}`, "#ffd700", () => {
    if (selected.size > 0) onConfirm([...selected]);
  });
  footer.appendChild(confirmBtn);
  screen.appendChild(footer);

  container.appendChild(screen);

  function render() {
    counter.textContent = `${selected.size} / ${MAX_HUNT_HEROES}`;

    selectedBar.innerHTML = "";
    if (selected.size === 0) {
      const hint = document.createElement("div");
      hint.style.cssText = "color:#555;font-size:13px;width:100%;text-align:center;";
      hint.textContent = "Click heroes to deploy (max 15)";
      selectedBar.appendChild(hint);
    } else {
      for (const id of selected) {
        const entry = sorted.find(s => s.hero.instanceId === id);
        if (!entry) continue;
        const mini = document.createElement("div");
        const color = RARITY_COLORS[entry.tmpl!.rarity] ?? "#888";
        mini.style.cssText = `width:52px;height:52px;border-radius:8px;border:2px solid ${color};overflow:hidden;cursor:pointer;flex-shrink:0;position:relative;`;
        mini.appendChild(makePortraitEl(entry.tmpl!, 48));
        const lvl = document.createElement("div");
        lvl.style.cssText = "position:absolute;bottom:0;left:0;width:100%;text-align:center;font-size:9px;background:rgba(0,0,0,0.7);color:#fff;padding:1px;";
        lvl.textContent = `Lv.${entry.hero.level}`;
        mini.appendChild(lvl);
        mini.addEventListener("click", () => { selected.delete(id); render(); });
        selectedBar.appendChild(mini);
      }
    }

    rosterGrid.innerHTML = "";
    let lastRarity = "";
    for (const { hero, tmpl } of sorted) {
      if (!tmpl) continue;
      const color = RARITY_COLORS[tmpl.rarity] ?? "#888";

      if (tmpl.rarity !== lastRarity) {
        lastRarity = tmpl.rarity;
        const label = document.createElement("div");
        label.style.cssText = `grid-column:1/-1;color:${color};font-size:12px;font-weight:bold;padding:8px 0 2px;border-bottom:1px solid ${color}30;text-transform:uppercase;`;
        const count = sorted.filter(s => s.tmpl!.rarity === tmpl.rarity).length;
        label.textContent = `${tmpl.rarity} (${count})`;
        rosterGrid.appendChild(label);
      }

      const isSel = selected.has(hero.instanceId);
      const card = document.createElement("div");
      card.style.cssText = `padding:8px;border-radius:8px;cursor:pointer;text-align:center;transition:transform 0.12s,box-shadow 0.12s;background:${isSel ? `rgba(255,215,0,0.12)` : "rgba(20,10,40,0.6)"};border:2px solid ${isSel ? color : color + "60"};${isSel ? `box-shadow:0 0 10px ${color}40;` : ""}`;

      const portraitWrap = document.createElement("div");
      portraitWrap.style.cssText = "display:flex;justify-content:center;margin-bottom:4px;";
      portraitWrap.appendChild(makePortraitEl(tmpl, 56));
      card.appendChild(portraitWrap);

      const name = document.createElement("div");
      name.style.cssText = `font-size:11px;color:${color};font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      name.textContent = tmpl.name;
      card.appendChild(name);

      const meta = document.createElement("div");
      meta.style.cssText = "font-size:10px;color:#aaa;";
      meta.textContent = `Lv.${hero.level} ${ELEMENT_EMOJI[tmpl.element] ?? ""} ${tmpl.heroClass}`;
      card.appendChild(meta);

      if (isSel) {
        const badge = document.createElement("div");
        badge.style.cssText = "font-size:9px;color:#44ff88;margin-top:2px;";
        badge.textContent = "✅ Deployed";
        card.appendChild(badge);
      }

      card.addEventListener("mouseenter", () => { card.style.transform = "scale(1.04)"; });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
      card.addEventListener("click", () => {
        if (isSel) {
          selected.delete(hero.instanceId);
        } else if (selected.size < MAX_HUNT_HEROES) {
          selected.add(hero.instanceId);
        }
        render();
      });

      rosterGrid.appendChild(card);
    }

    confirmBtn.style.opacity = selected.size > 0 ? "1" : "0.4";
    (confirmBtn as HTMLButtonElement).disabled = selected.size === 0;
    selectAllBtn.textContent = selected.size >= Math.min(sorted.length, MAX_HUNT_HEROES) ? "Deselect All" : "Select All";
  }

  render();
}

function makeBtn(text: string, color: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  const isGold = color === "#ffd700";
  btn.style.cssText = `padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;border-radius:8px;background:${isGold ? "linear-gradient(135deg,#ffd700,#ff8c00)" : "rgba(40,30,60,0.8)"};border:1px solid ${color};color:${isGold ? "#1a0a00" : color};transition:transform 0.15s;`;
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; });
  btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  return btn;
}
