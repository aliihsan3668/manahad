"use client";

/**
 * MathVerse — Leaderboard View
 *
 * Fetches /api/leaderboard?limit=20 and shows:
 *   - Top 3 podium (gold / silver / bronze)
 *   - Ranked list below
 *   - Current user's row highlighted
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Trophy, Medal, ArrowLeft, Crown, RefreshCw, Loader2, Zap, Star,
} from "lucide-react";
import type { AvatarConfig } from "@/lib/types";

interface LeaderRow {
  userId: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  avatarConfig: AvatarConfig;
}

const PODIUM_STYLES = [
  {
    rank: 1,
    label: "🥇",
    bg: "from-amber-300 to-yellow-500",
    ring: "ring-amber-400",
    text: "text-amber-700",
    height: "md:h-56",
    delay: 0,
  },
  {
    rank: 2,
    label: "🥈",
    bg: "from-slate-300 to-slate-400",
    ring: "ring-slate-400",
    text: "text-slate-700",
    height: "md:h-44",
    delay: 0.1,
  },
  {
    rank: 3,
    label: "🥉",
    bg: "from-orange-300 to-orange-500",
    ring: "ring-orange-400",
    text: "text-orange-700",
    height: "md:h-36",
    delay: 0.2,
  },
];

export function LeaderboardView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard?limit=20");
      const d = await res.json();
      if (res.ok) setRows(d.leaderboard ?? []);
      else toast.error(d.error ?? "Could not load leaderboard");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const myRow = rows.find((r) => r.userId === user?.id);
  const myRank = rows.findIndex((r) => r.userId === user?.id) + 1;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-600" /> Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top math learners across MathVerse.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView("world")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-48" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No players ranked yet — be the first!
          </CardContent>
        </Card>
      ) : (
        <>
          {/* My rank banner */}
          {myRow && (
            <Card className="mb-6 border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/20">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                    #{myRank}
                  </div>
                  <div>
                    <p className="font-semibold">You — {myRow.displayName}</p>
                    <p className="text-xs text-muted-foreground">Level {myRow.level} • {myRow.xp.toLocaleString()} XP</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setView("practice")}>
                  <Zap className="w-4 h-4 mr-1" /> Practice to climb
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Podium */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 items-end">
            {rows.slice(0, 3).map((r, idx) => {
              const style = PODIUM_STYLES[idx];
              const isMe = r.userId === user?.id;
              return (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: style.delay }}
                  className={`flex flex-col items-center ${idx === 0 ? "order-2" : idx === 1 ? "order-1" : "order-3"}`}
                >
                  {/* Avatar */}
                  <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${style.bg} flex items-center justify-center text-2xl md:text-3xl shadow-lg ring-4 ${style.ring} mb-2`}>
                    {isMe ? "⭐" : "🧒"}
                    {idx === 0 && (
                      <Crown className="absolute -top-5 w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  {/* Podium block */}
                  <div className={`w-full ${style.height} bg-gradient-to-b ${style.bg} rounded-t-lg flex flex-col items-center justify-start pt-2 px-1 shadow-md`}>
                    <span className="text-2xl md:text-3xl">{style.label}</span>
                    <p className="font-bold text-xs md:text-sm text-center text-white line-clamp-1 mt-1">
                      {r.displayName}
                    </p>
                    <p className="text-[10px] md:text-xs text-white/90">
                      Lvl {r.level} • {r.xp.toLocaleString()} XP
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Ranked list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-600" /> Full Ranking
              </CardTitle>
              <CardDescription>Top {rows.length} players by XP.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {rows.slice(3).map((r, idx) => {
                  const rank = idx + 4;
                  const isMe = r.userId === user?.id;
                  return (
                    <motion.div
                      key={r.userId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                      className={`flex items-center justify-between p-3 ${isMe ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? "bg-emerald-500 text-white" : "bg-muted"}`}>
                          {rank}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-sm">
                          {isMe ? "⭐" : "🧒"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {r.displayName}
                            {isMe && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}
                          </p>
                          <p className="text-[10px] text-muted-foreground">@{r.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="gap-1">
                          <Star className="w-3 h-3 text-amber-500" /> Lvl {r.level}
                        </Badge>
                        <span className="text-sm font-semibold tabular-nums w-16 text-right">
                          {r.xp.toLocaleString()} XP
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default LeaderboardView;
