"use client";

/**
 * MANAHAD — Quests & Achievements View
 *
 * Two tabs:
 *   - Quests: daily / weekly / monthly with progress, reward info, claim buttons
 *   - Achievements: grid of ALL achievements from the catalog (locked + unlocked),
 *     pulled with progress from /api/progress.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Award, Gift, Loader2, ArrowLeft, CheckCircle2, Lock, Zap, Coins, Brain,
  Calendar, Flame, Target, Crown, Trophy,
} from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import type { AchievementDef } from "@/lib/game/achievements";
import type { QuestDTO, AchievementDTO, ProgressDashboard } from "@/lib/types";

const RARITY_BADGE: Record<string, string> = {
  COMMON: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  RARE: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  EPIC: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  LEGENDARY: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const RARITY_RING: Record<string, string> = {
  COMMON: "border-slate-300 dark:border-slate-700",
  RARE: "border-sky-400",
  EPIC: "border-purple-400",
  LEGENDARY: "border-amber-400",
};

const QUEST_TYPE_ICON: Record<string, typeof Calendar> = {
  DAILY: Calendar,
  WEEKLY: Calendar,
  MONTHLY: Calendar,
  SEASONAL: Crown,
};

export function QuestsView() {
  const setView = useAppStore((s) => s.setView);
  const [quests, setQuests] = useState<QuestDTO[]>([]);
  const [progress, setProgress] = useState<ProgressDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, pRes] = await Promise.all([
        fetch("/api/quests"),
        fetch("/api/progress"),
      ]);
      const qData = await qRes.json();
      const pData = await pRes.json();
      if (qRes.ok) setQuests(qData.quests ?? []);
      if (pRes.ok) setProgress(pData as ProgressDashboard);
    } catch {
      toast.error("Could not load quests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function claim(quest: QuestDTO) {
    setClaimingId(quest.id);
    try {
      const res = await fetch("/api/quests/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Claim failed");
      toast.success(`🎁 Claimed: +${d.rewards.xp} XP, +${d.rewards.coins}🪙, +${d.rewards.brainEnergy}🧠`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim");
    } finally {
      setClaimingId(null);
    }
  }

  // Compute achievement progress map (unlocked slugs + recent for completion)
  const achievementMap = useMemo(() => {
    const map = new Map<string, AchievementDTO>();
    progress?.recentAchievements.forEach((a) => map.set(a.slug, a));
    return map;
  }, [progress]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
        <Skeleton className="h-16 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-600" /> Quests & Achievements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete quests and unlock badges to earn rewards.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setView("world")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <Tabs defaultValue="quests">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="quests"><Gift className="w-4 h-4 mr-1" /> Quests</TabsTrigger>
          <TabsTrigger value="achievements"><Award className="w-4 h-4 mr-1" /> Achievements</TabsTrigger>
        </TabsList>

        {/* ============== QUESTS ============== */}
        <TabsContent value="quests" className="space-y-4">
          {quests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active quests right now. Check back tomorrow!
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {quests.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  onClaim={() => claim(q)}
                  claiming={claimingId === q.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============== ACHIEVEMENTS ============== */}
        <TabsContent value="achievements">
          <Card className="mb-4">
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                <span className="font-semibold">
                  {achievementMap.size} / {ACHIEVEMENTS.length} unlocked
                </span>
              </div>
              <Progress
                value={(achievementMap.size / ACHIEVEMENTS.length) * 100}
                className="flex-1 min-w-[200px] h-2"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((def, i) => (
              <AchievementCard
                key={def.slug}
                def={def}
                unlocked={achievementMap.get(def.slug)}
                index={i}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Quest Card
// ============================================================
function QuestCard({ quest, onClaim, claiming }: {
  quest: QuestDTO; onClaim: () => void; claiming: boolean;
}) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  const Icon = QUEST_TYPE_ICON[quest.questType] ?? Target;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`h-full border-2 ${quest.completed && !quest.claimed ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-purple-600" />
              <div>
                <CardTitle className="text-base">{quest.title}</CardTitle>
                <CardDescription className="text-xs">{quest.description}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{quest.questType}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{quest.progress}/{quest.target}</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="secondary" className="gap-1"><Zap className="w-3 h-3 text-amber-500" />{quest.xpReward} XP</Badge>
            <Badge variant="secondary" className="gap-1"><Coins className="w-3 h-3 text-yellow-500" />{quest.coinsReward}</Badge>
            <Badge variant="secondary" className="gap-1"><Brain className="w-3 h-3 text-emerald-500" />{quest.brainEnergyReward}</Badge>
          </div>
          {quest.endsAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Ends {new Date(quest.endsAt).toLocaleDateString()}
            </p>
          )}
          {quest.completed && !quest.claimed && (
            <Button onClick={onClaim} disabled={claiming} className="w-full" size="sm">
              {claiming ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Gift className="w-3 h-3 mr-1" />}
              Claim Rewards
            </Button>
          )}
          {quest.claimed && (
            <div className="flex items-center justify-center text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Rewards claimed
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Achievement Card
// ============================================================
function AchievementCard({ def, unlocked, index }: {
  def: AchievementDef;
  unlocked?: AchievementDTO;
  index: number;
}) {
  const isUnlocked = !!unlocked?.completed;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -2 }}
    >
      <Card className={`h-full border-2 ${RARITY_RING[def.rarity]} ${isUnlocked ? "" : "opacity-70"}`}>
        <CardContent className="p-3 flex flex-col items-center text-center h-full">
          <div className={`relative w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-2 ${isUnlocked ? "bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950 dark:to-rose-950" : "bg-muted grayscale"}`}>
            {isUnlocked ? def.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
            {isUnlocked && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3" />
              </div>
            )}
          </div>
          <p className="font-semibold text-xs leading-tight">{def.name}</p>
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 flex-1">{def.description}</p>
          <Badge className={`text-[10px] mt-2 ${RARITY_BADGE[def.rarity]}`}>{def.rarity}</Badge>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{def.xpReward}</span>
            <span className="flex items-center gap-0.5"><Coins className="w-3 h-3" />{def.coinsReward}</span>
          </div>
          {unlocked?.completedAt && (
            <p className="text-[9px] text-emerald-600 mt-1">
              {new Date(unlocked.completedAt).toLocaleDateString()}
            </p>
          )}
          {unlocked && !isUnlocked && unlocked.progress > 0 && (
            <div className="w-full mt-2">
              <Progress value={unlocked.progress * 100} className="h-1.5" />
              <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(unlocked.progress * 100)}%</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default QuestsView;
