/**
 * MathVerse — Adaptive Learning Engine
 */

import type { MasteryDTO } from "@/lib/types";

export interface AdaptiveState {
  masteryScore: number;
  attemptsCount: number;
  correctCount: number;
  avgTimeSec: number;
  streak: number;
  confidenceScore: number;
  lastReviewedAt: Date;
  nextReviewAt: Date;
  isWeak: boolean;
  isMastered: boolean;
}

interface AttemptRecord {
  isCorrect: boolean;
  timeTakenSec: number;
  estimatedSolveSec: number;
  hintsUsed: number;
  confidence?: number;
}

export function updateMastery(prev: AdaptiveState | null, attempt: AttemptRecord): AdaptiveState {
  const now = new Date();
  const prevMastery = prev?.masteryScore ?? 0;
  const prevAttempts = prev?.attemptsCount ?? 0;
  const prevAvgTime = prev?.avgTimeSec ?? attempt.estimatedSolveSec;
  const prevConfidence = prev?.confidenceScore ?? 0.5;
  const prevStreak = prev?.streak ?? 0;

  const speedFactor = Math.max(
    0.5,
    Math.min(1.0, 1.0 - 0.5 * Math.max(0, (attempt.timeTakenSec - attempt.estimatedSolveSec) / attempt.estimatedSolveSec))
  );
  const hintFactor = Math.max(0.4, 1.0 - 0.2 * attempt.hintsUsed);
  const attemptScore = attempt.isCorrect ? speedFactor * hintFactor : 0;
  const alpha = Math.min(0.5, 0.3 + 0.05 * (5 - Math.min(5, prevAttempts)));

  const newMastery = prevAttempts === 0
    ? attemptScore
    : (1 - alpha) * prevMastery + alpha * attemptScore;
  const newStreak = attempt.isCorrect ? prevStreak + 1 : 0;
  const newConfidence = attempt.confidence !== undefined
    ? (1 - 0.3) * prevConfidence + 0.3 * attempt.confidence
    : (1 - 0.2) * prevConfidence + 0.2 * (attempt.isCorrect ? 0.7 + 0.3 * speedFactor : 0.3);
  const newAvgTime = prevAttempts === 0
    ? attempt.timeTakenSec
    : (1 - 0.2) * prevAvgTime + 0.2 * attempt.timeTakenSec;
  const nextReviewAt = computeNextReview(newStreak, newMastery, now);
  const isWeak = newMastery < 0.6 && (prevAttempts + 1) >= 3;
  const isMastered = newMastery >= 0.85 && (prevAttempts + 1) >= 5 && newStreak >= 3;

  return {
    masteryScore: Math.max(0, Math.min(1, newMastery)),
    attemptsCount: prevAttempts + 1,
    correctCount: (prev?.correctCount ?? 0) + (attempt.isCorrect ? 1 : 0),
    avgTimeSec: newAvgTime,
    streak: newStreak,
    confidenceScore: Math.max(0, Math.min(1, newConfidence)),
    lastReviewedAt: now,
    nextReviewAt,
    isWeak,
    isMastered,
  };
}

function computeNextReview(streak: number, mastery: number, from: Date): Date {
  const intervals = [1, 2, 4, 7, 14, 30, 60];
  const idx = Math.min(streak, intervals.length - 1);
  let days = intervals[idx];
  if (mastery < 0.4) days = Math.max(0.04, days * 0.2);
  else if (mastery < 0.6) days = Math.max(0.5, days * 0.5);
  else if (mastery > 0.9 && streak >= 3) days = days * 1.5;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
}

export function suggestNextDifficulty(recentAccuracy: number, currentDifficulty: number, recentAttemptsCount: number): number {
  if (recentAttemptsCount < 3) return currentDifficulty;
  let next = currentDifficulty;
  if (recentAccuracy > 0.85) next = Math.min(5, currentDifficulty + 1);
  else if (recentAccuracy > 0.75) next = Math.min(5, currentDifficulty + (Math.random() < 0.3 ? 1 : 0));
  else if (recentAccuracy < 0.4) next = Math.max(1, currentDifficulty - 1);
  else if (recentAccuracy < 0.55) next = Math.max(1, currentDifficulty - (Math.random() < 0.5 ? 1 : 0));
  return next;
}

export interface LearningRecommendation {
  type: "REVIEW" | "PRACTICE" | "CHALLENGE" | "NEW_TOPIC";
  topicId: string;
  topicName: string;
  reason: string;
  suggestedDifficulty: number;
  priority: number;
}

export function generateRecommendations(
  masteryRecords: MasteryDTO[],
  allTopics: { id: string; name: string; slug: string; difficulty: number }[]
): LearningRecommendation[] {
  const recs: LearningRecommendation[] = [];
  const now = new Date();
  for (const m of masteryRecords) {
    const dueDate = new Date(m.nextReviewAt);
    if (dueDate <= now) {
      recs.push({
        type: "REVIEW",
        topicId: m.topicId,
        topicName: m.topicName,
        reason: `Time to review ${m.topicName} (spaced repetition)`,
        suggestedDifficulty: Math.max(1, Math.min(5, Math.ceil(m.masteryScore * 5))),
        priority: m.isWeak ? 1 : 2,
      });
    }
    if (m.isWeak) {
      recs.push({
        type: "PRACTICE",
        topicId: m.topicId,
        topicName: m.topicName,
        reason: `You're still building confidence in ${m.topicName}. Practice will help!`,
        suggestedDifficulty: Math.max(1, Math.ceil(m.masteryScore * 3)),
        priority: 1,
      });
    }
    if (m.isMastered) {
      recs.push({
        type: "CHALLENGE",
        topicId: m.topicId,
        topicName: m.topicName,
        reason: `You've mastered ${m.topicName}! Try a challenge for bonus XP.`,
        suggestedDifficulty: 5,
        priority: 4,
      });
    }
  }
  const knownTopicIds = new Set(masteryRecords.map((m) => m.topicId));
  for (const t of allTopics) {
    if (!knownTopicIds.has(t.id)) {
      recs.push({
        type: "NEW_TOPIC",
        topicId: t.id,
        topicName: t.name,
        reason: `Ready to try something new? Start ${t.name}!`,
        suggestedDifficulty: t.difficulty,
        priority: 3,
      });
    }
  }
  return recs.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= levelXpRequired(level + 1)) level++;
  return level;
}

export function levelXpRequired(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.4));
}

export function xpForNextLevel(currentXp: number): {
  currentLevel: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
} {
  const currentLevel = levelFromXp(currentXp);
  const xpThisLevel = levelXpRequired(currentLevel);
  const xpNextLevel = levelXpRequired(currentLevel + 1);
  const xpIntoLevel = currentXp - xpThisLevel;
  const xpForNext = xpNextLevel - xpThisLevel;
  return {
    currentLevel,
    xpIntoLevel,
    xpForNextLevel: xpForNext,
    progress: xpForNext > 0 ? xpIntoLevel / xpForNext : 0,
  };
}
