"use client";

/**
 * MANAHAD — Progress Dashboard
 *
 * Hero card with level / XP / streak / brain energy.
 * Stats grid (answered, accuracy, avg speed, time spent).
 * Strongest / weakest topics.
 * Active quests with claim buttons.
 * Recent achievements.
 * Weekly activity bar chart (Recharts).
 * Mastery heatmap.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Trophy, Flame, Brain, Zap, Target, TrendingUp, TrendingDown, Award,
  Clock, CheckCircle2, Loader2, ArrowLeft, Gift, BarChart3,
} from "lucide-react";
import type { ProgressDashboard, QuestDTO, MasteryDTO, AchievementDTO } from "@/lib/types";

const RARITY_BADGE: Record<string, string> = {
  COMMON: "bg-slate-100 text-slate-700",
  RARE: "bg-sky-100 text-sky-700",
  EPIC: "bg-purple-100 text-purple-700",
  LEGENDARY: "bg-amber-100 text-amber-700",
};

export function ProgressView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<ProgressDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/progress");
      const d = await res.json();
      if (res.ok) setData(d as ProgressDashboard);
      else toast.error(d.error ?? "Could not load progress");
    } catch {
      toast.error("Network error loading progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function claimQuest(quest: QuestDTO) {
    setClaimingId(quest.id);
    try {
      const res = await fetch("/api/quests/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Claim failed");
      toast.success(`🎁 +${d.rewards.xp} XP, +${d.rewards.coins} coins, +${d.rewards.brainEnergy} Brain Energy!`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim");
    } finally {
      setClaimingId(null);
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
        <Skeleton className="h-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const accuracyPct = Math.round(data.accuracy * 100);
  const nextLevelPct = Math.round(data.levelProgress * 100);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-600" /> Your Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your growth, claim rewards, and master math.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("quests")}>
            <Award className="w-4 h-4 mr-1" /> Quests & Achievements
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView("world")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </div>

      {/* Hero card */}
      <Card className="mb-6 border-2 bg-gradient-to-r from-amber-50 via-emerald-50 to-sky-50 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-sky-950/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg"
              >
                {data.level}
              </motion.div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Level</p>
                <p className="text-2xl font-bold">{data.level}</p>
                <p className="text-sm text-muted-foreground">{data.totalXp.toLocaleString()} total XP</p>
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress to level {data.level + 1}</span>
                <span className="font-medium">{nextLevelPct}%</span>
              </div>
              <Progress value={nextLevelPct} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat icon={Flame} value={data.streak} label="Streak" color="text-rose-600" />
              <MiniStat icon={Brain} value={`${data.brainEnergy}/${data.maxBrainEnergy}`} label="Brain" color="text-emerald-600" />
              <MiniStat icon={Zap} value={data.totalXp} label="XP" color="text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Target} label="Questions Answered" value={data.questionsAnswered} color="text-emerald-600" />
        <StatCard icon={CheckCircle2} label="Accuracy" value={`${accuracyPct}%`} color="text-amber-600" />
        <StatCard icon={Clock} label="Avg Speed" value={`${data.avgSpeedSec.toFixed(1)}s`} color="text-sky-600" />
        <StatCard icon={BarChart3} label="Weekly XP" value={data.weeklyActivity.reduce((s, d) => s + d.xpEarned, 0)} color="text-purple-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Strongest topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Strongest Topics
            </CardTitle>
            <CardDescription>Where you shine brightest.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.strongestTopics.length === 0 ? (
              <EmptyState text="Practice a topic to see your strengths!" />
            ) : (
              data.strongestTopics.map((t) => <MasteryRow key={t.topicId} topic={t} />)
            )}
          </CardContent>
        </Card>

        {/* Weakest topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" /> Needs Work
            </CardTitle>
            <CardDescription>Topics that need a bit more practice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.weakestTopics.length === 0 ? (
              <EmptyState text="No weak topics — keep it up!" />
            ) : (
              data.weakestTopics.map((t) => <MasteryRow key={t.topicId} topic={t} weak />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" /> Weekly Activity
          </CardTitle>
          <CardDescription>Questions answered per day (last 7 days).</CardDescription>
        </CardHeader>
        <CardContent>
          {data.weeklyActivity.length === 0 ? (
            <EmptyState text="No activity yet — answer a question to get started!" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <RTooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v: number) => [`${v} questions`, "Answered"]}
                    labelFormatter={(l: string) => `Date: ${l}`}
                  />
                  <Bar dataKey="questionsAnswered" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Active quests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" /> Active Quests
            </CardTitle>
            <CardDescription>Complete and claim rewards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activeQuests.length === 0 ? (
              <EmptyState text="No active quests. Check back later!" />
            ) : (
              data.activeQuests.map((q) => (
                <QuestRow key={q.id} quest={q} onClaim={() => claimQuest(q)} claiming={claimingId === q.id} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" /> Recent Achievements
            </CardTitle>
            <CardDescription>Your latest unlocked badges.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentAchievements.length === 0 ? (
              <EmptyState text="No achievements yet — keep practicing!" />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {data.recentAchievements.map((a) => <AchievementRow key={a.id} ach={a} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mastery heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-600" /> Mastery Map
          </CardTitle>
          <CardDescription>At-a-glance mastery across all topics.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.masteryMap.length === 0 ? (
            <EmptyState text="Answer some questions to populate your mastery map!" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {data.masteryMap.map((m) => (
                <MasteryCell key={m.topicSlug} {...m} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
            <span>Low</span>
            <div className="flex">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                <div
                  key={v}
                  className="w-6 h-3"
                  style={{ background: masteryColor(v) }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span>High</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================
function MiniStat({ icon: Icon, value, label, color }: {
  icon: typeof Flame; value: string | number; label: string; color: string;
}) {
  return (
    <div>
      <Icon className={`w-5 h-5 mx-auto ${color}`} />
      <p className="font-bold text-base mt-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Target; label: string; value: string | number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-9 h-9 ${color}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MasteryRow({ topic, weak }: { topic: MasteryDTO; weak?: boolean }) {
  const pct = Math.round(topic.masteryScore * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium flex items-center gap-1">
          {weak && <TrendingDown className="w-3 h-3 text-rose-500" />}
          {topic.topicName}
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className={`h-2 ${weak ? "[&>div]:bg-rose-500" : ""}`} />
      <p className="text-[10px] text-muted-foreground mt-1">
        {topic.correctCount}/{topic.attemptsCount} correct • avg {topic.avgTimeSec.toFixed(0)}s
      </p>
    </div>
  );
}

function QuestRow({ quest, onClaim, claiming }: {
  quest: QuestDTO; onClaim: () => void; claiming: boolean;
}) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  return (
    <div className={`rounded-lg border p-3 ${quest.completed ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div>
          <p className="font-medium text-sm">{quest.title}</p>
          <p className="text-xs text-muted-foreground">{quest.description}</p>
        </div>
        <Badge variant="outline" className="text-[10px]">{quest.questType}</Badge>
      </div>
      <Progress value={pct} className="h-2 my-2" />
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {quest.progress}/{quest.target} • +{quest.xpReward} XP, +{quest.coinsReward}🪙, +{quest.brainEnergyReward}🧠
        </span>
        {quest.completed && !quest.claimed && (
          <Button size="sm" onClick={onClaim} disabled={claiming}>
            {claiming ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Gift className="w-3 h-3 mr-1" />}
            Claim
          </Button>
        )}
        {quest.claimed && <Badge variant="secondary">Claimed</Badge>}
      </div>
    </div>
  );
}

function AchievementRow({ ach }: { ach: AchievementDTO }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
      <div className="text-2xl">{ach.icon || "🏆"}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{ach.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{ach.description}</p>
      </div>
      <Badge className={`text-[10px] ${RARITY_BADGE[ach.rarity] ?? RARITY_BADGE.COMMON}`}>{ach.rarity}</Badge>
    </div>
  );
}

function MasteryCell({ topicSlug, topicName, mastery }: {
  topicSlug: string; topicName: string; mastery: number;
}) {
  return (
    <div
      className="rounded-md p-2 text-white"
      style={{ background: masteryColor(mastery) }}
      title={`${topicName}: ${Math.round(mastery * 100)}%`}
    >
      <p className="text-[10px] font-medium line-clamp-2 leading-tight">{topicName}</p>
      <p className="text-xs font-bold mt-0.5">{Math.round(mastery * 100)}%</p>
      <span className="sr-only">{topicSlug} mastery {Math.round(mastery * 100)} percent</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-sm text-muted-foreground">{text}</div>
  );
}

function masteryColor(v: number): string {
  if (v >= 0.85) return "#059669";
  if (v >= 0.6) return "#10b981";
  if (v >= 0.4) return "#f59e0b";
  if (v >= 0.2) return "#f97316";
  return "#dc2626";
}

export default ProgressView;
