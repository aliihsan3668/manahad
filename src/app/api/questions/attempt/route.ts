/**
 * POST /api/questions/attempt
 * Body: { questionId, userAnswer, timeTakenSec, hintsUsed, confidence? }
 * Grades the answer, records the attempt, updates mastery, user XP/coins/brainEnergy,
 * recomputes level, updates quest progress, checks achievements.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gradeAnswer } from "@/lib/math/grading";
import { updateMastery, levelFromXp } from "@/lib/learning/adaptive";
import { config } from "@/lib/config";
import { QUEST_TEMPLATES } from "@/lib/game/achievements";

interface AchievementCriteria {
  type:
    | "questions_answered"
    | "correct_streak"
    | "topics_mastered"
    | "xp_reached"
    | "level_reached"
    | "first_lesson"
    | "perfect_session";
  value: number;
}

type QuestCriteriaType =
  | "questions_correct"
  | "questions_answered"
  | "topics_practiced"
  | "perfect_streak"
  | "xp_earned";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { questionId, userAnswer, timeTakenSec = 0, hintsUsed = 0, confidence = 0.5 } = body;

    if (!questionId || userAnswer === undefined) {
      return NextResponse.json({ error: "questionId and userAnswer are required" }, { status: 400 });
    }

    const question = await db.question.findUnique({
      where: { id: questionId },
      include: { topic: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    let acceptedAnswers: string[] = [];
    try {
      acceptedAnswers = JSON.parse(question.acceptedAnswers);
    } catch {
      acceptedAnswers = [];
    }

    const grading = gradeAnswer(userAnswer, question.correctAnswer, acceptedAnswers);

    const xpEarned = grading.isCorrect ? config.game.xpPerCorrect : config.game.xpPerWrong;
    const brainEnergyEarned = grading.isCorrect
      ? config.game.brainEnergyPerCorrectAnswer
      : config.game.brainEnergyPerWrongAnswer;
    const coinsEarned = grading.isCorrect ? config.game.coinsPerCorrect : 0;

    // Create the Attempt record
    const attempt = await db.attempt.create({
      data: {
        userId: user.id,
        questionId,
        userAnswer: String(userAnswer),
        isCorrect: grading.isCorrect,
        isEquivalent: grading.isEquivalent,
        timeTakenSec,
        hintsUsed,
        xpEarned,
        brainEnergyEarned,
        confidence,
      },
    });

    // Update Mastery
    const existingMastery = await db.mastery.findUnique({
      where: { userId_topicId: { userId: user.id, topicId: question.topicId } },
    });
    const updated = updateMastery(
      existingMastery
        ? {
            masteryScore: existingMastery.masteryScore,
            attemptsCount: existingMastery.attemptsCount,
            correctCount: existingMastery.correctCount,
            avgTimeSec: existingMastery.avgTimeSec,
            streak: existingMastery.streak,
            confidenceScore: existingMastery.confidenceScore,
            lastReviewedAt: existingMastery.lastReviewedAt,
            nextReviewAt: existingMastery.nextReviewAt,
            isWeak: existingMastery.isWeak,
            isMastered: existingMastery.isMastered,
          }
        : null,
      {
        isCorrect: grading.isCorrect,
        timeTakenSec,
        estimatedSolveSec: question.estimatedSolveSec,
        hintsUsed,
        confidence,
      }
    );

    const masteryRecord = await db.mastery.upsert({
      where: { userId_topicId: { userId: user.id, topicId: question.topicId } },
      create: {
        userId: user.id,
        topicId: question.topicId,
        masteryScore: updated.masteryScore,
        attemptsCount: updated.attemptsCount,
        correctCount: updated.correctCount,
        avgTimeSec: updated.avgTimeSec,
        streak: updated.streak,
        confidenceScore: updated.confidenceScore,
        lastReviewedAt: updated.lastReviewedAt,
        nextReviewAt: updated.nextReviewAt,
        isWeak: updated.isWeak,
        isMastered: updated.isMastered,
      },
      update: {
        masteryScore: updated.masteryScore,
        attemptsCount: updated.attemptsCount,
        correctCount: updated.correctCount,
        avgTimeSec: updated.avgTimeSec,
        streak: updated.streak,
        confidenceScore: updated.confidenceScore,
        lastReviewedAt: updated.lastReviewedAt,
        nextReviewAt: updated.nextReviewAt,
        isWeak: updated.isWeak,
        isMastered: updated.isMastered,
      },
    });

    // Update User — XP, coins, brainEnergy
    const prevLevel = user.level;
    const newXp = user.xp + xpEarned;
    const newCoins = user.coins + coinsEarned;
    const newBrainEnergy = Math.min(
      user.maxBrainEnergy,
      user.brainEnergy + brainEnergyEarned
    );
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > prevLevel;

    await db.user.update({
      where: { id: user.id },
      data: {
        xp: newXp,
        coins: newCoins,
        brainEnergy: newBrainEnergy,
        level: newLevel,
        lastActiveAt: new Date(),
      },
    });

    // Update DailyStat
    const today = new Date().toISOString().slice(0, 10);
    await db.dailyStat.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: {
        userId: user.id,
        date: today,
        questionsAnswered: 1,
        correctCount: grading.isCorrect ? 1 : 0,
        xpEarned,
        brainEnergyEarned,
      },
      update: {
        questionsAnswered: { increment: 1 },
        correctCount: { increment: grading.isCorrect ? 1 : 0 },
        xpEarned: { increment: xpEarned },
        brainEnergyEarned: { increment: brainEnergyEarned },
      },
    });

    // Compute global correct streak from recent attempts
    const recentAttempts = await db.attempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    let currentStreak = 0;
    for (const a of recentAttempts) {
      if (a.isCorrect) currentStreak++;
      else break;
    }

    // Update active quests
    const activeQuests = await db.userQuest.findMany({
      where: { userId: user.id, completed: false },
      include: { quest: true },
    });
    const questProgressOut: {
      questId: string;
      title: string;
      progress: number;
      target: number;
      completed: boolean;
    }[] = [];

    for (const uq of activeQuests) {
      // Quest DB model doesn't store criteria — look up via QUEST_TEMPLATES by slug
      const questDef = QUEST_TEMPLATES.find((t) => t.slug === uq.quest.slug);
      const criteriaType: QuestCriteriaType | undefined = questDef?.criteria?.type;
      if (!criteriaType) {
        questProgressOut.push({
          questId: uq.questId,
          title: uq.quest.title,
          progress: uq.progress,
          target: uq.quest.target,
          completed: uq.completed,
        });
        continue;
      }
      let newProgress = uq.progress;
      if (criteriaType === "questions_answered") {
        newProgress = uq.progress + 1;
      } else if (criteriaType === "questions_correct") {
        if (grading.isCorrect) newProgress = uq.progress + 1;
      } else if (criteriaType === "perfect_streak") {
        newProgress = grading.isCorrect ? uq.progress + 1 : 0;
      }
      // topics_practiced and xp_earned handled elsewhere

      const nowCompleted = newProgress >= uq.quest.target;
      await db.userQuest.update({
        where: { id: uq.id },
        data: { progress: newProgress, completed: nowCompleted },
      });
      questProgressOut.push({
        questId: uq.questId,
        title: uq.quest.title,
        progress: newProgress,
        target: uq.quest.target,
        completed: nowCompleted,
      });
    }

    // Achievement check
    const achievements = await db.achievement.findMany();
    const unlockedSlugs: string[] = [];
    const totalAttempts = await db.attempt.count({ where: { userId: user.id } });
    const masteredCount = await db.mastery.count({
      where: { userId: user.id, isMastered: true },
    });

    for (const ach of achievements) {
      let criteria: AchievementCriteria | null = null;
      try {
        criteria = JSON.parse(ach.criteria || "{}");
      } catch {
        criteria = null;
      }
      if (!criteria) continue;

      const existing = await db.userAchievement.findUnique({
        where: { userId_achievementId: { userId: user.id, achievementId: ach.id } },
      });
      if (existing?.completed) continue;

      let progress = 0;
      let completed = false;
      switch (criteria.type) {
        case "questions_answered":
        case "first_lesson":
          progress = Math.min(1, totalAttempts / criteria.value);
          completed = totalAttempts >= criteria.value;
          break;
        case "correct_streak":
        case "perfect_session":
          progress = Math.min(1, currentStreak / criteria.value);
          completed = currentStreak >= criteria.value;
          break;
        case "topics_mastered":
          progress = Math.min(1, masteredCount / criteria.value);
          completed = masteredCount >= criteria.value;
          break;
        case "xp_reached":
          progress = Math.min(1, newXp / criteria.value);
          completed = newXp >= criteria.value;
          break;
        case "level_reached":
          progress = Math.min(1, newLevel / criteria.value);
          completed = newLevel >= criteria.value;
          break;
      }

      if (completed) {
        await db.userAchievement.upsert({
          where: { userId_achievementId: { userId: user.id, achievementId: ach.id } },
          create: {
            userId: user.id,
            achievementId: ach.id,
            progress: 1,
            completed: true,
            completedAt: new Date(),
          },
          update: {
            progress: 1,
            completed: true,
            completedAt: new Date(),
          },
        });

        // Award XP/coins for achievement
        await db.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: ach.xpReward },
            coins: { increment: ach.coinsReward },
          },
        });

        // Notification
        await db.notification.create({
          data: {
            userId: user.id,
            type: "ACHIEVEMENT",
            title: `Achievement Unlocked: ${ach.name}!`,
            body: ach.description,
            link: "/achievements",
          },
        });

        unlockedSlugs.push(ach.slug);
      } else if (existing) {
        await db.userAchievement.update({
          where: { id: existing.id },
          data: { progress },
        });
      }
    }

    return NextResponse.json({
      isCorrect: grading.isCorrect,
      isEquivalent: grading.isEquivalent,
      xpEarned,
      brainEnergyEarned,
      coinsEarned,
      explanation: question.explanation,
      hint: question.hint,
      newMasteryScore: masteryRecord.masteryScore,
      newBrainEnergy: newBrainEnergy,
      leveledUp,
      newLevel,
      achievementsUnlocked: unlockedSlugs,
      questProgress: questProgressOut,
      attemptId: attempt.id,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
