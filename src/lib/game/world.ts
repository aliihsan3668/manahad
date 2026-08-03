/**
 * MANAHAD — World Definition
 *
 * The persistent multiplayer world. Areas are 2D tile spaces where
 * players can move, chat, and interact with NPCs/portals/collectibles/
 * interactables.
 *
 * Areas are designed to be lightweight (canvas-rendered) so the platform
 * runs on low-bandwidth/older devices.
 */

import type { WorldArea } from "@/lib/types";

export const WORLD_AREAS: WorldArea[] = [
  {
    slug: "town",
    name: "Mathville Town Square",
    description: "The bustling heart of MANAHAD. Meet friends, visit shops, and start your math adventures!",
    width: 1000,
    height: 600,
    bgColor: "#8bd3e8",
    spawnPoint: { x: 500, y: 400 },
    portals: [
      { x: 80, y: 100, target: "school", label: "School" },
      { x: 920, y: 100, target: "arcade", label: "Arcade" },
      { x: 80, y: 500, target: "park", label: "Park" },
      { x: 920, y: 500, target: "market", label: "Market" },
      { x: 250, y: 80, target: "library", label: "Library" },
      { x: 750, y: 80, target: "space", label: "Space" },
      { x: 250, y: 540, target: "beach", label: "Beach" },
      { x: 750, y: 540, target: "zoo", label: "Zoo" },
      { x: 500, y: 80, target: "forest", label: "Forest" },
      { x: 500, y: 540, target: "castle", label: "Castle" },
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
      { type: "building", x: 350, y: 200, w: 100, h: 80, color: "#c9a3ff" },
      { type: "building", x: 550, y: 200, w: 100, h: 80, color: "#ff9a8b" },
    ],
    collectibles: [
      { id: "town-coin-1", type: "coin", x: 180, y: 350, value: 5, respawnsAfterSec: 60 },
      { id: "town-coin-2", type: "coin", x: 820, y: 350, value: 5, respawnsAfterSec: 60 },
      { id: "town-gem", type: "gem", x: 620, y: 450, value: 20, respawnsAfterSec: 300 },
      { id: "town-star", type: "star", x: 400, y: 150, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "town-math-fountain", type: "math-fountain", x: 480, y: 350, label: "Math Fountain", emoji: "⛲", cooldownSec: 120 },
      { id: "town-daily", type: "daily-chest", x: 700, y: 200, label: "Daily Chest", emoji: "🎁", cooldownSec: 86400 },
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
    collectibles: [
      { id: "school-coin-1", type: "coin", x: 150, y: 450, value: 5, respawnsAfterSec: 60 },
      { id: "school-coin-2", type: "coin", x: 750, y: 450, value: 5, respawnsAfterSec: 60 },
      { id: "school-book", type: "book", x: 450, y: 400, value: 15, respawnsAfterSec: 300 },
      { id: "school-star", type: "star", x: 760, y: 200, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "school-math-fountain", type: "math-fountain", x: 250, y: 500, label: "Math Fountain", emoji: "⛲", cooldownSec: 120 },
      { id: "school-daily", type: "daily-chest", x: 700, y: 500, label: "Daily Chest", emoji: "🎁", cooldownSec: 86400 },
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
    collectibles: [
      { id: "park-coin-1", type: "coin", x: 150, y: 350, value: 5, respawnsAfterSec: 60 },
      { id: "park-coin-2", type: "coin", x: 750, y: 350, value: 5, respawnsAfterSec: 60 },
      { id: "park-gem", type: "gem", x: 450, y: 350, value: 20, respawnsAfterSec: 300 },
      { id: "park-star", type: "star", x: 800, y: 500, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "park-math-fountain", type: "math-fountain", x: 250, y: 500, label: "Math Fountain", emoji: "⛲", cooldownSec: 120 },
      { id: "park-wishing-well", type: "wishing-well", x: 650, y: 500, label: "Wishing Well", emoji: "🪙", cooldownSec: 300 },
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
    collectibles: [
      { id: "arcade-coin-1", type: "coin", x: 150, y: 400, value: 5, respawnsAfterSec: 60 },
      { id: "arcade-coin-2", type: "coin", x: 750, y: 400, value: 5, respawnsAfterSec: 60 },
      { id: "arcade-gem", type: "gem", x: 450, y: 400, value: 20, respawnsAfterSec: 300 },
      { id: "arcade-star", type: "star", x: 200, y: 540, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "arcade-lucky-fountain", type: "lucky-fountain", x: 250, y: 500, label: "Lucky Fountain", emoji: "🍀", cooldownSec: 180 },
      { id: "arcade-daily", type: "daily-chest", x: 700, y: 500, label: "Daily Chest", emoji: "🎁", cooldownSec: 86400 },
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
    collectibles: [
      { id: "market-coin-1", type: "coin", x: 150, y: 450, value: 5, respawnsAfterSec: 60 },
      { id: "market-coin-2", type: "coin", x: 750, y: 450, value: 5, respawnsAfterSec: 60 },
      { id: "market-gem", type: "gem", x: 450, y: 500, value: 20, respawnsAfterSec: 300 },
      { id: "market-crystal", type: "crystal", x: 800, y: 540, value: 30, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "market-wishing-well", type: "wishing-well", x: 250, y: 500, label: "Wishing Well", emoji: "🪙", cooldownSec: 300 },
      { id: "market-daily", type: "daily-chest", x: 700, y: 500, label: "Daily Chest", emoji: "🎁", cooldownSec: 86400 },
    ],
  },
  {
    slug: "forest",
    name: "Enchanted Forest",
    description: "Mystical woods full of glowing fireflies and hidden treasures.",
    width: 900,
    height: 600,
    bgColor: "#1f3a1f",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
      { x: 850, y: 300, target: "castle", label: "To Castle" },
    ],
    npcs: [
      { slug: "gardener", x: 250, y: 250 },
    ],
    decorations: [
      { type: "tree", x: 100, y: 150, w: 100, h: 140, color: "#1a4a1a" },
      { type: "tree", x: 250, y: 120, w: 100, h: 140, color: "#1a4a1a" },
      { type: "tree", x: 700, y: 130, w: 100, h: 140, color: "#1a4a1a" },
      { type: "tree", x: 800, y: 180, w: 100, h: 140, color: "#1a4a1a" },
      { type: "tree", x: 150, y: 400, w: 80, h: 120, color: "#1a4a1a" },
      { type: "tree", x: 750, y: 400, w: 80, h: 120, color: "#1a4a1a" },
      { type: "pond", x: 350, y: 200, w: 200, h: 120, color: "#2a5a7a" },
      { type: "flower", x: 200, y: 350, w: 20, h: 20, color: "#ff5a8b" },
      { type: "flower", x: 700, y: 350, w: 20, h: 20, color: "#ffd700" },
    ],
    collectibles: [
      { id: "forest-coin-1", type: "coin", x: 200, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "forest-coin-2", type: "coin", x: 700, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "forest-gem", type: "gem", x: 450, y: 400, value: 20, respawnsAfterSec: 300 },
      { id: "forest-crystal", type: "crystal", x: 800, y: 540, value: 30, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "forest-treasure-dig", type: "treasure-dig", x: 250, y: 400, label: "Treasure Dig", emoji: "⛏️", cooldownSec: 300 },
      { id: "forest-math-fountain", type: "math-fountain", x: 650, y: 400, label: "Math Fountain", emoji: "⛲", cooldownSec: 120 },
    ],
  },
  {
    slug: "castle",
    name: "Geometry Castle",
    description: "A majestic castle of polygons and patterns. Royal treasures await!",
    width: 900,
    height: 600,
    bgColor: "#8a8a9a",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "forest", label: "Back to Forest" },
      { x: 850, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "mayor", x: 450, y: 200 },
    ],
    decorations: [
      { type: "building", x: 250, y: 80, w: 400, h: 200, color: "#6a6a7a" },
      { type: "door", x: 420, y: 200, w: 60, h: 80, color: "#3a2a1a" },
      { type: "tree", x: 100, y: 350, w: 80, h: 120, color: "#3a5a3a" },
      { type: "tree", x: 800, y: 350, w: 80, h: 120, color: "#3a5a3a" },
      { type: "path", x: 0, y: 380, w: 900, h: 40, color: "#9a9aaa" },
      { type: "flower", x: 200, y: 400, w: 20, h: 20, color: "#ffd700" },
      { type: "flower", x: 700, y: 400, w: 20, h: 20, color: "#ff5a8b" },
    ],
    collectibles: [
      { id: "castle-coin-1", type: "coin", x: 150, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "castle-coin-2", type: "coin", x: 750, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "castle-gem", type: "gem", x: 300, y: 400, value: 20, respawnsAfterSec: 300 },
      { id: "castle-star", type: "star", x: 450, y: 350, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "castle-treasure-dig", type: "treasure-dig", x: 250, y: 500, label: "Treasure Dig", emoji: "⛏️", cooldownSec: 300 },
      { id: "castle-daily", type: "daily-chest", x: 700, y: 500, label: "Daily Chest", emoji: "🎁", cooldownSec: 86400 },
    ],
  },
  {
    slug: "space",
    name: "Cosmic Station",
    description: "Explore the final math-frontier among the stars and planets!",
    width: 900,
    height: 600,
    bgColor: "#0a0a2a",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "arcade-bot", x: 250, y: 250 },
    ],
    decorations: [
      { type: "building", x: 200, y: 100, w: 200, h: 100, color: "#3a3a5a" },
      { type: "building", x: 500, y: 100, w: 200, h: 100, color: "#3a3a5a" },
      { type: "machine", x: 350, y: 200, w: 60, h: 80, color: "#5a5a8a" },
      { type: "neon-sign", x: 350, y: 130, w: 200, h: 20, color: "#3a8bff" },
      { type: "path", x: 0, y: 400, w: 900, h: 30, color: "#2a2a4a" },
    ],
    collectibles: [
      { id: "space-coin-1", type: "coin", x: 150, y: 450, value: 5, respawnsAfterSec: 60 },
      { id: "space-coin-2", type: "coin", x: 750, y: 450, value: 5, respawnsAfterSec: 60 },
      { id: "space-gem", type: "gem", x: 450, y: 400, value: 20, respawnsAfterSec: 300 },
      { id: "space-star", type: "star", x: 200, y: 540, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "space-teleport-pad", type: "teleport-pad", x: 250, y: 500, label: "Teleport Pad", emoji: "🚀", cooldownSec: 30 },
      { id: "space-lucky-fountain", type: "lucky-fountain", x: 700, y: 500, label: "Lucky Fountain", emoji: "🍀", cooldownSec: 180 },
    ],
  },
  {
    slug: "library",
    name: "Library of Logarithms",
    description: "A quiet temple of knowledge. Read tomes, solve puzzles, find rare books.",
    width: 900,
    height: 600,
    bgColor: "#e8dcc0",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "teacher-quark", x: 250, y: 250 },
    ],
    decorations: [
      { type: "building", x: 150, y: 100, w: 600, h: 220, color: "#c9a86a" },
      { type: "door", x: 420, y: 220, w: 60, h: 80, color: "#5a3a1a" },
      { type: "blackboard", x: 250, y: 150, w: 200, h: 60, color: "#3a2a1a" },
      { type: "desk", x: 280, y: 320, w: 60, h: 30, color: "#8b6a3a" },
      { type: "desk", x: 480, y: 320, w: 60, h: 30, color: "#8b6a3a" },
      { type: "desk", x: 680, y: 320, w: 60, h: 30, color: "#8b6a3a" },
      { type: "rug", x: 200, y: 400, w: 500, h: 60, color: "#a855f7" },
    ],
    collectibles: [
      { id: "library-coin-1", type: "coin", x: 150, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "library-coin-2", type: "coin", x: 750, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "library-book", type: "book", x: 450, y: 400, value: 15, respawnsAfterSec: 300 },
      { id: "library-star", type: "star", x: 800, y: 540, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "library-math-fountain", type: "math-fountain", x: 250, y: 500, label: "Math Fountain", emoji: "⛲", cooldownSec: 120 },
      { id: "library-daily", type: "daily-chest", x: 700, y: 500, label: "Daily Chest", emoji: "🎁", cooldownSec: 86400 },
    ],
  },
  {
    slug: "beach",
    name: "Algebra Beach",
    description: "Sun, sand, and seagulls. Solve problems with the ocean breeze!",
    width: 900,
    height: 600,
    bgColor: "#f4e4b8",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "gardener", x: 250, y: 250 },
    ],
    decorations: [
      { type: "pond", x: 0, y: 100, w: 900, h: 100, color: "#4ab8d4" },
      { type: "tree", x: 100, y: 350, w: 60, h: 100, color: "#3a8b3a" },
      { type: "tree", x: 800, y: 350, w: 60, h: 100, color: "#3a8b3a" },
      { type: "bench", x: 250, y: 380, w: 100, h: 30, color: "#8b6a3a" },
      { type: "bench", x: 550, y: 380, w: 100, h: 30, color: "#8b6a3a" },
      { type: "flower", x: 450, y: 400, w: 20, h: 20, color: "#ff5a8b" },
      { type: "path", x: 0, y: 350, w: 900, h: 20, color: "#e8c898" },
    ],
    collectibles: [
      { id: "beach-coin-1", type: "coin", x: 200, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "beach-coin-2", type: "coin", x: 700, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "beach-gem", type: "gem", x: 450, y: 450, value: 20, respawnsAfterSec: 300 },
      { id: "beach-star", type: "star", x: 800, y: 540, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "beach-wishing-well", type: "wishing-well", x: 250, y: 500, label: "Wishing Well", emoji: "🪙", cooldownSec: 300 },
      { id: "beach-treasure-dig", type: "treasure-dig", x: 700, y: 500, label: "Treasure Dig", emoji: "⛏️", cooldownSec: 300 },
    ],
  },
  {
    slug: "zoo",
    name: "Number Zoo",
    description: "Visit mathematical creatures from across the realms!",
    width: 900,
    height: 600,
    bgColor: "#c9b890",
    spawnPoint: { x: 450, y: 500 },
    portals: [
      { x: 50, y: 300, target: "town", label: "Back to Town" },
    ],
    npcs: [
      { slug: "gardener", x: 250, y: 250 },
    ],
    decorations: [
      { type: "building", x: 100, y: 100, w: 150, h: 150, color: "#a87545" },
      { type: "building", x: 650, y: 100, w: 150, h: 150, color: "#a87545" },
      { type: "building", x: 350, y: 100, w: 200, h: 100, color: "#8a6a3a" },
      { type: "tree", x: 100, y: 380, w: 80, h: 120, color: "#3a8b3a" },
      { type: "tree", x: 800, y: 380, w: 80, h: 120, color: "#3a8b3a" },
      { type: "pond", x: 350, y: 280, w: 200, h: 80, color: "#4ab8d4" },
      { type: "path", x: 0, y: 380, w: 900, h: 30, color: "#d4b896" },
      { type: "flower", x: 200, y: 400, w: 20, h: 20, color: "#ff5a8b" },
      { type: "flower", x: 700, y: 400, w: 20, h: 20, color: "#ffd700" },
    ],
    collectibles: [
      { id: "zoo-coin-1", type: "coin", x: 150, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "zoo-coin-2", type: "coin", x: 750, y: 500, value: 5, respawnsAfterSec: 60 },
      { id: "zoo-gem", type: "gem", x: 450, y: 400, value: 20, respawnsAfterSec: 300 },
      { id: "zoo-star", type: "star", x: 450, y: 540, value: 50, respawnsAfterSec: 600 },
    ],
    interactables: [
      { id: "zoo-treasure-dig", type: "treasure-dig", x: 250, y: 500, label: "Treasure Dig", emoji: "⛏️", cooldownSec: 300 },
      { id: "zoo-math-fountain", type: "math-fountain", x: 700, y: 500, label: "Math Fountain", emoji: "⛲", cooldownSec: 120 },
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

// ============================================================
// COLLECTIBLE EMOJI MAP
// ============================================================

export const COLLECTIBLE_EMOJI: Record<string, string> = {
  coin: "🪙",
  gem: "💎",
  star: "⭐",
  book: "📚",
  crystal: "🔷",
};
