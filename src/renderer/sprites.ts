import type { HeroClass, Element, Rarity } from "../shared/types";

const ELEMENT_COLORS: Record<Element, { primary: string; glow: string }> = {
  fire:  { primary: "#ff4422", glow: "#ff8844" },
  water: { primary: "#4488ff", glow: "#66bbff" },
  earth: { primary: "#44aa44", glow: "#88cc66" },
  light: { primary: "#ffdd44", glow: "#ffee88" },
  dark:  { primary: "#8844cc", glow: "#aa66ff" },
};

const RARITY_BORDERS: Record<Rarity, string> = {
  common: "#888888",
  uncommon: "#44bb44",
  rare: "#4488ff",
  epic: "#aa44ff",
  legendary: "#ffaa00",
};

const WEAPON_SHAPES: Record<HeroClass, (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => void> = {
  warrior: (ctx, x, y, color) => {
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(x + 2, y - 20, 3, 24);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 20);
    ctx.lineTo(x + 8, y - 20);
    ctx.lineTo(x + 3, y - 28);
    ctx.closePath();
    ctx.fill();
  },
  mage: (ctx, x, y, color) => {
    ctx.fillStyle = "#aa8855";
    ctx.fillRect(x + 2, y - 22, 2, 26);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 3, y - 25, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + 3, y - 25, 2, 0, Math.PI * 2);
    ctx.fill();
  },
  archer: (ctx, x, y, color) => {
    ctx.strokeStyle = "#aa8855";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 4, y - 10, 14, -0.8, 0.8);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 23);
    ctx.lineTo(x + 4, y + 3);
    ctx.stroke();
  },
  healer: (ctx, x, y, color) => {
    ctx.fillStyle = "#aa8855";
    ctx.fillRect(x + 2, y - 20, 2, 24);
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, y - 24, 10, 3);
    ctx.fillRect(x + 1, y - 28, 4, 10);
  },
  tank: (ctx, x, y, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - 4, y - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dddddd";
    ctx.beginPath();
    ctx.arc(x - 4, y - 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - 4, y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
  },
};

interface SpriteOpts {
  heroClass: HeroClass;
  element: Element;
  rarity: Rarity;
  modelColor?: number;
  size?: number;
}

export function drawChibiSprite(opts: SpriteOpts): HTMLCanvasElement {
  const sz = opts.size ?? 96;
  const canvas = document.createElement("canvas");
  canvas.width = sz;
  canvas.height = sz;
  const ctx = canvas.getContext("2d")!;

  const cx = sz / 2;
  const headR = sz * 0.22;
  const bodyTop = sz * 0.44;
  const bodyH = sz * 0.28;
  const legH = sz * 0.14;

  const elem = ELEMENT_COLORS[opts.element];
  const bodyColor = opts.modelColor ? `#${opts.modelColor.toString(16).padStart(6, "0")}` : elem.primary;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(cx, sz * 0.92, sz * 0.2, sz * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = "#554433";
  ctx.fillRect(cx - 10, bodyTop + bodyH, 7, legH);
  ctx.fillRect(cx + 3, bodyTop + bodyH, 7, legH);
  // boots
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - 12, bodyTop + bodyH + legH - 4, 10, 5);
  ctx.fillRect(cx + 2, bodyTop + bodyH + legH - 4, 10, 5);

  // body
  ctx.fillStyle = bodyColor;
  roundRect(ctx, cx - 14, bodyTop, 28, bodyH, 6);
  ctx.fill();
  // body highlight
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, cx - 10, bodyTop + 3, 10, bodyH - 8, 3);
  ctx.fill();

  // arms
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - 20, bodyTop + 4, 8, bodyH * 0.7);
  ctx.fillRect(cx + 12, bodyTop + 4, 8, bodyH * 0.7);

  // weapon (right hand)
  WEAPON_SHAPES[opts.heroClass](ctx, cx + 14, bodyTop + bodyH * 0.5, elem.primary);

  // head
  ctx.fillStyle = "#ffe0c0";
  ctx.beginPath();
  ctx.arc(cx, sz * 0.24, headR, 0, Math.PI * 2);
  ctx.fill();

  // hair (element-colored)
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(cx, sz * 0.2, headR * 1.05, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - headR * 0.9, sz * 0.15, headR * 0.3, headR * 0.8);
  ctx.fillRect(cx + headR * 0.6, sz * 0.15, headR * 0.3, headR * 0.8);

  // eyes
  ctx.fillStyle = "#222222";
  const eyeY = sz * 0.25;
  ctx.beginPath();
  ctx.ellipse(cx - 6, eyeY, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 6, eyeY, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // eye highlights
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx - 5, eyeY - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7, eyeY - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // mouth
  ctx.strokeStyle = "#aa6644";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, sz * 0.30, 3, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // element gem on forehead
  ctx.fillStyle = elem.glow;
  ctx.beginPath();
  ctx.arc(cx, sz * 0.14, 3, 0, Math.PI * 2);
  ctx.fill();

  // rarity border glow
  ctx.strokeStyle = RARITY_BORDERS[opts.rarity];
  ctx.lineWidth = 2;
  ctx.shadowColor = RARITY_BORDERS[opts.rarity];
  ctx.shadowBlur = opts.rarity === "legendary" ? 12 : opts.rarity === "epic" ? 8 : 0;
  ctx.strokeRect(1, 1, sz - 2, sz - 2);
  ctx.shadowBlur = 0;

  return canvas;
}

export interface AnimationFrame {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

export function getIdleFrame(tick: number): AnimationFrame {
  const t = (tick % 60) / 60;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  return { offsetX: 0, offsetY: breathe, scaleX: 1, scaleY: 1 };
}

export function getAttackFrame(progress: number, facingRight: boolean): AnimationFrame {
  const dir = facingRight ? 1 : -1;
  let offsetX = 0;
  let scaleX = 1;

  if (progress < 0.3) {
    offsetX = (progress / 0.3) * 30 * dir;
  } else if (progress < 0.5) {
    offsetX = 30 * dir;
    scaleX = 1 + (progress - 0.3) / 0.2 * 0.15;
  } else {
    const ret = (progress - 0.5) / 0.5;
    offsetX = 30 * dir * (1 - ret);
    scaleX = 1 + 0.15 * (1 - ret);
  }

  return { offsetX, offsetY: 0, scaleX, scaleY: 1 };
}

export function getHitFrame(progress: number): AnimationFrame {
  const shake = Math.sin(progress * Math.PI * 6) * 4 * (1 - progress);
  const flash = progress < 0.15 ? 1 : 0;
  return { offsetX: shake, offsetY: 0, scaleX: 1 + flash * 0.05, scaleY: 1 - flash * 0.05 };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export { ELEMENT_COLORS, RARITY_BORDERS };
