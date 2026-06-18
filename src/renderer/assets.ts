const CHARACTER_MAP: Record<string, string> = {
  "zero-void": "/assets/characters/mr0-zero.png",
  "one-thunder": "/assets/characters/mr1-thunder.png",
  "two-crystal": "/assets/characters/ms2-crystal.png",
  "three-bloom": "/assets/characters/ms3-creative.png",
  "four-aegis": "/assets/characters/mr4-wellness.png",
  "aria-flameblade": "/assets/characters/aria-flame.png",
  "luna-tideweaver": "/assets/characters/luna-tide.png",
  "kael-stoneguard": "/assets/characters/kael-stone.png",
  "nyx-shadowstep": "/assets/characters/nyx-shadow.png",
  "sol-lightbringer": "/assets/characters/sol-light.png",
};

const BG_MAP: Record<string, string> = {
  forest: "/assets/backgrounds/bg-forest.png",
  thunder: "/assets/backgrounds/bg-thunder.png",
  mirror: "/assets/backgrounds/bg-mirror.png",
  shadow: "/assets/backgrounds/bg-shadow.png",
  temple: "/assets/backgrounds/bg-temple.png",
};

const imageCache = new Map<string, HTMLImageElement>();

export function getCharacterPortraitUrl(heroId: string): string {
  return CHARACTER_MAP[heroId] ?? "/assets/characters/mr0-zero.png";
}

export function getBattleBackgroundUrl(chapter: number): string {
  const themes = ["forest", "thunder", "mirror", "shadow", "temple"];
  const theme = themes[Math.min(chapter - 1, themes.length - 1)] ?? "forest";
  return BG_MAP[theme] ?? BG_MAP.forest;
}

export function preloadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

export async function preloadCharacters(heroIds: string[]): Promise<void> {
  const urls = heroIds.map(getCharacterPortraitUrl);
  await Promise.allSettled(urls.map(preloadImage));
}

export function createPortraitElement(
  heroId: string,
  size: number,
  opts?: { borderColor?: string; glow?: boolean },
): HTMLElement {
  const url = getCharacterPortraitUrl(heroId);
  const container = document.createElement("div");
  const border = opts?.borderColor ?? "#888";

  container.style.cssText = `
    width: ${size}px; height: ${size}px; border-radius: 12px; overflow: hidden;
    border: 2px solid ${border}; position: relative;
    ${opts?.glow ? `box-shadow: 0 0 15px ${border}40;` : ""}
  `;

  const img = document.createElement("img");
  img.src = url;
  img.style.cssText = `
    width: 100%; height: 100%; object-fit: cover; object-position: center top;
  `;
  img.alt = heroId;
  img.loading = "lazy";

  const fallback = document.createElement("div");
  fallback.style.cssText = `
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: rgba(20,10,40,0.8); font-size: ${size / 3}px;
  `;
  fallback.textContent = "🦸";

  img.onerror = () => {
    container.replaceChild(fallback, img);
  };

  container.appendChild(img);
  return container;
}

export const RARITY_COLORS: Record<string, string> = {
  common: "#888888",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffd700",
};
