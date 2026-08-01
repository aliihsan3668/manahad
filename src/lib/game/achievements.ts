/**
 * MathVerse — Achievements & Quests Definitions
 */

export interface AchievementDef {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: "LEARNING" | "SOCIAL" | "EXPLORATION" | "STREAK" | "MASTERY";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  xpReward: number;
  coinsReward: number;
  criteria: { type: "questions_answered" | "correct_streak" | "topics_mastered" | "xp_reached" | "level_reached" | "first_lesson" | "perfect_session"; value: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    slug: "first-step",
    name: "First Step",
    description: "Answer your first math question",
    icon: "🎯",
    category: "LEARNING",
    rarity: "COMMON",
    xpReward: 10,
    coinsReward: 5,
    criteria: { type: "questions_answered", value: 1 },
  },
  {
    slug: "ten-questions",
    name: "Getting Warmed Up",
    description: "Answer 10 math questions",
    icon: "🔥",
    category: "LEARNING",
    rarity: "COMMON",
    xpReward: 25,
    coinsReward: 10,
    criteria: { type: "questions_answered", value: 10 },
  },
  {
    slug: "fifty-questions",
    name: "Math Enthusiast",
    description: "Answer 50 math questions",
    icon: "📚",
    category: "LEARNING",
    rarity: "RARE",
    xpReward: 75,
    coinsReward: 30,
    criteria: { type: "questions_answered", value: 50 },
  },
  {
    slug: "hundred-questions",
    name: "Century Scholar",
    description: "Answer 100 math questions",
    icon: "🎓",
    category: "LEARNING",
    rarity: "EPIC",
    xpReward: 150,
    coinsReward: 75,
    criteria: { type: "questions_answered", value: 100 },
  },
  {
    slug: "streak-3",
    name: "On a Roll",
    description: "Get 3 correct answers in a row",
    icon: "⚡",
    category: "STREAK",
    rarity: "COMMON",
    xpReward: 20,
    coinsReward: 10,
    criteria: { type: "correct_streak", value: 3 },
  },
  {
    slug: "streak-5",
    name: "Streak Master",
    description: "Get 5 correct answers in a row",
    icon: "🌟",
    category: "STREAK",
    rarity: "RARE",
    xpReward: 50,
    coinsReward: 25,
    criteria: { type: "correct_streak", value: 5 },
  },
  {
    slug: "streak-10",
    name: "Unstoppable",
    description: "Get 10 correct answers in a row",
    icon: "💎",
    category: "STREAK",
    rarity: "EPIC",
    xpReward: 100,
    coinsReward: 50,
    criteria: { type: "correct_streak", value: 10 },
  },
  {
    slug: "first-mastery",
    name: "Topic Master",
    description: "Master your first topic",
    icon: "🏆",
    category: "MASTERY",
    rarity: "RARE",
    xpReward: 80,
    coinsReward: 40,
    criteria: { type: "topics_mastered", value: 1 },
  },
  {
    slug: "five-topics",
    name: "Scholar",
    description: "Master 5 different topics",
    icon: "🧠",
    category: "MASTERY",
    rarity: "EPIC",
    xpReward: 200,
    coinsReward: 100,
    criteria: { type: "topics_mastered", value: 5 },
  },
  {
    slug: "math-master",
    name: "Math Master",
    description: "Master 10 different topics",
    icon: "👑",
    category: "MASTERY",
    rarity: "LEGENDARY",
    xpReward: 500,
    coinsReward: 250,
    criteria: { type: "topics_mastered", value: 10 },
  },
  {
    slug: "level-5",
    name: "Rising Star",
    description: "Reach level 5",
    icon: "✨",
    category: "LEARNING",
    rarity: "RARE",
    xpReward: 50,
    coinsReward: 25,
    criteria: { type: "level_reached", value: 5 },
  },
  {
    slug: "level-10",
    name: "Math Champion",
    description: "Reach level 10",
    icon: "🎖️",
    category: "LEARNING",
    rarity: "EPIC",
    xpReward: 150,
    coinsReward: 75,
    criteria: { type: "level_reached", value: 10 },
  },
  {
    slug: "perfect-session",
    name: "Flawless",
    description: "Get 10 correct answers in one session with no mistakes",
    icon: "💯",
    category: "LEARNING",
    rarity: "EPIC",
    xpReward: 100,
    coinsReward: 50,
    criteria: { type: "perfect_session", value: 10 },
  },
];

export interface QuestDef {
  slug: string;
  title: string;
  description: string;
  questType: "DAILY" | "WEEKLY" | "MONTHLY" | "SEASONAL";
  category: "LEARNING" | "SOCIAL" | "EXPLORATION";
  target: number;
  xpReward: number;
  coinsReward: number;
  brainEnergyReward: number;
  criteria: { type: "questions_correct" | "questions_answered" | "topics_practiced" | "perfect_streak" | "xp_earned"; value: number };
}

export const QUEST_TEMPLATES: QuestDef[] = [
  {
    slug: "daily-practice-10",
    title: "Daily Practice",
    description: "Answer 10 math questions today",
    questType: "DAILY",
    category: "LEARNING",
    target: 10,
    xpReward: 50,
    coinsReward: 20,
    brainEnergyReward: 20,
    criteria: { type: "questions_answered", value: 10 },
  },
  {
    slug: "daily-correct-5",
    title: "Sharp Shooter",
    description: "Get 5 correct answers today",
    questType: "DAILY",
    category: "LEARNING",
    target: 5,
    xpReward: 40,
    coinsReward: 15,
    brainEnergyReward: 15,
    criteria: { type: "questions_correct", value: 5 },
  },
  {
    slug: "daily-streak-3",
    title: "Combo Master",
    description: "Get a 3-streak of correct answers",
    questType: "DAILY",
    category: "LEARNING",
    target: 3,
    xpReward: 35,
    coinsReward: 15,
    brainEnergyReward: 15,
    criteria: { type: "perfect_streak", value: 3 },
  },
  {
    slug: "weekly-50",
    title: "Weekly Scholar",
    description: "Answer 50 questions this week",
    questType: "WEEKLY",
    category: "LEARNING",
    target: 50,
    xpReward: 200,
    coinsReward: 100,
    brainEnergyReward: 50,
    criteria: { type: "questions_answered", value: 50 },
  },
  {
    slug: "weekly-topics-3",
    title: "Explorer",
    description: "Practice 3 different topics this week",
    questType: "WEEKLY",
    category: "EXPLORATION",
    target: 3,
    xpReward: 150,
    coinsReward: 75,
    brainEnergyReward: 40,
    criteria: { type: "topics_practiced", value: 3 },
  },
  {
    slug: "monthly-200",
    title: "Monthly Marathon",
    description: "Answer 200 questions this month",
    questType: "MONTHLY",
    category: "LEARNING",
    target: 200,
    xpReward: 500,
    coinsReward: 300,
    brainEnergyReward: 100,
    criteria: { type: "questions_answered", value: 200 },
  },
  {
    slug: "monthly-master-3",
    title: "Master Class",
    description: "Master 3 topics this month",
    questType: "MONTHLY",
    category: "MASTERY",
    target: 3,
    xpReward: 400,
    coinsReward: 200,
    brainEnergyReward: 80,
    criteria: { type: "topics_practiced", value: 3 },
  },
];
