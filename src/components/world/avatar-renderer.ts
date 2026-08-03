"use client";

/**
 * MANAHAD — Avatar Renderer
 *
 * Renders an avatar (player or NPC) using simple shapes on a canvas context.
 * The avatar is composed of:
 *   - body (outfit color)
 *   - head (skin tone)
 *   - hair
 *   - hat (optional)
 *   - accessory (glasses etc, optional)
 *   - shoes
 *   - backpack (drawn behind body, optional)
 *   - pet (drawn next to avatar, optional)
 *   - trail (motion trail, optional)
 *   - emote (floating emoji, optional)
 *
 * This is intentionally simple — no sprite loading needed, fully procedural.
 */

import type { AvatarConfig } from "@/lib/types";

interface RenderOpts {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size?: number; // height in pixels (default 40)
  direction?: "up" | "down" | "left" | "right";
  isMoving?: boolean;
  animFrame?: number; // for walk cycle
  displayName?: string;
  showName?: boolean;
  isSelected?: boolean;
  emote?: string | null; // emoji to float above
  config?: AvatarConfig;
}

const COSMETIC_COLORS: Record<string, string> = {
  "hair-short": "#3a2a1a",
  "hair-long": "#3a2a1a",
  "hair-curls": "#3a2a1a",
  "hair-spiky": "#1a1a1a",
  "hair-rainbow": "rainbow",
  "hat-none": "transparent",
  "hat-cap": "#1e3a8a",
  "hat-wizard": "#581c87",
  "hat-crown": "#fbbf24",
  "hat-party": "#ec4899",
  "hat-graduation": "#1f2937",
  "outfit-default": "#3b82f6",
  "outfit-superhero": "#dc2626",
  "outfit-astronaut": "#f3f4f6",
  "outfit-ninja": "#1f2937",
  "outfit-chef": "#ffffff",
  "acc-none": "transparent",
  "acc-glasses": "#1f2937",
  "acc-sunglasses": "#111827",
  "acc-wings": "#fef3c7",
  "shoes-default": "#1f2937",
  "shoes-boots": "#78350f",
  "shoes-lightning": "#fbbf24",
  "bp-none": "transparent",
  "bp-school": "#dc2626",
  "bp-rocket": "#6366f1",
  "bp-jetpack": "#06b6d4",
  "pet-none": "transparent",
  "pet-cat": "#f97316",
  "pet-dog": "#a16207",
  "pet-dragon": "#16a34a",
  "pet-unicorn": "#ec4899",
  "pet-robot": "#64748b",
  "trail-none": "transparent",
  "trail-sparkles": "#fbbf24",
  "trail-fire": "#ef4444",
  "trail-rainbow": "rainbow",
};

const COSMETIC_EMOJIS: Record<string, string> = {
  "pet-cat": "🐱",
  "pet-dog": "🐶",
  "pet-dragon": "🐉",
  "pet-unicorn": "🦄",
  "pet-robot": "🤖",
  "hat-wizard": "🧙",
  "hat-crown": "👑",
  "hat-party": "🥳",
  "hat-graduation": "🎓",
  "hat-cap": "🧢",
  "bp-rocket": "🚀",
  "bp-jetpack": "🚀",
  "bp-school": "🎒",
  "acc-wings": "😇",
  "outfit-superhero": "🦸",
  "outfit-astronaut": "👨‍🚀",
  "outfit-ninja": "🥷",
  "outfit-chef": "👨‍🍳",
};

export function renderAvatar(opts: RenderOpts) {
  const { ctx, x, y, size = 40, direction = "down", isMoving = false, animFrame = 0 } = opts;
  const config = opts.config ?? ({} as AvatarConfig);

  const skinTone = config.skinTone ?? "#fbcfa0";
  const outfitColor = COSMETIC_COLORS[config.outfit ?? "outfit-default"] ?? "#3b82f6";
  const hairColor = COSMETIC_COLORS[config.hair ?? "hair-short"] ?? "#3a2a1a";
  const hatColor = COSMETIC_COLORS[config.hat ?? "hat-none"] ?? "transparent";
  const accessoryColor = COSMETIC_COLORS[config.accessory ?? "acc-none"] ?? "transparent";
  const shoesColor = COSMETIC_COLORS[config.shoes ?? "shoes-default"] ?? "#1f2937";
  const backpackColor = COSMETIC_COLORS[config.backpack ?? "bp-none"] ?? "transparent";
  const petColor = COSMETIC_COLORS[config.pet ?? "pet-none"] ?? "transparent";
  const trailColor = COSMETIC_COLORS[config.trail ?? "trail-none"] ?? "transparent";

  // Walk cycle: leg offset
  const legOffset = isMoving ? Math.sin(animFrame * 0.4) * 2 : 0;
  const bodyBob = isMoving ? Math.abs(Math.sin(animFrame * 0.4)) * 1.5 : 0;

  ctx.save();
  ctx.translate(x, y - bodyBob);

  // === Trail (behind) ===
  if (trailColor !== "transparent") {
    ctx.globalAlpha = 0.4;
    if (trailColor === "rainbow") {
      const grad = ctx.createLinearGradient(-size * 0.6, 0, 0, 0);
      grad.addColorStop(0, "#ff0000");
      grad.addColorStop(0.2, "#ff7f00");
      grad.addColorStop(0.4, "#ffff00");
      grad.addColorStop(0.6, "#00ff00");
      grad.addColorStop(0.8, "#0000ff");
      grad.addColorStop(1, "#9400d3");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = trailColor;
    }
    ctx.beginPath();
    ctx.ellipse(-size * 0.3, size * 0.4, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // === Backpack (behind body) ===
  if (backpackColor !== "transparent") {
    ctx.fillStyle = backpackColor;
    ctx.beginPath();
    ctx.roundRect(-size * 0.45, -size * 0.05, size * 0.18, size * 0.35, size * 0.05);
    ctx.fill();
  }

  // === Shadow ===
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.45, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // === Legs / shoes ===
  ctx.fillStyle = shoesColor;
  ctx.beginPath();
  ctx.roundRect(-size * 0.18, size * 0.18 + legOffset, size * 0.14, size * 0.2, size * 0.04);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.04, size * 0.18 - legOffset, size * 0.14, size * 0.2, size * 0.04);
  ctx.fill();

  // === Body (outfit) ===
  ctx.fillStyle = outfitColor;
  ctx.beginPath();
  ctx.roundRect(-size * 0.22, -size * 0.1, size * 0.44, size * 0.35, size * 0.08);
  ctx.fill();

  // Outfit emoji decoration
  const outfitEmoji = COSMETIC_EMOJIS[config.outfit ?? ""];
  if (outfitEmoji && direction === "down") {
    ctx.font = `${size * 0.18}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(outfitEmoji, 0, size * 0.05);
  }

  // === Arms ===
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.roundRect(-size * 0.3, -size * 0.05, size * 0.1, size * 0.22, size * 0.05);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(size * 0.2, -size * 0.05, size * 0.1, size * 0.22, size * 0.05);
  ctx.fill();

  // === Head ===
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(0, -size * 0.25, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // === Hair ===
  if (direction !== "up") {
    ctx.fillStyle = hairColor === "rainbow" ? "#3a2a1a" : hairColor;
    ctx.beginPath();
    if (config.hair === "hair-long") {
      ctx.arc(0, -size * 0.28, size * 0.22, Math.PI, Math.PI * 2);
      ctx.fillRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.3);
    } else if (config.hair === "hair-spiky") {
      ctx.moveTo(-size * 0.2, -size * 0.25);
      ctx.lineTo(-size * 0.15, -size * 0.5);
      ctx.lineTo(-size * 0.08, -size * 0.3);
      ctx.lineTo(0, -size * 0.5);
      ctx.lineTo(size * 0.08, -size * 0.3);
      ctx.lineTo(size * 0.15, -size * 0.5);
      ctx.lineTo(size * 0.2, -size * 0.25);
      ctx.closePath();
    } else {
      ctx.arc(0, -size * 0.28, size * 0.21, Math.PI, Math.PI * 2);
    }
    ctx.fill();
  }

  // === Face (only when facing down or sideways) ===
  if (direction !== "up") {
    ctx.fillStyle = "#1a1a1a";
    if (direction === "down") {
      // Eyes
      ctx.beginPath();
      ctx.arc(-size * 0.06, -size * 0.25, size * 0.025, 0, Math.PI * 2);
      ctx.arc(size * 0.06, -size * 0.25, size * 0.025, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = size * 0.015;
      ctx.beginPath();
      ctx.arc(0, -size * 0.21, size * 0.04, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (direction === "left") {
      ctx.beginPath();
      ctx.arc(-size * 0.1, -size * 0.25, size * 0.025, 0, Math.PI * 2);
      ctx.fill();
    } else if (direction === "right") {
      ctx.beginPath();
      ctx.arc(size * 0.1, -size * 0.25, size * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === Accessory (glasses etc) ===
  if (accessoryColor !== "transparent" && direction === "down") {
    ctx.strokeStyle = accessoryColor;
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.arc(-size * 0.06, -size * 0.25, size * 0.05, 0, Math.PI * 2);
    ctx.arc(size * 0.06, -size * 0.25, size * 0.05, 0, Math.PI * 2);
    ctx.moveTo(-size * 0.01, -size * 0.25);
    ctx.lineTo(size * 0.01, -size * 0.25);
    ctx.stroke();
  }

  // === Hat ===
  if (hatColor !== "transparent") {
    ctx.fillStyle = hatColor;
    if (config.hat === "hat-crown") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.18, -size * 0.42);
      ctx.lineTo(-size * 0.18, -size * 0.55);
      ctx.lineTo(-size * 0.09, -size * 0.48);
      ctx.lineTo(0, -size * 0.58);
      ctx.lineTo(size * 0.09, -size * 0.48);
      ctx.lineTo(size * 0.18, -size * 0.55);
      ctx.lineTo(size * 0.18, -size * 0.42);
      ctx.closePath();
      ctx.fill();
      // Jewel
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, -size * 0.5, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    } else if (config.hat === "hat-wizard") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.25, -size * 0.4);
      ctx.lineTo(0, -size * 0.7);
      ctx.lineTo(size * 0.25, -size * 0.4);
      ctx.closePath();
      ctx.fill();
      // Brim
      ctx.fillRect(-size * 0.3, -size * 0.42, size * 0.6, size * 0.04);
    } else if (config.hat === "hat-cap") {
      ctx.beginPath();
      ctx.arc(0, -size * 0.4, size * 0.2, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-size * 0.2, -size * 0.42, size * 0.4, size * 0.04);
      // Brim
      ctx.fillRect(size * 0.05, -size * 0.4, size * 0.2, size * 0.04);
    } else if (config.hat === "hat-party") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, -size * 0.4);
      ctx.lineTo(0, -size * 0.65);
      ctx.lineTo(size * 0.15, -size * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (config.hat === "hat-graduation") {
      ctx.fillRect(-size * 0.22, -size * 0.45, size * 0.44, size * 0.05);
      ctx.beginPath();
      ctx.moveTo(-size * 0.25, -size * 0.42);
      ctx.lineTo(0, -size * 0.55);
      ctx.lineTo(size * 0.25, -size * 0.42);
      ctx.closePath();
      ctx.fill();
    }
  }

  // === Pet (next to avatar) ===
  if (petColor !== "transparent") {
    const petEmoji = COSMETIC_EMOJIS[config.pet ?? ""];
    if (petEmoji) {
      ctx.font = `${size * 0.4}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Bob with avatar movement
      const petBob = isMoving ? Math.sin(animFrame * 0.4 + 1) * 2 : 0;
      ctx.fillText(petEmoji, size * 0.4, size * 0.25 + petBob);
    }
  }

  // === Display name ===
  if (opts.showName && opts.displayName) {
    ctx.font = "500 9px var(--font-geist-sans), sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const nameY = -size * 0.55;
    // Background pill
    const nameWidth = ctx.measureText(opts.displayName).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(-nameWidth / 2 - 6, nameY - 14, nameWidth + 12, 16, 8);
    ctx.fill();
    // Text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(opts.displayName, 0, nameY);
  }

  // === Selection ring ===
  if (opts.isSelected) {
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.45, size * 0.35, size * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // === Emote (floating emoji) ===
  if (opts.emote) {
    const floatY = -size * 0.7 - (animFrame % 20);
    ctx.font = `${size * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = Math.max(0, 1 - (animFrame % 60) / 60);
    ctx.fillText(opts.emote, 0, floatY);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
