"use client";

/**
 * MANAHAD — Game World View
 *
 * A 2D top-down canvas world where players can:
 *   - Walk around (WASD / arrow keys / touch joystick)
 *   - See other players moving in realtime (via WebSocket)
 *   - Chat with nearby players (chat panel)
 *   - Walk into portals to change areas
 *   - Talk to NPCs (opens dialogue)
 *   - Use emotes
 *   - Collect floating coins/gems/stars (auto-collect on collision)
 *   - Interact with fountains, chests, wells, teleports (press T)
 *   - View who's online via the floating panel
 *
 * The world is rendered on a canvas with requestAnimationFrame.
 * Player position is synced to the server at ~30Hz.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { renderAvatar } from "./avatar-renderer";
import { WhoOnlinePanel } from "./who-online-panel";
import { MiniGamesMenu } from "./mini-games";
import {
  WORLD_AREAS, getAreaBySlug, getNPCBySlug, COLLECTIBLE_EMOJI,
} from "@/lib/game/world";
import type { WorldCollectible, WorldInteractable } from "@/lib/types";
import { toast } from "sonner";
import {
  Send, MapPin, Users, Sparkles, MessageCircle, Gamepad2, X, ChevronRight,
  Zap, Coins, Trophy, Rocket,
} from "lucide-react";

interface ActiveEmote {
  userId: string;
  emoji: string;
  startFrame: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0..1 (1 = fresh, 0 = dead)
  decay: number;
  color: string;
  size: number;
}

interface AmbientEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  // Phase used by fireflies to blink.
  phase: number;
}

interface MathQuestionState {
  prompt: string;
  answer: number;
  options: number[];
  rewardXp: number;
  rewardCoins: number;
  sourceId: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  length: number;
}

// Respawn check helper — if the collectible has been collected and the
// respawn window has elapsed, it becomes available again.
function isCollected(collectedRef: Map<string, number>, id: string, respawnSec: number): boolean {
  const ts = collectedRef.get(id);
  if (!ts) return false;
  return Date.now() - ts < respawnSec * 1000;
}

export function WorldView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const updateUser = useAppStore((s) => s.updateUser);
  const dyslexiaFont = useAppStore((s) => s.dyslexiaFont);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    connect, disconnect, connected, players, messages, currentArea,
    moveTo, changeArea, sendChat, sendEmote,
  } = useMultiplayerStore();

  // Local player position (high-frequency, synced to server)
  const playerPos = useRef<{ x: number; y: number; direction: "up" | "down" | "left" | "right"; isMoving: boolean }>({
    x: 500, y: 400, direction: "down", isMoving: false,
  });
  const keysPressed = useRef<Set<string>>(new Set());
  const animFrame = useRef(0);
  const activeEmotes = useRef<ActiveEmote[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [activeNPC, setActiveNPC] = useState<string | null>(null);

  // === Collectibles: track respawn timestamps ===
  const collectedRef = useRef<Map<string, number>>(new Map());
  // === Interactables: track cooldowns (when last used) ===
  const interactableCooldownRef = useRef<Map<string, number>>(new Map());
  // === Particle effects ===
  const particlesRef = useRef<Particle[]>([]);
  // === Floating reward toasts (canvas-rendered "+5 XP") ===
  const rewardPopsRef = useRef<{ x: number; y: number; text: string; color: string; life: number }[]>([]);

  // === Math-fountain question state ===
  const [mathQuestion, setMathQuestion] = useState<MathQuestionState | null>(null);

  // === Teleport pad menu state ===
  const [showTeleportMenu, setShowTeleportMenu] = useState(false);
  const [showGames, setShowGames] = useState(false);

  // === Track the nearest interactable id for the "Press T" prompt ===
  const [nearInteractableId, setNearInteractableId] = useState<string | null>(null);
  const nearInteractableIdRef = useRef<string | null>(null);

  const area = getAreaBySlug(currentArea) ?? WORLD_AREAS[0];

  // === Ambient particles (per-area flavor) ===
  const ambientRef = useRef<AmbientEntity[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);

  // Initialize ambient entities when the area changes.
  useEffect(() => {
    ambientRef.current = [];
    shootingStarsRef.current = [];

    if (area.slug === "park") {
      for (let i = 0; i < 5; i++) {
        ambientRef.current.push({
          x: Math.random() * area.width,
          y: 100 + Math.random() * (area.height - 200),
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.4,
          emoji: "🦋",
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else if (area.slug === "forest") {
      for (let i = 0; i < 10; i++) {
        ambientRef.current.push({
          x: Math.random() * area.width,
          y: Math.random() * area.height,
          vx: 0,
          vy: 0,
          emoji: "✨",
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else if (area.slug === "beach") {
      for (let i = 0; i < 3; i++) {
        ambientRef.current.push({
          x: Math.random() * area.width,
          y: 50 + Math.random() * 150,
          vx: 0.8 + Math.random() * 0.5,
          vy: (Math.random() - 0.5) * 0.2,
          emoji: "🕊️",
          phase: 0,
        });
      }
    } else if (area.slug === "space") {
      // shooting stars handled in tick
    }
  }, [area.slug, area.width, area.height]);

  // === Connect to multiplayer ===
  useEffect(() => {
    if (!user) return;
    connect({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarConfig: user.avatarConfig,
      area: "town",
      level: user.level,
    });
    return () => disconnect();
  }, [user?.id]);

  // === Listen for emote events ===
  useEffect(() => {
    function onEmote(e: Event) {
      const detail = (e as CustomEvent).detail;
      activeEmotes.current.push({
        userId: detail.userId,
        emoji: detail.emoteSlug === "emote-wave" ? "👋" :
               detail.emoteSlug === "emote-dance" ? "💃" :
               detail.emoteSlug === "emote-cheer" ? "🎉" :
               detail.emoteSlug === "emote-thinking" ? "🤔" : "✨",
        startFrame: animFrame.current,
      });
    }
    window.addEventListener("mv:emote", onEmote);
    return () => window.removeEventListener("mv:emote", onEmote);
  }, []);

  // === Helper: spawn particles at a location ===
  const spawnParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    const newParts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2.5;
      newParts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.02 + Math.random() * 0.015,
        color,
        size: 2 + Math.random() * 2,
      });
    }
    particlesRef.current.push(...newParts);
    // Cap to avoid runaway growth.
    if (particlesRef.current.length > 400) {
      particlesRef.current.splice(0, particlesRef.current.length - 400);
    }
  }, []);

  // === Helper: show a floating "+N XP" reward popup ===
  const spawnRewardPop = useCallback((x: number, y: number, text: string, color: string) => {
    rewardPopsRef.current.push({ x, y, text, color, life: 1 });
    if (rewardPopsRef.current.length > 20) {
      rewardPopsRef.current.splice(0, rewardPopsRef.current.length - 20);
    }
  }, []);

  // === Collectible pickup logic ===
  const tryCollectItem = useCallback((c: WorldCollectible, x: number, y: number) => {
    if (isCollected(collectedRef.current, c.id, c.respawnsAfterSec)) return;
    collectedRef.current.set(c.id, Date.now());

    // Reward mapping by type
    const xpByType: Record<string, number> = { coin: 0, gem: 5, star: 15, book: 8, crystal: 10 };
    const coinsByType: Record<string, number> = { coin: c.value, gem: c.value, star: c.value, book: 0, crystal: 0 };

    const xpGain = xpByType[c.type] ?? 0;
    const coinGain = coinsByType[c.type] ?? 0;

    if (user) {
      updateUser({
        xp: user.xp + xpGain,
        coins: user.coins + coinGain,
        brainEnergy: Math.min(user.maxBrainEnergy, user.brainEnergy + (c.type === "star" ? 5 : c.type === "gem" ? 2 : 0)),
      });
    }

    // Particles
    const partColor =
      c.type === "coin" ? "#fbbf24" :
      c.type === "gem" ? "#a855f7" :
      c.type === "star" ? "#facc15" :
      c.type === "book" ? "#3b82f6" : "#06b6d4";
    spawnParticles(x, y, partColor, 14);
    spawnRewardPop(x, y - 20, `+${coinGain > 0 ? coinGain + "🪙" : ""}${xpGain > 0 ? (coinGain > 0 ? " " : "") + "+" + xpGain + " XP" : ""}`, partColor);

    const emoji = COLLECTIBLE_EMOJI[c.type] ?? "✨";
    toast.success(`Collected ${emoji}`, {
      description: coinGain > 0 ? `+${coinGain} coins` : `+${xpGain} XP`,
      duration: 1800,
    });
  }, [user, updateUser, spawnParticles, spawnRewardPop]);

  // === Generate a quick math question for the Math Fountain ===
  const generateMathQuestion = useCallback((): MathQuestionState => {
    const ops = ["+", "-", "×"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a: number, b: number, answer: number;
    if (op === "+") {
      a = 5 + Math.floor(Math.random() * 25);
      b = 5 + Math.floor(Math.random() * 25);
      answer = a + b;
    } else if (op === "-") {
      a = 15 + Math.floor(Math.random() * 30);
      b = 3 + Math.floor(Math.random() * Math.max(1, a - 4));
      answer = a - b;
    } else {
      a = 2 + Math.floor(Math.random() * 9);
      b = 2 + Math.floor(Math.random() * 9);
      answer = a * b;
    }
    // Generate 3 distractors near the answer
    const opts = new Set<number>([answer]);
    while (opts.size < 4) {
      const delta = (1 + Math.floor(Math.random() * 5)) * (Math.random() < 0.5 ? -1 : 1);
      const cand = answer + delta;
      if (cand > 0 && cand !== answer) opts.add(cand);
    }
    const options = Array.from(opts).sort(() => Math.random() - 0.5);
    return {
      prompt: `${a} ${op} ${b} = ?`,
      answer,
      options,
      rewardXp: 20,
      rewardCoins: 5,
      sourceId: `mf-${Date.now()}`,
    };
  }, []);

  // === Use an interactable ===
  const triggerInteractable = useCallback((it: WorldInteractable) => {
    const lastUsed = interactableCooldownRef.current.get(it.id);
    const now = Date.now();
    if (lastUsed && now - lastUsed < it.cooldownSec * 1000) {
      const remaining = Math.ceil((it.cooldownSec * 1000 - (now - lastUsed)) / 1000);
      toast.info(`${it.emoji} On cooldown`, {
        description: `Try again in ${remaining}s`,
        duration: 1800,
      });
      return;
    }

    switch (it.type) {
      case "math-fountain": {
        setMathQuestion(generateMathQuestion());
        break;
      }
      case "daily-chest": {
        // Big reward once per day (we approximate with cooldownSec)
        interactableCooldownRef.current.set(it.id, now);
        const xpGain = 100;
        const coinGain = 50;
        const beGain = 20;
        if (user) {
          updateUser({
            xp: user.xp + xpGain,
            coins: user.coins + coinGain,
            brainEnergy: Math.min(user.maxBrainEnergy, user.brainEnergy + beGain),
          });
        }
        spawnParticles(playerPos.current.x, playerPos.current.y - 10, "#fbbf24", 30);
        spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `+${xpGain} XP +${coinGain}🪙 +${beGain}⚡`, "#fbbf24");
        toast.success("🎁 Daily Chest opened!", {
          description: `+${xpGain} XP, +${coinGain} coins, +${beGain} Brain Energy`,
          duration: 3000,
        });
        break;
      }
      case "teleport-pad": {
        setShowTeleportMenu(true);
        break;
      }
      case "wishing-well": {
        // Costs 10 coins for a chance at a random reward
        if (!user || user.coins < 10) {
          toast.error("Need 10 coins to make a wish!", { duration: 1800 });
          return;
        }
        interactableCooldownRef.current.set(it.id, now);
        updateUser({ coins: user.coins - 10 });
        const roll = Math.random();
        if (roll < 0.55) {
          // Win coins (10..40)
          const win = 10 + Math.floor(Math.random() * 31);
          updateUser({ coins: user.coins - 10 + win });
          spawnParticles(playerPos.current.x, playerPos.current.y - 10, "#fbbf24", 18);
          spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `+${win}🪙`, "#fbbf24");
          toast.success("🪙 Your wish came true!", { description: `+${win} coins`, duration: 2200 });
        } else if (roll < 0.85) {
          // XP reward
          const xp = 15 + Math.floor(Math.random() * 21);
          updateUser({ xp: user.xp + xp });
          spawnParticles(playerPos.current.x, playerPos.current.y - 10, "#10b981", 18);
          spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `+${xp} XP`, "#10b981");
          toast.success("✨ The well grants you wisdom!", { description: `+${xp} XP`, duration: 2200 });
        } else {
          // Jackpot — gem (50 coins + 30 XP)
          updateUser({
            coins: user.coins - 10 + 50,
            xp: user.xp + 30,
          });
          spawnParticles(playerPos.current.x, playerPos.current.y - 10, "#a855f7", 30);
          spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `JACKPOT! +50🪙 +30 XP`, "#a855f7");
          toast.success("💎 JACKPOT!", { description: "+50 coins, +30 XP", duration: 3000 });
        }
        break;
      }
      case "treasure-dig": {
        interactableCooldownRef.current.set(it.id, now);
        const roll = Math.random();
        if (roll < 0.7) {
          const coins = 5 + Math.floor(Math.random() * 16);
          if (user) updateUser({ coins: user.coins + coins });
          spawnParticles(playerPos.current.x, playerPos.current.y - 5, "#d4b896", 16);
          spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `+${coins}🪙`, "#d4b896");
          toast.success("⛏️ You dug up some coins!", { description: `+${coins} coins`, duration: 2200 });
        } else if (roll < 0.95) {
          const xp = 10 + Math.floor(Math.random() * 16);
          if (user) updateUser({ xp: user.xp + xp });
          spawnParticles(playerPos.current.x, playerPos.current.y - 5, "#a855f7", 18);
          spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `+${xp} XP`, "#a855f7");
          toast.success("💎 You found a buried gem!", { description: `+${xp} XP`, duration: 2200 });
        } else {
          // Empty hole
          toast.info("⛏️ Nothing here but dirt...", { duration: 1800 });
        }
        break;
      }
      case "lucky-fountain": {
        interactableCooldownRef.current.set(it.id, now);
        const xp = 5 + Math.floor(Math.random() * 26);
        if (user) updateUser({ xp: user.xp + xp });
        spawnParticles(playerPos.current.x, playerPos.current.y - 10, "#84cc16", 20);
        spawnRewardPop(playerPos.current.x, playerPos.current.y - 30, `+${xp} XP`, "#84cc16");
        toast.success("🍀 Lucky Fountain grants you XP!", { description: `+${xp} XP`, duration: 2200 });
        break;
      }
    }
  }, [user, updateUser, generateMathQuestion, spawnParticles, spawnRewardPop]);

  // === Math-question answer handler ===
  const answerMathQuestion = useCallback((choice: number) => {
    if (!mathQuestion) return;
    const correct = choice === mathQuestion.answer;
    if (correct) {
      if (user) {
        updateUser({
          xp: user.xp + mathQuestion.rewardXp,
          coins: user.coins + mathQuestion.rewardCoins,
          brainEnergy: Math.min(user.maxBrainEnergy, user.brainEnergy + 5),
        });
      }
      spawnParticles(playerPos.current.x, playerPos.current.y - 10, "#10b981", 24);
      spawnRewardPop(playerPos.current.x, playerPos.current.y - 30,
        `Correct! +${mathQuestion.rewardXp} XP`, "#10b981");
      toast.success("✅ Correct!", {
        description: `+${mathQuestion.rewardXp} XP, +${mathQuestion.rewardCoins} coins`,
        duration: 2400,
      });
    } else {
      toast.error("❌ Not quite!", {
        description: `The answer was ${mathQuestion.answer}. Try again later!`,
        duration: 2800,
      });
    }
    setMathQuestion(null);
  }, [mathQuestion, user, updateUser, spawnParticles, spawnRewardPop]);

  // === Teleport handler ===
  const teleportToArea = useCallback((targetSlug: string) => {
    setShowTeleportMenu(false);
    const targetArea = getAreaBySlug(targetSlug);
    if (!targetArea) return;
    toast.info(`🚀 Teleporting to ${targetArea.name}...`);
    changeArea(targetArea.slug, targetArea.spawnPoint.x, targetArea.spawnPoint.y);
    playerPos.current.x = targetArea.spawnPoint.x;
    playerPos.current.y = targetArea.spawnPoint.y;
  }, [changeArea]);

  // === Keyboard input ===
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
      }
      // Quick emotes
      if (key === "e") sendEmote("emote-wave");
      if (key === "r") sendEmote("emote-dance");
    }
    function onKeyUp(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      keysPressed.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [sendEmote]);

  // === T key handler: interactable > NPC ===
  // (separate from the movement listener above so we don't fire twice)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      // Escape closes any open dialog
      if (e.key === "Escape") {
        setMathQuestion(null);
        setShowTeleportMenu(false);
        setActiveNPC(null);
        return;
      }

      if (e.key.toLowerCase() !== "t") return;
      if (mathQuestion || showTeleportMenu || activeNPC) return; // already in a dialog

      // First: nearby interactable
      const nearId = nearInteractableIdRef.current;
      if (nearId) {
        const it = area.interactables.find((i) => i.id === nearId);
        if (it) {
          triggerInteractable(it);
          return;
        }
      }
      // Then: nearby NPC
      for (const npcDef of area.npcs) {
        const dist = Math.sqrt((npcDef.x - playerPos.current.x) ** 2 + (npcDef.y - playerPos.current.y) ** 2);
        if (dist < 50) {
          setActiveNPC(npcDef.slug);
          return;
        }
      }
      // Otherwise: thinking emote
      sendEmote("emote-thinking");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [area, activeNPC, mathQuestion, showTeleportMenu, triggerInteractable, sendEmote]);

  // === Touch joystick ===
  const joystickRef = useRef<{ active: boolean; dx: number; dy: number }>({ active: false, dx: 0, dy: 0 });
  const [joystickOffset, setJoystickOffset] = useState({ dx: 0, dy: 0 });
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const touch = e.touches[0];
    joystickRef.current = {
      active: true,
      dx: touch.clientX - (rect.left + rect.width / 2),
      dy: touch.clientY - (rect.top + rect.height / 2),
    };
    setJoystickOffset({ dx: joystickRef.current.dx, dy: joystickRef.current.dy });
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const touch = e.touches[0];
    joystickRef.current.dx = touch.clientX - (rect.left + rect.width / 2);
    joystickRef.current.dy = touch.clientY - (rect.top + rect.height / 2);
    setJoystickOffset({ dx: joystickRef.current.dx, dy: joystickRef.current.dy });
  }, []);
  const onTouchEnd = useCallback(() => {
    joystickRef.current = { active: false, dx: 0, dy: 0 };
    setJoystickOffset({ dx: 0, dy: 0 });
  }, []);

  // === Main game loop ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    function resize() {
      if (!canvas || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let lastServerSync = 0;
    let nearestInteractableThisFrame: string | null = null;
    let lastNearUpdate = 0;

    function tick() {
      animFrame.current++;
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // === Update local player position from input ===
      let dx = 0, dy = 0;
      const keys = keysPressed.current;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      // Joystick input
      if (joystickRef.current.active) {
        const j = joystickRef.current;
        const mag = Math.sqrt(j.dx * j.dx + j.dy * j.dy);
        if (mag > 10) {
          dx = j.dx / mag;
          dy = j.dy / mag;
        }
      }

      const speed = 3.5;
      const moving = (dx !== 0 || dy !== 0);
      if (moving) {
        const norm = Math.sqrt(dx * dx + dy * dy) || 1;
        const ndx = dx / norm;
        const ndy = dy / norm;
        playerPos.current.x = Math.max(20, Math.min(area.width - 20, playerPos.current.x + ndx * speed));
        playerPos.current.y = Math.max(60, Math.min(area.height - 20, playerPos.current.y + ndy * speed));
        // Set direction (dominant axis)
        if (Math.abs(ndx) > Math.abs(ndy)) {
          playerPos.current.direction = ndx > 0 ? "right" : "left";
        } else {
          playerPos.current.direction = ndy > 0 ? "down" : "up";
        }
        playerPos.current.isMoving = true;
      } else {
        playerPos.current.isMoving = false;
      }

      // === Sync to server (~30Hz) ===
      const now = Date.now();
      if (now - lastServerSync > 33 && moving) {
        moveTo(playerPos.current.x, playerPos.current.y, playerPos.current.direction);
        lastServerSync = now;
      }

      // === Camera follows player ===
      const camX = playerPos.current.x - w / 2;
      const camY = playerPos.current.y - h / 2;

      // === Clear ===
      ctx!.fillStyle = area.bgColor;
      ctx!.fillRect(0, 0, w, h);

      // === Camera transform ===
      ctx!.save();
      ctx!.translate(-camX, -camY);

      // === Background pattern (subtle grid) ===
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.lineWidth = 1;
      const gridSize = 60;
      const startX = Math.floor(camX / gridSize) * gridSize;
      const startY = Math.floor(camY / gridSize) * gridSize;
      for (let x = startX; x < camX + w; x += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(x, camY);
        ctx!.lineTo(x, camY + h);
        ctx!.stroke();
      }
      for (let y = startY; y < camY + h; y += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(camX, y);
        ctx!.lineTo(camX + w, y);
        ctx!.stroke();
      }

      // === Area boundary ===
      ctx!.strokeStyle = "rgba(0,0,0,0.2)";
      ctx!.lineWidth = 4;
      ctx!.strokeRect(0, 0, area.width, area.height);

      // Cull window: skip objects whose bounding box is fully off-screen.
      const viewLeft = camX - 80;
      const viewRight = camX + w + 80;
      const viewTop = camY - 80;
      const viewBottom = camY + h + 80;
      function inView(x: number, y: number, slack = 60): boolean {
        return x > viewLeft - slack && x < viewRight + slack &&
               y > viewTop - slack && y < viewBottom + slack;
      }

      // === Decorations ===
      for (const dec of area.decorations) {
        // Cull decorations outside the viewport.
        if (dec.x + dec.w < viewLeft || dec.x > viewRight ||
            dec.y + dec.h < viewTop || dec.y > viewBottom) continue;
        ctx!.fillStyle = dec.color;
        ctx!.strokeStyle = "rgba(0,0,0,0.15)";
        ctx!.lineWidth = 2;
        if (dec.type === "tree") {
          // Trunk
          ctx!.fillStyle = "#5a3a1a";
          ctx!.fillRect(dec.x + dec.w / 2 - 5, dec.y + dec.h / 2, 10, dec.h / 2);
          // Leaves
          ctx!.fillStyle = dec.color;
          ctx!.beginPath();
          ctx!.arc(dec.x + dec.w / 2, dec.y + dec.h / 2, dec.w / 2, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
        } else if (dec.type === "pond") {
          ctx!.fillStyle = dec.color;
          ctx!.beginPath();
          ctx!.ellipse(dec.x + dec.w / 2, dec.y + dec.h / 2, dec.w / 2, dec.h / 2, 0, 0, Math.PI * 2);
          ctx!.fill();
          // Ripple
          ctx!.strokeStyle = "rgba(255,255,255,0.4)";
          ctx!.beginPath();
          ctx!.ellipse(dec.x + dec.w / 2, dec.y + dec.h / 2, dec.w / 3, dec.h / 3, 0, 0, Math.PI * 2);
          ctx!.stroke();
        } else if (dec.type === "building") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
          ctx!.strokeRect(dec.x, dec.y, dec.w, dec.h);
          // Roof
          ctx!.fillStyle = "rgba(0,0,0,0.2)";
          ctx!.beginPath();
          ctx!.moveTo(dec.x, dec.y);
          ctx!.lineTo(dec.x + dec.w / 2, dec.y - 15);
          ctx!.lineTo(dec.x + dec.w, dec.y);
          ctx!.closePath();
          ctx!.fill();
        } else if (dec.type === "flower") {
          ctx!.beginPath();
          ctx!.arc(dec.x + 5, dec.y + 5, 4, 0, Math.PI * 2);
          ctx!.arc(dec.x + 15, dec.y + 5, 4, 0, Math.PI * 2);
          ctx!.arc(dec.x + 10, dec.y, 4, 0, Math.PI * 2);
          ctx!.arc(dec.x + 10, dec.y + 10, 4, 0, Math.PI * 2);
          ctx!.arc(dec.x + 10, dec.y + 5, 3, 0, Math.PI * 2);
          ctx!.fill();
        } else if (dec.type === "machine" || dec.type === "stall") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
          ctx!.strokeRect(dec.x, dec.y, dec.w, dec.h);
          // Glow
          ctx!.fillStyle = "rgba(255,255,255,0.3)";
          ctx!.fillRect(dec.x + 5, dec.y + 5, dec.w - 10, 8);
        } else if (dec.type === "neon-sign" || dec.type === "awning" || dec.type === "rug" || dec.type === "path") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
        } else if (dec.type === "door") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
          ctx!.fillStyle = "#fbbf24";
          ctx!.beginPath();
          ctx!.arc(dec.x + dec.w - 8, dec.y + dec.h / 2, 2, 0, Math.PI * 2);
          ctx!.fill();
        } else if (dec.type === "blackboard") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
          // Chalk text
          ctx!.fillStyle = "#ffffff";
          ctx!.font = "12px var(--font-geist-sans), sans-serif";
          ctx!.textAlign = "center";
          ctx!.fillText("MATH = MAGIC ✨", dec.x + dec.w / 2, dec.y + dec.h / 2 + 4);
        } else if (dec.type === "desk") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
          ctx!.strokeRect(dec.x, dec.y, dec.w, dec.h);
        } else if (dec.type === "bench") {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
        } else if (dec.type === "fountain") {
          ctx!.fillStyle = dec.color;
          ctx!.beginPath();
          ctx!.ellipse(dec.x + dec.w / 2, dec.y + dec.h / 2, dec.w / 2, dec.h / 2, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = "rgba(255,255,255,0.4)";
          ctx!.beginPath();
          ctx!.ellipse(dec.x + dec.w / 2, dec.y + dec.h / 2, dec.w / 3, dec.h / 3, 0, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.fillRect(dec.x, dec.y, dec.w, dec.h);
        }
      }

      // === Portals ===
      for (const portal of area.portals) {
        if (!inView(portal.x, portal.y, 80)) continue;
        const pulse = Math.sin(animFrame.current * 0.06) * 0.2 + 0.8;
        ctx!.fillStyle = `rgba(168, 85, 247, ${0.3 * pulse})`;
        ctx!.beginPath();
        ctx!.arc(portal.x, portal.y, 30, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = `rgba(168, 85, 247, ${pulse})`;
        ctx!.lineWidth = 3;
        ctx!.stroke();
        // Label (dark pill background for readability)
        ctx!.font = "600 11px var(--font-geist-sans), sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        const labelW = ctx!.measureText(portal.label).width + 14;
        const labelY = portal.y - 40;
        ctx!.fillStyle = "rgba(31, 41, 55, 0.92)";
        roundRect(ctx!, portal.x - labelW / 2, labelY - 9, labelW, 18, 9);
        ctx!.fill();
        ctx!.fillStyle = "#ffffff";
        ctx!.fillText(portal.label, portal.x, labelY);

        // Check if player is on portal — trigger transition directly (debounced)
        const dist = Math.sqrt((portal.x - playerPos.current.x) ** 2 + (portal.y - playerPos.current.y) ** 2);
        if (dist < 35) {
          const now2 = Date.now();
          if (now2 - lastTransitionAt.current > 1500) {
            lastTransitionAt.current = now2;
            // Defer to next tick to avoid setState during render
            setTimeout(() => doAreaTransition(portal.target), 0);
          }
        }
      }

      // === NPCs (with pill background + speech bubble) ===
      for (const npcDef of area.npcs) {
        if (!inView(npcDef.x, npcDef.y, 80)) continue;
        const npc = getNPCBySlug(npcDef.slug);
        if (!npc) continue;
        // Render as a colored circle with emoji
        ctx!.fillStyle = npc.color;
        ctx!.beginPath();
        ctx!.arc(npcDef.x, npcDef.y, 18, 0, Math.PI * 2);
        ctx!.fill();
        // White ring for contrast
        ctx!.strokeStyle = "rgba(255,255,255,0.6)";
        ctx!.lineWidth = 2;
        ctx!.stroke();
        ctx!.font = "24px sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(npc.emoji, npcDef.x, npcDef.y);

        // Name pill (dark rounded rect with white text)
        ctx!.font = "600 11px var(--font-geist-sans), sans-serif";
        const nameW = ctx!.measureText(npc.name).width + 14;
        const nameY = npcDef.y + 32;
        ctx!.fillStyle = "rgba(31, 41, 55, 0.92)";
        roundRect(ctx!, npcDef.x - nameW / 2, nameY - 9, nameW, 18, 9);
        ctx!.fill();
        ctx!.fillStyle = "#ffffff";
        ctx!.fillText(npc.name, npcDef.x, nameY);

        // "Press T to talk" green speech bubble with tail when player is near
        const dist = Math.sqrt((npcDef.x - playerPos.current.x) ** 2 + (npcDef.y - playerPos.current.y) ** 2);
        if (dist < 50) {
          const bob = Math.sin(animFrame.current * 0.1) * 2;
          const bubbleY = npcDef.y - 38 + bob;
          const bubbleText = "Press T to talk";
          ctx!.font = "700 11px var(--font-geist-sans), sans-serif";
          const bw = ctx!.measureText(bubbleText).width + 16;
          const bh = 20;
          // Tail (triangle below bubble)
          ctx!.fillStyle = "#10b981";
          ctx!.beginPath();
          ctx!.moveTo(npcDef.x - 5, bubbleY + bh);
          ctx!.lineTo(npcDef.x + 5, bubbleY + bh);
          ctx!.lineTo(npcDef.x, bubbleY + bh + 6);
          ctx!.closePath();
          ctx!.fill();
          // Bubble body
          roundRect(ctx!, npcDef.x - bw / 2, bubbleY, bw, bh, 10);
          ctx!.fill();
          // Bubble text
          ctx!.fillStyle = "#ffffff";
          ctx!.fillText(bubbleText, npcDef.x, bubbleY + bh / 2 + 1);
        }
      }

      // === Interactables (fountains, chests, wells, teleports, dig sites) ===
      nearestInteractableThisFrame = null;
      let nearestInteractDist = 60;
      for (const it of area.interactables) {
        if (!inView(it.x, it.y, 80)) continue;

        // Cooldown check (visual)
        const lastUsed = interactableCooldownRef.current.get(it.id);
        const onCooldown = lastUsed && (Date.now() - lastUsed) < it.cooldownSec * 1000;

        const pulse = Math.sin(animFrame.current * 0.08) * 0.25 + 0.75;

        // Glow ring under the emoji
        const glowColor = onCooldown ? "rgba(120,120,120,0.4)" : "rgba(255, 215, 0, 0.55)";
        ctx!.fillStyle = glowColor.replace(/[\d.]+\)$/, `${0.25 * pulse})`);
        ctx!.beginPath();
        ctx!.arc(it.x, it.y, 28, 0, Math.PI * 2);
        ctx!.fill();
        // Solid ring
        ctx!.strokeStyle = onCooldown ? "rgba(120,120,120,0.7)" : `rgba(251, 191, 36, ${pulse})`;
        ctx!.lineWidth = 3;
        ctx!.stroke();

        // Emoji
        ctx!.font = "32px sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.globalAlpha = onCooldown ? 0.5 : 1;
        ctx!.fillText(it.emoji, it.x, it.y);
        ctx!.globalAlpha = 1;

        // Label pill (under the emoji)
        ctx!.font = "600 11px var(--font-geist-sans), sans-serif";
        const lblW = ctx!.measureText(it.label).width + 14;
        const lblY = it.y + 28;
        ctx!.fillStyle = "rgba(31, 41, 55, 0.92)";
        roundRect(ctx!, it.x - lblW / 2, lblY - 9, lblW, 18, 9);
        ctx!.fill();
        ctx!.fillStyle = "#ffffff";
        ctx!.fillText(it.label, it.x, lblY);

        // Distance check for "Press T" prompt
        const d = Math.sqrt((it.x - playerPos.current.x) ** 2 + (it.y - playerPos.current.y) ** 2);
        if (d < nearestInteractDist) {
          nearestInteractDist = d;
          nearestInteractableThisFrame = it.id;
        }

        if (d < 60) {
          // "Press T to use" green speech bubble above the interactable
          const bob = Math.sin(animFrame.current * 0.1) * 2;
          const bubbleY = it.y - 42 + bob;
          const bubbleText = onCooldown ? "On cooldown" : "Press T to use";
          ctx!.font = "700 11px var(--font-geist-sans), sans-serif";
          const bw = ctx!.measureText(bubbleText).width + 16;
          const bh = 20;
          // Tail
          ctx!.fillStyle = onCooldown ? "#6b7280" : "#10b981";
          ctx!.beginPath();
          ctx!.moveTo(it.x - 5, bubbleY + bh);
          ctx!.lineTo(it.x + 5, bubbleY + bh);
          ctx!.lineTo(it.x, bubbleY + bh + 6);
          ctx!.closePath();
          ctx!.fill();
          roundRect(ctx!, it.x - bw / 2, bubbleY, bw, bh, 10);
          ctx!.fill();
          ctx!.fillStyle = "#ffffff";
          ctx!.fillText(bubbleText, it.x, bubbleY + bh / 2 + 1);
        }
      }

      // Throttled state update for the nearest-interactable id
      if (now - lastNearUpdate > 100) {
        lastNearUpdate = now;
        if (nearestInteractableThisFrame !== nearInteractableIdRef.current) {
          nearInteractableIdRef.current = nearestInteractableThisFrame;
          // Defer set state to avoid re-rendering the loop
          setTimeout(() => setNearInteractableId(nearestInteractableThisFrame), 0);
        }
      }

      // === Collectibles (floating emoji with bob + glow, auto-collect) ===
      for (const c of area.collectibles) {
        if (isCollected(collectedRef.current, c.id, c.respawnsAfterSec)) continue;
        if (!inView(c.x, c.y, 60)) continue;

        const bob = Math.sin(animFrame.current * 0.08 + c.x * 0.01) * 4;
        const cy = c.y + bob;

        // Glow halo
        const glowAlpha = 0.35 + Math.sin(animFrame.current * 0.1 + c.x) * 0.15;
        const colorByType: Record<string, string> = {
          coin: "rgba(251, 191, 36,",
          gem: "rgba(168, 85, 247,",
          star: "rgba(250, 204, 21,",
          book: "rgba(59, 130, 246,",
          crystal: "rgba(6, 182, 212,",
        };
        ctx!.fillStyle = `${colorByType[c.type] ?? "rgba(255, 215, 0,"} ${glowAlpha})`;
        ctx!.beginPath();
        ctx!.arc(c.x, cy, 18, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = `${colorByType[c.type] ?? "rgba(255, 215, 0,"} ${0.7})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();

        // Emoji
        const emoji = COLLECTIBLE_EMOJI[c.type] ?? "✨";
        ctx!.font = "22px sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(emoji, c.x, cy);

        // Auto-collect on collision
        const d = Math.sqrt((c.x - playerPos.current.x) ** 2 + (cy - playerPos.current.y) ** 2);
        if (d < 25) {
          tryCollectItem(c, c.x, cy);
        }
      }

      // === Ambient particles (per area) ===
      for (const e of ambientRef.current) {
        if (!inView(e.x, e.y, 80)) continue;
        if (area.slug === "park") {
          // Butterflies wander randomly
          e.vx += (Math.random() - 0.5) * 0.15;
          e.vy += (Math.random() - 0.5) * 0.15;
          e.vx = Math.max(-1.2, Math.min(1.2, e.vx));
          e.vy = Math.max(-0.8, Math.min(0.8, e.vy));
          e.x += e.vx;
          e.y += e.vy;
          // Keep within bounds
          if (e.x < 20) { e.x = 20; e.vx = Math.abs(e.vx); }
          if (e.x > area.width - 20) { e.x = area.width - 20; e.vx = -Math.abs(e.vx); }
          if (e.y < 50) { e.y = 50; e.vy = Math.abs(e.vy); }
          if (e.y > area.height - 80) { e.y = area.height - 80; e.vy = -Math.abs(e.vy); }
          ctx!.font = "20px sans-serif";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(e.emoji, e.x, e.y);
        } else if (area.slug === "forest") {
          // Fireflies blink in place
          e.phase += 0.06;
          const blink = (Math.sin(e.phase) + 1) / 2; // 0..1
          ctx!.fillStyle = `rgba(250, 240, 120, ${0.3 + blink * 0.7})`;
          ctx!.beginPath();
          ctx!.arc(e.x, e.y, 3 + blink * 2, 0, Math.PI * 2);
          ctx!.fill();
          // Soft halo
          ctx!.fillStyle = `rgba(250, 240, 120, ${blink * 0.15})`;
          ctx!.beginPath();
          ctx!.arc(e.x, e.y, 12, 0, Math.PI * 2);
          ctx!.fill();
        } else if (area.slug === "beach") {
          // Seagulls fly across
          e.x += e.vx;
          e.y += Math.sin(animFrame.current * 0.05 + e.x * 0.01) * 0.3;
          if (e.x > area.width + 40) {
            e.x = -40;
            e.y = 50 + Math.random() * 150;
          }
          ctx!.font = "22px sans-serif";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(e.emoji, e.x, e.y);
        }
      }

      // === Space: shooting stars ===
      if (area.slug === "space") {
        // Randomly spawn a shooting star
        if (Math.random() < 0.012 && shootingStarsRef.current.length < 4) {
          shootingStarsRef.current.push({
            x: Math.random() * area.width,
            y: -20,
            vx: 4 + Math.random() * 3,
            vy: 2 + Math.random() * 1.5,
            life: 1,
            length: 60 + Math.random() * 40,
          });
        }
        for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
          const s = shootingStarsRef.current[i];
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.012;
          if (s.life <= 0 || s.x > area.width + 100 || s.y > area.height + 100) {
            shootingStarsRef.current.splice(i, 1);
            continue;
          }
          // Draw streak
          const angle = Math.atan2(s.vy, s.vx);
          const tailX = s.x - Math.cos(angle) * s.length;
          const tailY = s.y - Math.sin(angle) * s.length;
          const grad = ctx!.createLinearGradient(s.x, s.y, tailX, tailY);
          grad.addColorStop(0, `rgba(255, 255, 255, ${s.life})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = 2.5;
          ctx!.beginPath();
          ctx!.moveTo(s.x, s.y);
          ctx!.lineTo(tailX, tailY);
          ctx!.stroke();
          // Head dot
          ctx!.fillStyle = `rgba(255, 255, 255, ${s.life})`;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, 2, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // === Other players (remote) ===
      for (const p of players) {
        if (p.userId === user?.id) continue;
        if (!inView(p.x, p.y, 80)) continue;
        const emote = activeEmotes.current.find((e) => e.userId === p.userId);
        renderAvatar({
          ctx: ctx!,
          x: p.x,
          y: p.y,
          size: 40,
          direction: p.direction,
          isMoving: p.isMoving,
          animFrame: animFrame.current,
          displayName: p.displayName,
          showName: true,
          config: p.avatarConfig,
          emote: emote ? emote.emoji : null,
        });
      }

      // === Local player ===
      renderAvatar({
        ctx: ctx!,
        x: playerPos.current.x,
        y: playerPos.current.y,
        size: 40,
        direction: playerPos.current.direction,
        isMoving: playerPos.current.isMoving,
        animFrame: animFrame.current,
        displayName: user?.displayName,
        showName: true,
        isSelected: true,
        config: user?.avatarConfig ?? ({} as any),
      });

      // === Particles (collect/spell effects) ===
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        if (!inView(p.x, p.y, 40)) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.life -= p.decay;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = Math.max(0, p.life);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * p.life + 0.5, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // === Reward pops (floating "+N XP" text) ===
      for (let i = rewardPopsRef.current.length - 1; i >= 0; i--) {
        const rp = rewardPopsRef.current[i];
        rp.life -= 0.018;
        rp.y -= 0.7;
        if (rp.life <= 0) {
          rewardPopsRef.current.splice(i, 1);
          continue;
        }
        ctx!.font = "700 13px var(--font-geist-sans), sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.globalAlpha = Math.min(1, rp.life * 1.5);
        // Outline for readability
        ctx!.strokeStyle = "rgba(0,0,0,0.7)";
        ctx!.lineWidth = 3;
        ctx!.strokeText(rp.text, rp.x, rp.y);
        ctx!.fillStyle = rp.color;
        ctx!.fillText(rp.text, rp.x, rp.y);
      }
      ctx!.globalAlpha = 1;

      ctx!.restore();

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [area, user?.id, players, tryCollectItem, triggerInteractable]);

  // === Handle area transition (called directly from game loop, no effect needed) ===
  const doAreaTransition = useCallback((targetSlug: string) => {
    const targetArea = getAreaBySlug(targetSlug);
    if (!targetArea) return;
    toast.info(`Entering ${targetArea.name}...`);
    changeArea(targetArea.slug, targetArea.spawnPoint.x, targetArea.spawnPoint.y);
    // Update local position via ref (mutation is intentional — playerPos is a high-frequency ref, not state)
    playerPos.current.x = targetArea.spawnPoint.x;
    playerPos.current.y = targetArea.spawnPoint.y;
  }, [changeArea]);

  // Track last portal transition to debounce
  const lastTransitionAt = useRef(0);

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    // Brain Energy cost check
    if ((user?.brainEnergy ?? 0) < 1) {
      toast.error("Out of Brain Energy! Answer some math questions to chat.");
      return;
    }
    sendChat(chatInput);
    setChatInput("");
    // Deduct brain energy locally
    if (user) updateUser({ brainEnergy: Math.max(0, user.brainEnergy - 1) });
  }

  // Other areas to teleport to (skip the current area)
  const teleportDestinations = useMemo(
    () => WORLD_AREAS.filter((a) => a.slug !== area.slug).slice(0, 8),
    [area.slug],
  );

  if (!user) return null;

  return (
    <div className={`relative w-full h-full ${dyslexiaFont ? "dyslexia-font" : ""}`}>
      {/* Top bar: area info, brain energy, players count */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-md border border-white/30 dark:border-white/10 max-w-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{area.name}</div>
                <div className="text-xs text-muted-foreground truncate">{area.description}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-white/30 dark:border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mv-pulse-glow" />
            <span className="text-xs font-semibold">{connected ? "Online" : "Solo"}</span>
          </div>
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-white/30 dark:border-white/10 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold">{players.length + 1}</span>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-amber-500 rounded-xl px-3 py-2 shadow-md flex items-center gap-2">
            <Zap className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">{user.brainEnergy}/{user.maxBrainEnergy}</span>
          </div>
          <div className="hidden sm:flex bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl px-3 py-2 shadow-md items-center gap-2">
            <Coins className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">{user.coins}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block mv-canvas" />
      </div>

      {/* NPC Dialogue */}
      <AnimatePresence>
        {activeNPC && !mathQuestion && !showTeleportMenu && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4"
          >
            <Card className="p-4 shadow-2xl border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3">
                <div className="text-4xl">{getNPCBySlug(activeNPC)?.emoji}</div>
                <div className="flex-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">{getNPCBySlug(activeNPC)?.name}</div>
                  <div className="text-sm mt-1">
                    {getNPCBySlug(activeNPC)?.dialogues[0]?.text}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => setActiveNPC(null)}>
                      <ChevronRight className="w-3 h-3 mr-1" /> Continue exploring
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setView("practice")}>
                      <Gamepad2 className="w-3 h-3 mr-1" /> Practice math
                    </Button>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setActiveNPC(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Math fountain question modal */}
      <AnimatePresence>
        {mathQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
          >
            <Card className="p-5 shadow-2xl border-2 border-amber-300 dark:border-amber-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">⛲</div>
                <div className="flex-1">
                  <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Math Fountain
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Solve to claim +{mathQuestion.rewardXp} XP and +{mathQuestion.rewardCoins} coins
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setMathQuestion(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 mb-3 text-center">
                <div className="text-2xl font-bold tracking-wide">{mathQuestion.prompt}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mathQuestion.options.map((opt) => (
                  <Button
                    key={opt}
                    variant="outline"
                    size="lg"
                    className="text-lg font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400"
                    onClick={() => answerMathQuestion(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teleport pad menu */}
      <AnimatePresence>
        {showTeleportMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowTeleportMenu(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Card className="p-5 shadow-2xl border-2 border-purple-300 dark:border-purple-700 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-purple-600" />
                    <div className="font-bold text-lg">Teleport Pad</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setShowTeleportMenu(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Choose a destination to instantly teleport there:
                </div>
                <ScrollArea className="max-h-80">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-2">
                    {teleportDestinations.map((dest) => (
                      <button
                        key={dest.slug}
                        onClick={() => teleportToArea(dest.slug)}
                        className="text-left p-3 rounded-xl border-2 border-border bg-background hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                      >
                        <div className="font-semibold text-sm truncate">{dest.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{dest.description}</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <div className="absolute bottom-4 right-4 z-20 w-80 max-w-[calc(100vw-2rem)]">
        <Card className="overflow-hidden shadow-2xl border-2 border-white/40 dark:border-white/10">
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="font-bold text-sm">World Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-75">{messages.length}</span>
              {showChat ? <X className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 rotate-90" />}
            </div>
          </button>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <ScrollArea className="h-48 p-3 mv-scroll">
                  {messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      Say hi to other players! 👋
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}
                        >
                          <div className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                            msg.moderationStatus === "BLOCKED"
                              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 italic text-xs"
                              : msg.moderationStatus === "REWRITTEN"
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                              : msg.userId === "system"
                              ? "bg-muted text-muted-foreground text-xs italic"
                              : msg.isOwn
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-foreground"
                          }`}>
                            {msg.userId !== "system" && !msg.isOwn && (
                              <div className="font-semibold text-xs mb-0.5 opacity-75">{msg.displayName}</div>
                            )}
                            <div>{msg.content}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-2 border-t flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                    placeholder="Type a message..."
                    maxLength={280}
                    className="text-sm"
                  />
                  <Button size="icon" onClick={sendChatMessage} disabled={!chatInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* Emote bar */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-2">
        {[
          { slug: "emote-wave", emoji: "👋", label: "Wave" },
          { slug: "emote-dance", emoji: "💃", label: "Dance" },
          { slug: "emote-cheer", emoji: "🎉", label: "Cheer" },
          { slug: "emote-thinking", emoji: "🤔", label: "Think" },
        ].map((e) => (
          <button
            key={e.slug}
            onClick={() => sendEmote(e.slug)}
            className="w-12 h-12 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border border-white/40 dark:border-white/10 flex items-center justify-center text-2xl hover:scale-110 transition-transform"
            title={e.label}
          >
            {e.emoji}
          </button>
        ))}
      </div>

      {/* Mobile controls toggle */}
      <button
        onClick={() => setShowMobileControls(!showMobileControls)}
        className="lg:hidden absolute top-20 right-4 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md flex items-center justify-center"
      >
        <Gamepad2 className="w-5 h-5" />
      </button>

      {/* Mobile joystick */}
      <AnimatePresence>
        {showMobileControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden absolute bottom-24 left-4 z-20"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-32 h-32 rounded-full bg-black/20 backdrop-blur-md relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/80 shadow-md flex items-center justify-center"
                style={{
                  transform: `translate(${joystickOffset.dx * 0.3}px, ${joystickOffset.dy * 0.3}px)`,
                }}
              >
                <Gamepad2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions: Practice + Games */}
      <div className="absolute top-20 left-4 z-20 flex gap-2 flex-wrap">
        <Button
          onClick={() => setView("practice")}
          className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:opacity-90 shadow-lg rounded-full"
          size="sm"
        >
          <Zap className="w-4 h-4 mr-1" /> Practice
        </Button>
        <Button
          onClick={() => setShowGames(true)}
          className="bg-gradient-to-r from-purple-500 to-rose-500 hover:opacity-90 shadow-lg rounded-full"
          size="sm"
        >
          <Gamepad2 className="w-4 h-4 mr-1" /> Games
        </Button>
      </div>

      {/* Hint card: how to interact (auto-dismiss after a few seconds, hides when dialog is open) */}
      {!activeNPC && !mathQuestion && !showTeleportMenu && (
        <div className="absolute top-32 left-4 z-20 hidden sm:block max-w-xs">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-white/30 dark:border-white/10 text-xs">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <Trophy className="w-3 h-3 text-amber-600" /> Explore &amp; Collect
            </div>
            <div className="text-muted-foreground leading-relaxed">
              Walk over <span className="font-semibold">🪙 coins</span>, <span className="font-semibold">💎 gems</span> and <span className="font-semibold">⭐ stars</span> to auto-collect. Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">T</kbd> near <span className="font-semibold">⛲ fountains</span> and <span className="font-semibold">🎁 chests</span> to interact.
            </div>
          </div>
        </div>
      )}

      {/* Floating Who's Online panel */}
      <WhoOnlinePanel />

      {/* Mini-Games Menu */}
      <AnimatePresence>
        {showGames && (
          <MiniGamesMenu onClose={(result) => {
            setShowGames(false);
            if (result.score > 0) {
              updateUser({
                xp: user!.xp + result.xpEarned,
                brainEnergy: Math.min(user!.maxBrainEnergy, user!.brainEnergy + result.brainEnergyEarned),
                coins: user!.coins + result.score,
              });
              toast.success(`🎯 Score: ${result.score} • +${result.xpEarned} XP • +${result.brainEnergyEarned} Brain Energy!`);
            }
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// === Canvas helper: rounded rect (for pill backgrounds) ===
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
