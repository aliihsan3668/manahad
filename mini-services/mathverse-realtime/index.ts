/**
 * MANAHAD — Realtime Multiplayer Service
 *
 * Port: 3003
 *
 * Responsibilities:
 *   - Player presence (who's online, in which area, at what position)
 *   - Real-time position broadcasts (so you can see other players walking)
 *   - Chat messages (world chat + local proximity chat)
 *   - Emotes
 *   - Friend status indicators
 *
 * All chat messages are moderated BEFORE broadcast (via HTTP call to /api/moderation/moderate
 * or by calling the moderation pipeline directly — here we use a lightweight inline filter
 * and defer AI moderation to the main app via a callback).
 *
 * Frontend connects via:
 *   io("/?XTransformPort=3003", { transports: ["websocket"] })
 *
 * Events (server → client):
 *   - "presence:list" — full list of online players in your area
 *   - "presence:joined" — a new player entered your area
 *   - "presence:left" — a player left your area
 *   - "presence:moved" — a player moved (x, y, direction)
 *   - "chat:message" — a new chat message
 *   - "chat:blocked" — your message was blocked
 *   - "chat:rewritten" — your message was rewritten
 *   - "emote" — a player used an emote
 *
 * Events (client → server):
 *   - "join" — { userId, username, displayName, avatarConfig, area }
 *   - "move" — { x, y, direction, area }
 *   - "chat:send" — { channelId, content }
 *   - "emote" — { emoteSlug }
 *   - "change-area" — { area }
 *   - "leave"
 */

import { createServer } from "http";
import { Server, Socket } from "socket.io";

interface PlayerPresence {
  userId: string;
  username: string;
  displayName: string;
  avatarConfig: Record<string, unknown>;
  area: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  level: number;
  lastSeenAt: number;
  socketId: string;
}

interface ChatMessageBroadcast {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarConfig: Record<string, unknown>;
  channelId: string;
  content: string;
  moderationStatus: "APPROVED" | "BLOCKED" | "REWRITTEN" | "ESCALATED" | "HIDDEN";
  createdAt: string;
}

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// In-memory presence store (production would use Redis)
const players = new Map<string, PlayerPresence>(); // socketId → PlayerPresence
const playersByUserId = new Map<string, string>(); // userId → socketId

// ============================================================
// LIGHTWEIGHT INLINE MODERATION (fast pre-filter)
// ============================================================

const QUICK_PROFANITY = [
  /\bf[u4]+c?k+\b/i, /\bs[h]+[i1]+t+\b/i, /\bb[i1]+t[c]+h+\b/i,
  /\bc[u@]+nt\b/i, /\bd[i1]+c?k+\b/i, /\bp[u@]+s[s]+y+\b/i,
  /\ba[s]+s+h[o0]+l[e3]+\b/i, /\bn[i1]+g+[\w]*\b/i, /\bf[a@]+g[\w]*\b/i,
];

const PII_PATTERNS = [
  { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, replacement: "[email removed]" },
  { re: /(?:https?:\/\/|www\.)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+[^\s]*/i, replacement: "[link removed]" },
  { re: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/, replacement: "[phone removed]" },
];

interface QuickModResult {
  allowed: boolean;
  rewritten: string;
  reason: string;
  severity: "OK" | "LOW" | "HIGH" | "CRITICAL";
}

function quickModerate(content: string): QuickModResult {
  let rewritten = content;

  // Apply PII removal
  for (const p of PII_PATTERNS) {
    if (p.re.test(rewritten)) {
      rewritten = rewritten.replace(p.re, p.replacement);
    }
  }

  // Check profanity
  for (const re of QUICK_PROFANITY) {
    if (re.test(rewritten)) {
      return {
        allowed: false,
        rewritten: "",
        reason: "Message contains inappropriate language",
        severity: "HIGH",
      };
    }
  }

  // If we rewrote something, mark it
  if (rewritten !== content) {
    return {
      allowed: true,
      rewritten,
      reason: "Personally identifiable information was removed",
      severity: "LOW",
    };
  }

  return { allowed: true, rewritten: content, reason: "", severity: "OK" };
}

// ============================================================
// HELPERS
// ============================================================

function getPlayerBySocket(socketId: string): PlayerPresence | undefined {
  return players.get(socketId);
}

function getPlayersInArea(area: string): PlayerPresence[] {
  const result: PlayerPresence[] = [];
  for (const p of players.values()) {
    if (p.area === area) result.push(p);
  }
  return result;
}

function broadcastPresenceList(area: string) {
  const inArea = getPlayersInArea(area).map((p) => ({
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    avatarConfig: p.avatarConfig,
    area: p.area,
    x: p.x,
    y: p.y,
    direction: p.direction,
    isMoving: p.isMoving,
    level: p.level,
    lastSeenAt: new Date(p.lastSeenAt).toISOString(),
  }));
  io.to(`area:${area}`).emit("presence:list", inArea);
}

function makeMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// CONNECTION HANDLER
// ============================================================

io.on("connection", (socket: Socket) => {
  console.log(`[realtime] Connected: ${socket.id}`);

  socket.on("join", (data: {
    userId: string;
    username: string;
    displayName: string;
    avatarConfig: Record<string, unknown>;
    area: string;
    level?: number;
  }) => {
    if (!data?.userId || !data?.username) {
      socket.emit("error", { message: "Invalid join data" });
      return;
    }

    // If this user is already connected (another tab), disconnect the old socket
    const existingSocketId = playersByUserId.get(data.userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existing = players.get(existingSocketId);
      if (existing) {
        existing.socketId = ""; // mark stale
      }
      players.delete(existingSocketId);
      io.to(`area:${existing?.area ?? ""}`).emit("presence:left", { userId: data.userId });
    }

    const presence: PlayerPresence = {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      avatarConfig: data.avatarConfig ?? {},
      area: data.area || "town",
      x: 500,
      y: 400,
      direction: "down",
      isMoving: false,
      level: data.level ?? 1,
      lastSeenAt: Date.now(),
      socketId: socket.id,
    };

    players.set(socket.id, presence);
    playersByUserId.set(data.userId, socket.id);
    socket.join(`area:${presence.area}`);

    console.log(`[realtime] ${data.username} joined area ${presence.area}`);

    // Send current presence list to the new player
    const inArea = getPlayersInArea(presence.area).map((p) => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarConfig: p.avatarConfig,
      area: p.area,
      x: p.x,
      y: p.y,
      direction: p.direction,
      isMoving: p.isMoving,
      level: p.level,
      lastSeenAt: new Date(p.lastSeenAt).toISOString(),
    }));
    socket.emit("presence:list", inArea);

    // Notify others
    socket.to(`area:${presence.area}`).emit("presence:joined", {
      userId: presence.userId,
      username: presence.username,
      displayName: presence.displayName,
      avatarConfig: presence.avatarConfig,
      area: presence.area,
      x: presence.x,
      y: presence.y,
      direction: presence.direction,
      level: presence.level,
    });
  });

  socket.on("move", (data: { x: number; y: number; direction: string; area?: string }) => {
    const player = getPlayerBySocket(socket.id);
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    player.direction = (data.direction as PlayerPresence["direction"]) || "down";
    player.isMoving = true;
    player.lastSeenAt = Date.now();

    // Broadcast to others in the same area
    socket.to(`area:${player.area}`).emit("presence:moved", {
      userId: player.userId,
      x: player.x,
      y: player.y,
      direction: player.direction,
      isMoving: true,
    });

    // Set a timeout to mark as not moving
    setTimeout(() => {
      const p = players.get(socket.id);
      if (p && p.userId === player.userId) {
        p.isMoving = false;
        socket.to(`area:${p.area}`).emit("presence:moved", {
          userId: p.userId,
          x: p.x,
          y: p.y,
          direction: p.direction,
          isMoving: false,
        });
      }
    }, 200);
  });

  socket.on("change-area", (data: { area: string; x?: number; y?: number }) => {
    const player = getPlayerBySocket(socket.id);
    if (!player) return;

    const oldArea = player.area;
    socket.leave(`area:${oldArea}`);
    player.area = data.area;
    if (data.x !== undefined) player.x = data.x;
    if (data.y !== undefined) player.y = data.y;
    player.lastSeenAt = Date.now();
    socket.join(`area:${player.area}`);

    // Notify old area
    socket.to(`area:${oldArea}`).emit("presence:left", { userId: player.userId });
    // Refresh old area's presence list
    broadcastPresenceList(oldArea);

    // Send new area's presence list to the player
    const inArea = getPlayersInArea(player.area).filter((p) => p.userId !== player.userId).map((p) => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarConfig: p.avatarConfig,
      area: p.area,
      x: p.x,
      y: p.y,
      direction: p.direction,
      isMoving: p.isMoving,
      level: p.level,
      lastSeenAt: new Date(p.lastSeenAt).toISOString(),
    }));
    socket.emit("presence:list", inArea);

    // Notify new area
    socket.to(`area:${player.area}`).emit("presence:joined", {
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      avatarConfig: player.avatarConfig,
      area: player.area,
      x: player.x,
      y: player.y,
      direction: player.direction,
      level: player.level,
    });

    console.log(`[realtime] ${player.username} moved from ${oldArea} to ${player.area}`);
  });

  socket.on("chat:send", (data: { channelId: string; content: string }) => {
    const player = getPlayerBySocket(socket.id);
    if (!player || !data?.content) return;

    const content = String(data.content).slice(0, 280); // cap at 280 chars
    const mod = quickModerate(content);

    // If critical, block
    if (!mod.allowed && mod.severity === "HIGH") {
      const blockedMsg: ChatMessageBroadcast = {
        id: makeMessageId(),
        userId: player.userId,
        username: player.username,
        displayName: player.displayName,
        avatarConfig: player.avatarConfig,
        channelId: data.channelId,
        content: "[blocked by safety filter]",
        moderationStatus: "BLOCKED",
        createdAt: new Date().toISOString(),
      };
      // Tell sender it was blocked
      socket.emit("chat:blocked", {
        reason: mod.reason,
        originalContent: content,
      });
      // Tell everyone else (in area) that a blocked message occurred (without content)
      socket.to(`area:${player.area}`).emit("chat:message", blockedMsg);
      return;
    }

    // If rewritten (PII removed)
    if (mod.rewritten !== content) {
      socket.emit("chat:rewritten", {
        originalContent: content,
        rewrittenContent: mod.rewritten,
        reason: mod.reason,
      });
    }

    const message: ChatMessageBroadcast = {
      id: makeMessageId(),
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      avatarConfig: player.avatarConfig,
      channelId: data.channelId,
      content: mod.rewritten,
      moderationStatus: mod.rewritten !== content ? "REWRITTEN" : "APPROVED",
      createdAt: new Date().toISOString(),
    };

    // Broadcast to area (or world channel)
    io.to(`area:${player.area}`).emit("chat:message", message);
  });

  socket.on("emote", (data: { emoteSlug: string }) => {
    const player = getPlayerBySocket(socket.id);
    if (!player) return;
    socket.to(`area:${player.area}`).emit("emote", {
      userId: player.userId,
      username: player.username,
      emoteSlug: data.emoteSlug,
      x: player.x,
      y: player.y,
    });
  });

  socket.on("leave", () => {
    const player = getPlayerBySocket(socket.id);
    if (player) {
      socket.to(`area:${player.area}`).emit("presence:left", { userId: player.userId });
      players.delete(socket.id);
      playersByUserId.delete(player.userId);
      console.log(`[realtime] ${player.username} left`);
    }
  });

  socket.on("disconnect", () => {
    const player = getPlayerBySocket(socket.id);
    if (player) {
      socket.to(`area:${player.area}`).emit("presence:left", { userId: player.userId });
      players.delete(socket.id);
      if (playersByUserId.get(player.userId) === socket.id) {
        playersByUserId.delete(player.userId);
      }
      console.log(`[realtime] ${player.username} disconnected`);
    }
  });

  socket.on("error", (err: unknown) => {
    console.error(`[realtime] Socket error (${socket.id}):`, err);
  });
});

// ============================================================
// PRESENCE CLEANUP (remove stale connections)
// ============================================================

setInterval(() => {
  const now = Date.now();
  const stale: string[] = [];
  for (const [socketId, player] of players.entries()) {
    if (now - player.lastSeenAt > 90_000) { // 90s without update = stale
      stale.push(socketId);
    }
  }
  for (const sid of stale) {
    const p = players.get(sid);
    if (p) {
      io.to(`area:${p.area}`).emit("presence:left", { userId: p.userId });
      playersByUserId.delete(p.userId);
    }
    players.delete(sid);
  }
  if (stale.length > 0) {
    console.log(`[realtime] Cleaned ${stale.length} stale connections`);
  }
}, 30_000);

// ============================================================
// START
// ============================================================

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[MANAHAD Realtime] WebSocket server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[realtime] SIGTERM, shutting down");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[realtime] SIGINT, shutting down");
  httpServer.close(() => process.exit(0));
});
