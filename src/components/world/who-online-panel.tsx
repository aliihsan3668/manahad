"use client";

/**
 * MANAHAD — Who's Online Panel
 *
 * A floating, collapsible pill that lives on top of the World view:
 *   - Collapsed: "👥 N online" with a green pulsing dot
 *   - Expanded:  scrollable list of online students with avatar emoji stack,
 *                display name, level, area, and a chat button (placeholder).
 *
 * Polls GET /api/online every 15 seconds.
 *
 * Empty state when the current user is alone: "You're the only one here —
 * invite friends!"
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, ChevronDown, ChevronUp, MessageCircle, MapPin,
} from "lucide-react";
import type { AvatarConfig } from "@/lib/types";

interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  level: number;
  area: string;
  isCurrentUser: boolean;
  avatarConfig: AvatarConfig;
}

const POLL_INTERVAL_MS = 15_000;

function emojiForAvatar(cfg: AvatarConfig): string {
  // Light emoji-stack preview similar to avatar-view.tsx
  // (kept simple here; renderAvatar is canvas-based and lives in world-view)
  const hatMap: Record<string, string> = {
    "hat-none": "",
    "hat-cap": "🧢",
    "hat-crown": "👑",
    "hat-wizard": "🧙",
    "hat-graduate": "🎓",
    "hat-headphones": "🎧",
  };
  const petMap: Record<string, string> = {
    "pet-none": "",
    "pet-cat": "🐱",
    "pet-dog": "🐶",
    "pet-dragon": "🐉",
    "pet-robot": "🤖",
    "pet-unicorn": "🦄",
  };
  const hat = hatMap[cfg.hat ?? "hat-none"] ?? "";
  const pet = petMap[cfg.pet ?? "pet-none"] ?? "";
  // Use the pet if present, otherwise hat, otherwise a default face.
  if (pet) return pet;
  if (hat) return hat;
  return "🧒";
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WhoOnlinePanel() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOnline = useCallback(async () => {
    try {
      const res = await fetch("/api/online", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { users: OnlineUser[]; count: number };
      setUsers(data.users);
      setCount(data.count);
    } catch {
      // Silent — don't toast on poll failures.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOnline();
    const id = setInterval(fetchOnline, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOnline]);

  function handleChat(u: OnlineUser) {
    if (u.isCurrentUser) {
      toast.info("That's you! 👋");
      return;
    }
    toast(`Opening chat with @${u.username}…`, {
      description: "World chat is coming soon — for now, wave at them in the world! 👋",
    });
  }

  const others = users.filter((u) => !u.isCurrentUser);

  return (
    <div className="absolute bottom-3 right-3 z-30 w-72 max-w-[calc(100vw-1.5rem)]">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="rounded-3xl border bg-card/95 backdrop-blur shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-amber-500 text-white"
              aria-expanded="true"
              aria-controls="who-online-list"
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
                {count} online
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* List */}
            <div id="who-online-list">
              {loading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-xl" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nobody is here right now.
                </div>
              ) : others.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <div className="text-3xl mb-2">🫖</div>
                  You&apos;re the only one here — invite friends!
                </div>
              ) : (
                <ScrollArea className="max-h-72">
                  <ul className="p-2 space-y-1">
                    {users.map((u) => (
                      <li
                        key={u.id}
                        className={`flex items-center gap-2 p-2 rounded-2xl transition-colors ${
                          u.isCurrentUser
                            ? "bg-emerald-50 dark:bg-emerald-950/40"
                            : "hover:bg-muted/70"
                        }`}
                      >
                        <div
                          className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-200 to-amber-200 dark:from-emerald-900 dark:to-amber-900 flex items-center justify-center text-lg shadow-sm"
                          aria-hidden
                        >
                          {emojiForAvatar(u.avatarConfig)}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">
                            {u.displayName}
                            {u.isCurrentUser && (
                              <span className="text-[10px] text-muted-foreground">(you)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Lv {u.level} · {titleCase(u.area)}</span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full flex-shrink-0"
                          onClick={() => handleChat(u)}
                          aria-label={`Chat with ${u.displayName}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(true)}
            aria-expanded="false"
            aria-controls="who-online-list"
            className="w-full flex items-center justify-between gap-2 pl-3 pr-2 py-2 rounded-full bg-card/95 backdrop-blur border shadow-lg hover:shadow-xl transition-shadow"
          >
            <span className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold">
                {loading ? "…" : `${count} online`}
              </span>
            </span>
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
