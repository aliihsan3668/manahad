/**
 * GET /api/progress
 * Full progress dashboard for the current user.
 */
import { NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { xpForNextLevel } from "@/lib/learning/adaptive";
import type {
  ProgressDashboard,
  MasteryDTO,
  AchievementDTO,
  QuestDTO,
} from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();

    const [attempts, mastery, userAchievements, userQuests, dailyStats, userRow] =
      await Promise.all([
        db.attempt.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.mastery.findMany({
          where: { userId: user.id },
          include: { topic: true },
        }),
        db.userAchievement.findMany({
          where: { userId: user.id, completed: true },
          include: { achievement: true },
          orderBy: { completedAt: "desc" },
        }),
        db.userQuest.findMany({
          where: { userId: user.id },
          include: { quest: true },
        }),
        db.dailyStat.findMany({
          where: { userId: user.id },
          orderBy: { date: "desc" },
          take: 7,
        }),
        db.user.findUnique({ where: { id: user.id } }),
      ]);

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const questionsAnswered = attempts.length;
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const accuracy = questionsAnswered > 0 ? correctCount / questionsAnswered : 0;
    const avgSpeedSec = questionsAnswered > 0
      ? attempts.reduce((sum, a) => sum + a.timeTakenSec, 0) / questionsAnswered
      : 0;

    const lvl = xpForNextLevel(userRow.xp);

    const masteryDTOs: MasteryDTO[] = mastery.map((m) => ({
      topicId: m.topicId,
      topicName: m.topic.name,
      topicSlug: m.topic.slug,
      masteryScore: m.masteryScore,
      attemptsCount: m.attemptsCount,
      correctCount: m.correctCount,
      avgTimeSec: m.avgTimeSec,
      lastReviewedAt: m.lastReviewedAt.toISOString(),
      nextReviewAt: m.nextReviewAt.toISOString(),
      isWeak: m.isWeak,
      isMastered: m.isMastered,
      confidenceScore: m.confidenceScore,
    }));

    const strongestTopics = [...masteryDTOs]
      .sort((a, b) => b.masteryScore - a.masteryScore)
      .slice(0, 3);
    const weakestTopics = masteryDTOs
      .filter((m) => m.isWeak)
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, 3);

    const recentAchievements: AchievementDTO[] = userAchievements.slice(0, 5).map((ua) => ({
      id: ua.achievementId,
      slug: ua.achievement.slug,
      name: ua.achievement.name,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      category: ua.achievement.category,
      rarity: ua.achievement.rarity,
      xpReward: ua.achievement.xpReward,
      coinsReward: ua.achievement.coinsReward,
      progress: ua.progress,
      completed: ua.completed,
      completedAt: ua.completedAt ? ua.completedAt.toISOString() : null,
    }));

    const activeQuests: QuestDTO[] = userQuests
      .filter((uq) => !uq.completed)
      .map((uq) => ({
        id: uq.questId,
        slug: uq.quest.slug,
        title: uq.quest.title,
        description: uq.quest.description,
        questType: uq.quest.questType,
        category: uq.quest.category,
        target: uq.quest.target,
        progress: uq.progress,
        completed: uq.completed,
        claimed: uq.claimedAt !== null,
        xpReward: uq.quest.xpReward,
        coinsReward: uq.quest.coinsReward,
        brainEnergyReward: uq.quest.brainEnergyReward,
        endsAt: uq.quest.endsAt ? uq.quest.endsAt.toISOString() : null,
      }));

    const weeklyActivity = dailyStats
      .slice()
      .reverse()
      .map((d) => ({
        date: d.date,
        questionsAnswered: d.questionsAnswered,
        xpEarned: d.xpEarned,
      }));

    const masteryMap = mastery.map((m) => ({
      topicSlug: m.topic.slug,
      topicName: m.topic.name,
      mastery: m.masteryScore,
      grade: 6,
    }));

    const dashboard: ProgressDashboard = {
      totalXp: userRow.xp,
      level: userRow.level,
      levelProgress: lvl.progress,
      streak: userRow.streak,
      questionsAnswered,
      accuracy,
      avgSpeedSec,
      brainEnergy: userRow.brainEnergy,
      maxBrainEnergy: userRow.maxBrainEnergy,
      strongestTopics,
      weakestTopics,
      recentAchievements,
      activeQuests,
      weeklyActivity,
      masteryMap,
    };

    return NextResponse.json(dashboard);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
