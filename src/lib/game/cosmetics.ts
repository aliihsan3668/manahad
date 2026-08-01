/**
 * MathVerse — Cosmetics Catalog
 *
 * All cosmetic items available in MathVerse. Cosmetics NEVER give gameplay
 * advantages — they are purely visual (Roblox/Animal Crossing style).
 *
 * Categories: HAT | HAIR | OUTFIT | ACCESSORY | SHOES | BACKPACK | PET | TRAIL | EMOTE
 */

export interface CosmeticDef {
  slug: string;
  name: string;
  category: "HAT" | "HAIR" | "OUTFIT" | "ACCESSORY" | "SHOES" | "BACKPACK" | "PET" | "TRAIL" | "EMOTE";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  price: number; // in coins; 0 = free/default
  isDefault: boolean;
  color: string;
  unlockCriteria?: { type: "level" | "achievement" | "quest"; value: string };
  emoji: string;
  description: string;
}

export const COSMETICS: CosmeticDef[] = [
  // ===== HAIR (defaults) =====
  { slug: "hair-short", name: "Short Hair", category: "HAIR", rarity: "COMMON", price: 0, isDefault: true, color: "#3a2a1a", emoji: "💇", description: "A classic short cut." },
  { slug: "hair-long", name: "Long Hair", category: "HAIR", rarity: "COMMON", price: 50, isDefault: false, color: "#3a2a1a", emoji: "💇‍♀️", description: "Flowing locks of style." },
  { slug: "hair-curls", name: "Curly Hair", category: "HAIR", rarity: "COMMON", price: 80, isDefault: false, color: "#3a2a1a", emoji: "🦱", description: "Bouncy and beautiful curls." },
  { slug: "hair-spiky", name: "Spiky Hair", category: "HAIR", rarity: "RARE", price: 150, isDefault: false, color: "#3a2a1a", emoji: "🗡️", description: "Stand up and stand out!" },
  { slug: "hair-rainbow", name: "Rainbow Hair", category: "HAIR", rarity: "LEGENDARY", price: 500, isDefault: false, color: "linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)", emoji: "🌈", description: "All the colors of mastery!" },

  // ===== HATS =====
  { slug: "hat-none", name: "No Hat", category: "HAT", rarity: "COMMON", price: 0, isDefault: true, color: "transparent", emoji: "🚫", description: "Going natural." },
  { slug: "hat-cap", name: "Math Cap", category: "HAT", rarity: "COMMON", price: 100, isDefault: false, color: "#1e3a8a", emoji: "🧢", description: "A sporty baseball cap." },
  { slug: "hat-wizard", name: "Wizard Hat", category: "HAT", rarity: "EPIC", price: 300, isDefault: false, color: "#581c87", emoji: "🧙", description: "For the algebra wizards.", unlockCriteria: { type: "level", value: "5" } },
  { slug: "hat-crown", name: "Crown of Math", category: "HAT", rarity: "LEGENDARY", price: 1000, isDefault: false, color: "#fbbf24", emoji: "👑", description: "For true masters of numbers.", unlockCriteria: { type: "level", value: "10" } },
  { slug: "hat-party", name: "Party Hat", category: "HAT", rarity: "RARE", price: 200, isDefault: false, color: "#ec4899", emoji: "🥳", description: "Celebrate every victory!" },
  { slug: "hat-graduation", name: "Graduation Cap", category: "HAT", rarity: "EPIC", price: 400, isDefault: false, color: "#1f2937", emoji: "🎓", description: "For the scholars.", unlockCriteria: { type: "achievement", value: "first-lesson" } },

  // ===== OUTFITS =====
  { slug: "outfit-default", name: "Default Outfit", category: "OUTFIT", rarity: "COMMON", price: 0, isDefault: true, color: "#3b82f6", emoji: "👕", description: "Comfy and classic." },
  { slug: "outfit-superhero", name: "Superhero Suit", category: "OUTFIT", rarity: "EPIC", price: 350, isDefault: false, color: "#dc2626", emoji: "🦸", description: "Save the day with math!" },
  { slug: "outfit-astronaut", name: "Astronaut Suit", category: "OUTFIT", rarity: "LEGENDARY", price: 800, isDefault: false, color: "#f3f4f6", emoji: "👨‍🚀", description: "To infinity and beyond!", unlockCriteria: { type: "level", value: "8" } },
  { slug: "outfit-ninja", name: "Ninja Gear", category: "OUTFIT", rarity: "RARE", price: 250, isDefault: false, color: "#1f2937", emoji: "🥷", description: "Silent. Quick. Precise." },
  { slug: "outfit-chef", name: "Chef Uniform", category: "OUTFIT", rarity: "RARE", price: 220, isDefault: false, color: "#ffffff", emoji: "👨‍🍳", description: "Cooking up calculations!" },

  // ===== ACCESSORIES =====
  { slug: "acc-none", name: "No Accessory", category: "ACCESSORY", rarity: "COMMON", price: 0, isDefault: true, color: "transparent", emoji: "🚫", description: "Clean and simple." },
  { slug: "acc-glasses", name: "Smart Glasses", category: "ACCESSORY", rarity: "COMMON", price: 120, isDefault: false, color: "#1f2937", emoji: "👓", description: "Look smart, be smart." },
  { slug: "acc-sunglasses", name: "Cool Shades", category: "ACCESSORY", rarity: "RARE", price: 180, isDefault: false, color: "#111827", emoji: "🕶️", description: "Too cool for school." },
  { slug: "acc-wings", name: "Angel Wings", category: "ACCESSORY", rarity: "LEGENDARY", price: 600, isDefault: false, color: "#fef3c7", emoji: "😇", description: "Earned by master learners." },

  // ===== SHOES =====
  { slug: "shoes-default", name: "Default Shoes", category: "SHOES", rarity: "COMMON", price: 0, isDefault: true, color: "#1f2937", emoji: "👟", description: "Reliable and comfy." },
  { slug: "shoes-boots", name: "Adventure Boots", category: "SHOES", rarity: "RARE", price: 150, isDefault: false, color: "#78350f", emoji: "🥾", description: "For exploring the world." },
  { slug: "shoes-lightning", name: "Lightning Kicks", category: "SHOES", rarity: "EPIC", price: 320, isDefault: false, color: "#fbbf24", emoji: "⚡", description: "Zoom through Mathville!" },

  // ===== BACKPACKS =====
  { slug: "bp-none", name: "No Backpack", category: "BACKPACK", rarity: "COMMON", price: 0, isDefault: true, color: "transparent", emoji: "🚫", description: "Travel light." },
  { slug: "bp-school", name: "School Backpack", category: "BACKPACK", rarity: "COMMON", price: 100, isDefault: false, color: "#dc2626", emoji: "🎒", description: "Carry your knowledge." },
  { slug: "bp-rocket", name: "Rocket Pack", category: "BACKPACK", rarity: "EPIC", price: 380, isDefault: false, color: "#6366f1", emoji: "🚀", description: "Blast off to learning!" },
  { slug: "bp-jetpack", name: "Jet Pack", category: "BACKPACK", rarity: "LEGENDARY", price: 700, isDefault: false, color: "#06b6d4", emoji: "🚀", description: "Earned by math champions." },

  // ===== PETS =====
  { slug: "pet-none", name: "No Pet", category: "PET", rarity: "COMMON", price: 0, isDefault: true, color: "transparent", emoji: "🚫", description: "Solo adventurer." },
  { slug: "pet-cat", name: "Calculus Cat", category: "PET", rarity: "RARE", price: 280, isDefault: false, color: "#f97316", emoji: "🐱", description: "Purr-fectly precise." },
  { slug: "pet-dog", name: "Derivative Dog", category: "PET", rarity: "RARE", price: 280, isDefault: false, color: "#a16207", emoji: "🐶", description: "Loyal and quick." },
  { slug: "pet-dragon", name: "Algebra Dragon", category: "PET", rarity: "LEGENDARY", price: 1200, isDefault: false, color: "#16a34a", emoji: "🐉", description: "A mythical companion for masters.", unlockCriteria: { type: "level", value: "12" } },
  { slug: "pet-unicorn", name: "Geometry Unicorn", category: "PET", rarity: "LEGENDARY", price: 1500, isDefault: false, color: "#ec4899", emoji: "🦄", description: "Pure magic.", unlockCriteria: { type: "achievement", value: "math-master" } },
  { slug: "pet-robot", name: "Robot Pal", category: "PET", rarity: "EPIC", price: 500, isDefault: false, color: "#64748b", emoji: "🤖", description: "Calculates alongside you." },

  // ===== TRAILS =====
  { slug: "trail-none", name: "No Trail", category: "TRAIL", rarity: "COMMON", price: 0, isDefault: true, color: "transparent", emoji: "🚫", description: "Stealth mode." },
  { slug: "trail-sparkles", name: "Sparkle Trail", category: "TRAIL", rarity: "RARE", price: 200, isDefault: false, color: "#fbbf24", emoji: "✨", description: "Leave a little magic." },
  { slug: "trail-fire", name: "Fire Trail", category: "TRAIL", rarity: "EPIC", price: 400, isDefault: false, color: "#ef4444", emoji: "🔥", description: "On fire with learning!" },
  { slug: "trail-rainbow", name: "Rainbow Trail", category: "TRAIL", rarity: "LEGENDARY", price: 900, isDefault: false, color: "linear-gradient(90deg, #ff0000, #ffd700, #00ff00, #00bfff, #9400d3)", emoji: "🌈", description: "Pure mastery." },

  // ===== EMOTES =====
  { slug: "emote-wave", name: "Wave", category: "EMOTE", rarity: "COMMON", price: 0, isDefault: true, color: "#fbbf24", emoji: "👋", description: "Say hi to friends!" },
  { slug: "emote-dance", name: "Dance", category: "EMOTE", rarity: "RARE", price: 150, isDefault: false, color: "#ec4899", emoji: "💃", description: "Show off those moves." },
  { slug: "emote-cheer", name: "Cheer", category: "EMOTE", rarity: "COMMON", price: 50, isDefault: false, color: "#fbbf24", emoji: "🎉", description: "Celebrate wins!" },
  { slug: "emote-thinking", name: "Thinking", category: "EMOTE", rarity: "COMMON", price: 50, isDefault: false, color: "#3b82f6", emoji: "🤔", description: "Ponder the problem." },
];

export function getCosmeticBySlug(slug: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.slug === slug);
}

export function getDefaultCosmetics(): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const c of COSMETICS) {
    if (c.isDefault) {
      defaults[c.category] = c.slug;
    }
  }
  return defaults;
}

export function getCosmeticsByCategory(category: string): CosmeticDef[] {
  return COSMETICS.filter((c) => c.category === category);
}
