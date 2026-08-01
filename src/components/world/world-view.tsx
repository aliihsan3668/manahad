"use client";

/**
 * MathVerse — Game World View
 *
 * A 2D top-down canvas world where players can:
 *   - Walk around (WASD / arrow keys / touch joystick)
 *   - See other players moving in realtime (via WebSocket)
 *   - Chat with nearby players (chat panel)
 *   - Walk into portals to change areas
 *   - Talk to NPCs (opens dialogue)
 *   - Use emotes
 *
 * The world is rendered on a canvas with requestAnimationFrame.
 * Player position is synced to the server at ~30Hz.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import { useMultiplayerStore } from "@/stores/multiplayer-store";
import { renderAvatar } from "./avatar-renderer";
import { WORLD_AREAS, NPCS, getAreaBySlug, getNPCBySlug } from "@/lib/game/world";
import { toast } from "sonner";
import {
  Send, MapPin, Users, Sparkles, MessageCircle, Gamepad2, X, ChevronRight, Zap,
} from "lucide-react";

interface ActiveEmote {
  userId: string;
  emoji: string;
  startFrame: number;
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
  const playerPos = useRef({ x: 500, y: 400, direction: "down" as const, isMoving: false });
  const keysPressed = useRef<Set<string>>(new Set());
  const animFrame = useRef(0);
  const activeEmotes = useRef<ActiveEmote[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [activeNPC, setActiveNPC] = useState<string | null>(null);

  const area = getAreaBySlug(currentArea) ?? WORLD_AREAS[0];

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

  // === Keyboard input ===
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
      }
      // Quick emotes
      if (key === "e") sendEmote("emote-wave");
      if (key === "r") sendEmote("emote-dance");
      if (key === "t") sendEmote("emote-thinking");
    }
    function onKeyUp(e: KeyboardEvent) {
      keysPressed.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [sendEmote]);

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

      // === Decorations ===
      for (const dec of area.decorations) {
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
        const pulse = Math.sin(animFrame.current * 0.06) * 0.2 + 0.8;
        ctx!.fillStyle = `rgba(168, 85, 247, ${0.3 * pulse})`;
        ctx!.beginPath();
        ctx!.arc(portal.x, portal.y, 30, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = `rgba(168, 85, 247, ${pulse})`;
        ctx!.lineWidth = 3;
        ctx!.stroke();
        // Label
        ctx!.fillStyle = "#1f2937";
        ctx!.font = "600 11px var(--font-geist-sans), sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillText(portal.label, portal.x, portal.y - 35);

        // Check if player is on portal — trigger transition directly (debounced)
        const dist = Math.sqrt((portal.x - playerPos.current.x) ** 2 + (portal.y - playerPos.current.y) ** 2);
        if (dist < 35) {
          const now = Date.now();
          if (now - lastTransitionAt.current > 1500) {
            lastTransitionAt.current = now;
            // Defer to next tick to avoid setState during render
            setTimeout(() => doAreaTransition(portal.target), 0);
          }
        }
      }

      // === NPCs ===
      for (const npcDef of area.npcs) {
        const npc = getNPCBySlug(npcDef.slug);
        if (!npc) continue;
        // Render as a colored circle with emoji
        ctx!.fillStyle = npc.color;
        ctx!.beginPath();
        ctx!.arc(npcDef.x, npcDef.y, 18, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.font = "24px sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(npc.emoji, npcDef.x, npcDef.y);
        // Name
        ctx!.font = "600 10px var(--font-geist-sans), sans-serif";
        ctx!.fillStyle = "#1f2937";
        ctx!.fillText(npc.name, npcDef.x, npcDef.y + 30);

        // "Talk" indicator if player is close
        const dist = Math.sqrt((npcDef.x - playerPos.current.x) ** 2 + (npcDef.y - playerPos.current.y) ** 2);
        if (dist < 50) {
          ctx!.fillStyle = "#10b981";
          ctx!.font = "700 11px var(--font-geist-sans), sans-serif";
          const bob = Math.sin(animFrame.current * 0.1) * 2;
          ctx!.fillText("Press T to talk", npcDef.x, npcDef.y - 30 + bob);
        }
      }

      // === Other players (remote) ===
      for (const p of players) {
        if (p.userId === user?.id) continue;
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

      ctx!.restore();

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [area, user?.id, players]);

  // === Handle "T" to talk to NPC ===
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "t" && !activeNPC) {
        // Find nearby NPC
        for (const npcDef of area.npcs) {
          const dist = Math.sqrt((npcDef.x - playerPos.current.x) ** 2 + (npcDef.y - playerPos.current.y) ** 2);
          if (dist < 50) {
            setActiveNPC(npcDef.slug);
            return;
          }
        }
      }
      if (e.key === "Escape") {
        setActiveNPC(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [area, activeNPC]);

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

  if (!user) return null;

  return (
    <div className={`relative w-full h-full ${dyslexiaFont ? "dyslexia-font" : ""}`}>
      {/* Top bar: area info, brain energy, players count */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-md border border-white/30 dark:border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-bold text-sm">{area.name}</div>
                <div className="text-xs text-muted-foreground">{area.description}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-white/30 dark:border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mv-pulse-glow" />
            <span className="text-xs font-semibold">{connected ? "Online" : "Connecting..."}</span>
          </div>
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-white/30 dark:border-white/10 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold">{players.length + 1}</span>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-amber-500 rounded-xl px-3 py-2 shadow-md flex items-center gap-2">
            <Zap className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">{user.brainEnergy}/{user.maxBrainEnergy}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block mv-canvas" />
      </div>

      {/* NPC Dialogue */}
      <AnimatePresence>
        {activeNPC && (
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

      {/* Quick action: Go to Practice */}
      <div className="absolute top-20 left-4 z-20">
        <Button
          onClick={() => setView("practice")}
          className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:opacity-90 shadow-lg"
          size="sm"
        >
          <Zap className="w-4 h-4 mr-1" /> Practice Math
        </Button>
      </div>
    </div>
  );
}
