interface TreeOpts {
  x: number;
  baseY: number;
  trunkH: number;
  canopyR: number;
  trunkColor: string;
  canopyColor: string;
}

function drawTree(ctx: CanvasRenderingContext2D, opts: TreeOpts) {
  const { x, baseY, trunkH, canopyR, trunkColor, canopyColor } = opts;

  ctx.fillStyle = trunkColor;
  ctx.fillRect(x - 4, baseY - trunkH, 8, trunkH);

  ctx.fillStyle = canopyColor;
  ctx.beginPath();
  ctx.arc(x, baseY - trunkH, canopyR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - canopyR * 0.5, baseY - trunkH + canopyR * 0.3, canopyR * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + canopyR * 0.5, baseY - trunkH + canopyR * 0.3, canopyR * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(x - 2, baseY - trunkH - canopyR * 0.2, canopyR * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

export type ChapterTheme = "forest" | "thunder" | "mirror" | "shadow" | "temple";

interface ThemeConfig {
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  treeColors: { trunk: string; canopy: string }[];
  fogColor: string;
  particleColor: string;
}

const THEMES: Record<ChapterTheme, ThemeConfig> = {
  forest: {
    skyTop: "#1a2a3a",
    skyBottom: "#2a4a3a",
    groundTop: "#2a3a22",
    groundBottom: "#1a2a14",
    treeColors: [
      { trunk: "#3a2a1a", canopy: "#2a6a2a" },
      { trunk: "#4a3a2a", canopy: "#3a8a3a" },
      { trunk: "#332211", canopy: "#226622" },
    ],
    fogColor: "rgba(100,160,100,0.08)",
    particleColor: "#88cc88",
  },
  thunder: {
    skyTop: "#0a0a2a",
    skyBottom: "#2a2a4a",
    groundTop: "#3a3a44",
    groundBottom: "#2a2a33",
    treeColors: [
      { trunk: "#444444", canopy: "#4a4a6a" },
      { trunk: "#555555", canopy: "#5a5a7a" },
    ],
    fogColor: "rgba(100,100,180,0.1)",
    particleColor: "#aaaaff",
  },
  mirror: {
    skyTop: "#0a2a4a",
    skyBottom: "#1a4a6a",
    groundTop: "#1a3a5a",
    groundBottom: "#0a2a4a",
    treeColors: [
      { trunk: "#2a4a6a", canopy: "#4a8aaa" },
      { trunk: "#3a5a7a", canopy: "#5a9abb" },
    ],
    fogColor: "rgba(100,180,220,0.1)",
    particleColor: "#88ccff",
  },
  shadow: {
    skyTop: "#0a0a0a",
    skyBottom: "#1a1a2a",
    groundTop: "#1a1a22",
    groundBottom: "#0a0a14",
    treeColors: [
      { trunk: "#1a1a1a", canopy: "#2a2a3a" },
      { trunk: "#222222", canopy: "#3a3a4a" },
    ],
    fogColor: "rgba(60,40,80,0.12)",
    particleColor: "#8866aa",
  },
  temple: {
    skyTop: "#1a0a2a",
    skyBottom: "#2a1a4a",
    groundTop: "#2a1a3a",
    groundBottom: "#1a0a2a",
    treeColors: [
      { trunk: "#4a3a2a", canopy: "#6a4a8a" },
      { trunk: "#5a4a3a", canopy: "#7a5a9a" },
    ],
    fogColor: "rgba(120,80,160,0.1)",
    particleColor: "#bb88ff",
  },
};

export function drawBattleBackground(width: number, height: number, theme: ChapterTheme, seed = 42): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const cfg = THEMES[theme];

  const rng = seededRng(seed);

  // sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
  skyGrad.addColorStop(0, cfg.skyTop);
  skyGrad.addColorStop(1, cfg.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.65);

  // stars (for dark themes)
  if (theme === "shadow" || theme === "temple" || theme === "thunder") {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 30; i++) {
      const sx = rng() * width;
      const sy = rng() * height * 0.4;
      const sr = 0.5 + rng() * 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // distant mountains/hills
  ctx.fillStyle = cfg.groundTop;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.55);
  for (let x = 0; x <= width; x += 40) {
    const hill = Math.sin(x * 0.008 + seed) * 30 + Math.sin(x * 0.015) * 15;
    ctx.lineTo(x, height * 0.55 + hill);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // ground
  const groundGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
  groundGrad.addColorStop(0, cfg.groundTop);
  groundGrad.addColorStop(1, cfg.groundBottom);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.65, width, height * 0.35);

  // ground texture lines
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const ly = height * 0.7 + i * (height * 0.035);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(width, ly + (rng() - 0.5) * 4);
    ctx.stroke();
  }

  // back trees (smaller, darker)
  for (let i = 0; i < 6; i++) {
    const tc = cfg.treeColors[Math.floor(rng() * cfg.treeColors.length)];
    drawTree(ctx, {
      x: rng() * width,
      baseY: height * 0.58 + rng() * 20,
      trunkH: 20 + rng() * 15,
      canopyR: 14 + rng() * 10,
      trunkColor: tc.trunk,
      canopyColor: tc.canopy,
    });
  }

  // fog layer
  ctx.fillStyle = cfg.fogColor;
  ctx.fillRect(0, height * 0.5, width, height * 0.2);

  // front trees (larger)
  const leftTree = cfg.treeColors[0];
  drawTree(ctx, { x: 40, baseY: height * 0.72, trunkH: 50, canopyR: 28, trunkColor: leftTree.trunk, canopyColor: leftTree.canopy });
  const rightTree = cfg.treeColors[cfg.treeColors.length - 1];
  drawTree(ctx, { x: width - 40, baseY: height * 0.72, trunkH: 45, canopyR: 25, trunkColor: rightTree.trunk, canopyColor: rightTree.canopy });

  // vignette
  const vigGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.7);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // battle platform indicator
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(width * 0.25, height * 0.78, width * 0.15, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(width * 0.75, height * 0.78, width * 0.15, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

export function getThemeForChapter(chapter: number): ChapterTheme {
  const themes: ChapterTheme[] = ["forest", "thunder", "mirror", "shadow", "temple"];
  return themes[Math.min(chapter - 1, themes.length - 1)];
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
