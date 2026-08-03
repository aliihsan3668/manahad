/**
 * MANAHAD — Multiplayer Store
 *
 * Tracks live presence and chat via socket.io connection.
 * Connects to the mini-service at port 3003 via the gateway.
 */

import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { AvatarConfig, ChatMessageDTO, PlayerPresence } from "@/lib/types";

interface MultiplayerState {
  socket: Socket | null;
  connected: boolean;
  players: PlayerPresence[];
  messages: ChatMessageDTO[];
  currentArea: string;

  connect: (opts: {
    userId: string;
    username: string;
    displayName: string;
    avatarConfig: AvatarConfig;
    area: string;
    level: number;
  }) => void;
  disconnect: () => void;
  moveTo: (x: number, y: number, direction: string) => void;
  changeArea: (area: string, x?: number, y?: number) => void;
  sendChat: (content: string, channelId?: string) => void;
  sendEmote: (emoteSlug: string) => void;
  clearMessages: () => void;
}

let lastMoveAt = 0;

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  socket: null,
  connected: false,
  players: [],
  messages: [],
  currentArea: "town",

  connect: ({ userId, username, displayName, avatarConfig, area, level }) => {
    // Don't double-connect
    if (get().socket?.connected) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      timeout: 10000,
    });

    socket.on("connect", () => {
      set({ connected: true });
      socket.emit("join", {
        userId,
        username,
        displayName,
        avatarConfig,
        area,
        level,
      });
    });

    socket.on("disconnect", () => {
      set({ connected: false, players: [] });
    });

    socket.on("presence:list", (players: PlayerPresence[]) => {
      set({ players });
    });

    socket.on("presence:joined", (player: PlayerPresence) => {
      set((state) => {
        if (state.players.find((p) => p.userId === player.userId)) {
          // Update in place
          return {
            players: state.players.map((p) =>
              p.userId === player.userId ? { ...p, ...player } : p
            ),
          };
        }
        return { players: [...state.players, player] };
      });
    });

    socket.on("presence:left", ({ userId }: { userId: string }) => {
      set((state) => ({
        players: state.players.filter((p) => p.userId !== userId),
      }));
    });

    socket.on("presence:moved", (data: {
      userId: string;
      x: number;
      y: number;
      direction: string;
      isMoving: boolean;
    }) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.userId === data.userId
            ? { ...p, x: data.x, y: data.y, direction: data.direction as PlayerPresence["direction"], isMoving: data.isMoving }
            : p
        ),
      }));
    });

    socket.on("chat:message", (msg: ChatMessageDTO) => {
      set((state) => ({
        messages: [...state.messages.slice(-99), msg],
      }));
    });

    socket.on("chat:blocked", (data: { reason: string; originalContent: string }) => {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `blocked-${Date.now()}`,
            userId: "system",
            username: "System",
            displayName: "Safety",
            avatarConfig: {} as AvatarConfig,
            channelId: "world",
            content: `Your message was blocked: ${data.reason}`,
            moderationStatus: "BLOCKED",
            createdAt: new Date().toISOString(),
            isOwn: true,
          },
        ],
      }));
    });

    socket.on("chat:rewritten", (data: { originalContent: string; rewrittenContent: string; reason: string }) => {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `rewrite-${Date.now()}`,
            userId: "system",
            username: "System",
            displayName: "Safety",
            avatarConfig: {} as AvatarConfig,
            channelId: "world",
            content: `Message auto-edited: ${data.reason}`,
            moderationStatus: "REWRITTEN",
            createdAt: new Date().toISOString(),
            isOwn: true,
          },
        ],
      }));
    });

    socket.on("emote", (data: { userId: string; username: string; emoteSlug: string; x: number; y: number }) => {
      // We'll handle the visual emote in the world canvas
      window.dispatchEvent(new CustomEvent("mv:emote", { detail: data }));
    });

    set({ socket, currentArea: area });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.emit("leave");
      socket.disconnect();
    }
    set({ socket: null, connected: false, players: [], messages: [] });
  },

  moveTo: (x, y, direction) => {
    const now = Date.now();
    // Throttle to ~30Hz
    if (now - lastMoveAt < 33) return;
    lastMoveAt = now;

    const { socket, currentArea } = get();
    if (socket?.connected) {
      socket.emit("move", { x, y, direction, area: currentArea });
    }
  },

  changeArea: (area, x, y) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit("change-area", { area, x, y });
      set({ currentArea: area, messages: [] });
    }
  },

  sendChat: (content, channelId = "world") => {
    const { socket, currentArea } = get();
    if (socket?.connected && content.trim()) {
      socket.emit("chat:send", { channelId, content: content.trim(), area: currentArea });
    }
  },

  sendEmote: (emoteSlug) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit("emote", { emoteSlug });
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
