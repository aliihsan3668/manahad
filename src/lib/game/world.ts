/**
 * MathVerse — World Definition
 *
 * The persistent multiplayer world. Areas are 2D tile spaces where
 * players can move, chat, and interact with NPCs/portals.
 *
 * Areas are designed to be lightweight (canvas-rendered) so the platform
 * runs on low-bandwidth/older devices.
 */

import type { WorldArea } from "@/lib/types";

export const WORLD_AREAS: WorldArea[] = [
  {
    slug: "town",
    name: "Mathville Town Square",
    description: "The bustling heart of MathVerse. Meet friends, visit shops, and start your math adventures!",
    width: 1000,
    height: 600,
    bgColor: "#8bd3e8",
    spawnPoint: { x: 500, y: 400 },
    portals: [
      { x: 80, y: 100, target: "school", label: "School" },
      { x: 920, y: 100, target: "arcade", label: "Arcade" },
      { x: 80, y: 500, target: "park", label: "Park" },
      { x: 920, y: 500, target: "market", label: "Market" },
    ],
    npcs: [
      { slug: "mayor", x: 500, y: 250 },
      { slug: "quest-giver", x: 300, y: 350 },
    ],
    decorations: [
      { type: "fountain", x: 480, y: 250, w: 80, h: 80, color: "#4ab8d4" },
      { type: "tree", x: 100, y: 200, w: 60, h: 100, color: "#3a8b3a" },
      { type: "tree", x: 900, y: 250, w: 60, h: 100, color: "#3a8b3a" },
      { type: "tree", x: 200, y: 500, w: 60, h: 100, color: "#3a8b3a" },
      { type: "tree", x: 800, y: 500, w: 60, h: 100, color: "#3a8b3a" },
      { type: "path", x: 0, y: 380, w: 1000, h: 40, color: "#d4b896" },
      { type: "building", x: 350, y: 80, w: 100, h: 80, color: "#c9a3ff" },
      { type: "building", x: 550, y: 80, w: 100, h: 80, color: "#ff9a8b" },
    ],
  },
  {
    slug: "school",
    name: "Mathville School",
    description: "Where the magic of learning happens! Visit the classroom to start practicing.",
    width: 900,
    height: 600,
    bgColor: "#f5e6c8",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "teacher-quark", x: 450, y: 200 },
    ],
    decorations: [
      { type: "building", x: 200, y: 100, w: 500, h: 200, color: "#d4a574" },
      { type: "door", x: 420, y: 220, w: 60, h: 80, color: "#5a3a1a" },
      { type: "blackboard", x: 350, y: 150, w: 200, h: 60, color: "#1a3a1a" },
      { type: "desk", x: 280, y: 320, w: 60, h: 30, color: "#8b6a3a" },
      { type: "desk", x: 380, y: 320, w: 60, h: 30, color: "#8b6a3a" },
      { type: "desk", x: 480, y: 320, w: 60, h: 30, color: "#8b6a3a" },
      { type: "desk", x: 580, y: 320, w: 60, h: 30, color: "#8b6a3a" },
    ],
  },
  {
    slug: "park",
    name: "Number Garden Park",
    description: "A peaceful park perfect for relaxation. Hide among the geometric hedges!",
    width: 900,
    height: 600,
    bgColor: "#9bd97b",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "gardener", x: 200, y: 250 },
    ],
    decorations: [
      { type: "pond", x: 350, y: 200, w: 200, h: 120, color: "#4ab8d4" },
      { type: "tree", x: 100, y: 150, w: 80, h: 120, color: "#2a6b2a" },
      { type: "tree", x: 700, y: 150, w: 80, h: 120, color: "#2a6b2a" },
      { type: "tree", x: 100, y: 400, w: 80, h: 120, color: "#2a6b2a" },
      { type: "tree", x: 700, y: 400, w: 80, h: 120, color: "#2a6b2a" },
      { type: "bench", x: 250, y: 380, w: 100, h: 30, color: "#8b6a3a" },
      { type: "bench", x: 550, y: 380, w: 100, h: 30, color: "#8b6a3a" },
      { type: "flower", x: 200, y: 250, w: 20, h: 20, color: "#ff5a8b" },
      { type: "flower", x: 700, y: 250, w: 20, h: 20, color: "#ffd700" },
      { type: "flower", x: 450, y: 400, w: 20, h: 20, color: "#a855f7" },
    ],
  },
  {
    slug: "arcade",
    name: "Brain Arcade",
    description: "Play math mini-games, race your friends, and earn Brain Energy!",
    width: 900,
    height: 600,
    bgColor: "#2a1a4a",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "arcade-bot", x: 450, y: 200 },
    ],
    decorations: [
      { type: "machine", x: 150, y: 150, w: 80, h: 120, color: "#ff3a8b" },
      { type: "machine", x: 280, y: 150, w: 80, h: 120, color: "#3aff8b" },
      { type: "machine", x: 410, y: 150, w: 80, h: 120, color: "#3a8bff" },
      { type: "machine", x: 540, y: 150, w: 80, h: 120, color: "#ffd700" },
      { type: "machine", x: 670, y: 150, w: 80, h: 120, color: "#a855f7" },
      { type: "neon-sign", x: 350, y: 80, w: 200, h: 30, color: "#ff3a8b" },
    ],
  },
  {
    slug: "market",
    name: "Cosmetics Market",
    description: "Spend your hard-earned coins on hats, outfits, pets, and more!",
    width: 900,
    height: 600,
    bgColor: "#f5d3a0",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "shopkeeper", x: 450, y: 250 },
    ],
    decorations: [
      { type: "stall", x: 150, y: 200, w: 120, h: 100, color: "#c95a3a" },
      { type: "stall", x: 350, y: 200, w: 120, h: 100, color: "#3ac98b" },
      { type: "stall", x: 550, y: 200, w: 120, h: 100, color: "#3a8bc9" },
      { type: "awning", x: 100, y: 150, w: 700, h: 30, color: "#ff5a8b" },
      { type: "rug", x: 300, y: 350, w: 300, h: 80, color: "#a855f7" },
    ],
  },
];

export function getAreaBySlug(slug: string): WorldArea | undefined {
  return WORLD_AREAS.find((a) => a.slug === slug);
}

// ============================================================
// NPC DEFINITIONS
// ============================================================

export interface NPCDef {
  slug: string;
  name: string;
  area: string;
  color: string;
  dialogues: { trigger: string; text: string }[];
  questSlug?: string;
  emoji: string;
}

export const NPCS: NPCDef[] = [
  {
    slug: "mayor",
    name: "Mayor Plusmore",
    area: "town",
    color: "#8b5cf6",
    emoji: "🎩",
    dialogues: [
      { trigger: "talk", text: "Welcome to Mathville! I'm Mayor Plusmore. The more math you do, the brighter our town shines!" },
      { trigger: "quest", text: "Help fill the Brain Energy fountain! Answer 5 math questions to restore our town's magic." },
    ],
  },
  {
    slug: "quest-giver",
    name: "Captain Quark",
    area: "town",
    color: "#10b981",
    emoji: "🗺️",
    dialogues: [
      { trigger: "talk", text: "Ahoy, math explorer! I've got quests that'll take you to the stars and back." },
      { trigger: "quest", text: "Daily quest: Solve 10 questions correctly for 50 XP and 20 Brain Energy!" },
    ],
  },
  {
    slug: "teacher-quark",
    name: "Coach Quark",
    area: "school",
    color: "#f59e0b",
    emoji: "🧑‍🏫",
    dialogues: [
      { trigger: "talk", text: "Hi there! I'm Coach Quark. Whenever you're stuck, just ask — I love helping you discover answers!" },
      { trigger: "tutor", text: "Click the Practice Center to start learning. I'll be right there with you!" },
    ],
  },
  {
    slug: "gardener",
    name: "Gardener Pi",
    area: "park",
    color: "#84cc16",
    emoji: "🌱",
    dialogues: [
      { trigger: "talk", text: "Welcome to the Number Garden! Did you know flowers grow in Fibonacci spirals? Math is everywhere in nature!" },
      { trigger: "quest", text: "Help me plant symmetry flowers! Master the Symmetry topic for a special reward." },
    ],
  },
  {
    slug: "arcade-bot",
    name: "Pixel",
    area: "arcade",
    color: "#ec4899",
    emoji: "🤖",
    dialogues: [
      { trigger: "talk", text: "BEEP BOOP! Welcome to the Brain Arcade! Win mini-games to earn Brain Energy!" },
      { trigger: "quest", text: "CHALLENGE: Win 3 Math Races this week for an exclusive Trail cosmetic!" },
    ],
  },
  {
    slug: "shopkeeper",
    name: "Boutique Bella",
    area: "market",
    color: "#a855f7",
    emoji: "🛍️",
    dialogues: [
      { trigger: "talk", text: "Welcome to the Cosmetics Market! Browse my collection of fabulous items!" },
      { trigger: "shop", text: "Spend coins on hats, outfits, pets, and more! Cosmetics only — no pay-to-win here!" },
    ],
  },
];

export function getNPCBySlug(slug: string): NPCDef | undefined {
  return NPCS.find((n) => n.slug === slug);
}
