/**
 * MANAHAD — Core Type System
 * Centralized domain types shared across client, server, and AI modules.
 */

// ============================================================
// USER & AUTH
// ============================================================

export type UserRole = "CHILD" | "PARENT" | "TEACHER" | "MODERATOR" | "ADMIN";

export interface UserSession {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  avatarConfig: AvatarConfig;
  brainEnergy: number;
  maxBrainEnergy: number;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  parentSettings?: ParentSettings;
  loginMode?: "STUDENT" | "PARENT" | "ADMIN";
}

export interface AvatarConfig {
  skinTone: string;        // hex or named
  hair: string;            // cosmetic slug
  hairColor: string;
  outfit: string;          // cosmetic slug
  hat: string | null;
  accessory: string | null;
  shoes: string;
  backpack: string | null;
  pet: string | null;
  trail: string | null;
  emote: string | null;
}

export interface ParentSettings {
  chatEnabled: boolean;
  approvedFriendsOnly: boolean;
  friendApprovalRequired: boolean;
  playtimeMinutesPerDay: number;
  playtimeMinutesPerSession: number;
  weeklyReportEmail: boolean;
  alertOnModeration: boolean;
  alertOnFriendRequest: boolean;
  realNameSharing: boolean;
}

// ============================================================
// CURRICULUM
// ============================================================

export type BloomsLevel =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "EVALUATE"
  | "CREATE";

export type CurriculumCode =
  | "PAK-NATIONAL"
  | "CAMBRIDGE"
  | "IB"
  | "COMMON-CORE"
  | "CBSE";

export interface CurriculumTopicNode {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  gradeId: string | null;
  gradeLevel: number | null;
  difficulty: number; // 1-5
  learningObjective: string;
  bloomsLevel: BloomsLevel;
  estimatedMinutes: number;
  prerequisites: string[];
  children: CurriculumTopicNode[];
}

// ============================================================
// QUESTIONS & GRADING
// ============================================================

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "NUMERIC"
  | "FRACTION"
  | "EXPRESSION"
  | "WORD_PROBLEM"
  | "TRUE_FALSE";

export interface GeneratedQuestion {
  id?: string;
  topicId: string;
  topicSlug: string;
  topicName: string;
  questionType: QuestionType;
  prompt: string;
  promptLatex?: string;
  choices?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  hint: string;
  commonMistakes: string[];
  difficulty: number; // 1-5
  estimatedSolveSec: number;
  bloomsLevel: BloomsLevel;
  scenario: string;
  metadata?: Record<string, unknown>;
}

export interface AttemptResult {
  isCorrect: boolean;
  isEquivalent: boolean;
  xpEarned: number;
  brainEnergyEarned: number;
  coinsEarned: number;
  explanation: string;
  hint?: string;
  newMasteryScore: number;
  newBrainEnergy: number;
  leveledUp: boolean;
  newLevel: number;
  achievementsUnlocked: string[];
  questProgress: { questId: string; title: string; progress: number; target: number; completed: boolean }[];
}

// ============================================================
// CHAT & MODERATION
// ============================================================

export type ModerationStatus =
  | "PENDING"
  | "APPROVED"
  | "BLOCKED"
  | "HIDDEN"
  | "REWRITTEN"
  | "ESCALATED";

export type ModerationCategory =
  | "profanity"
  | "spam"
  | "personal_info_phone"
  | "personal_info_email"
  | "personal_info_address"
  | "personal_info_school"
  | "personal_info_password"
  | "personal_info_real_name"
  | "personal_info_social"
  | "link"
  | "grooming"
  | "bullying"
  | "harassment"
  | "hate_speech"
  | "inappropriate_language"
  | "sexual_content"
  | "self_harm"
  | "violence"
  | "phishing"
  | "scam";

export interface ModerationRuleResult {
  ruleId: string;
  category: ModerationCategory;
  matched: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface AIModerationResult {
  flagged: boolean;
  categories: ModerationCategory[];
  confidence: number; // 0..1
  suggestedAction: "ALLOW" | "REWRITE" | "BLOCK" | "ESCALATE";
  rewrittenContent?: string;
  reason: string;
}

export interface ModerationResult {
  status: ModerationStatus;
  displayedContent: string;
  ruleFlags: ModerationRuleResult[];
  aiFlags: AIModerationResult | null;
  confidence: number;
  reason: string;
  action: "ALLOW" | "REWRITE" | "BLOCK" | "ESCALATE";
}

// ============================================================
// AI TUTOR
// ============================================================

export type TutorMessageRole = "user" | "assistant" | "system";

export interface TutorMessage {
  role: TutorMessageRole;
  content: string;
  timestamp?: string;
}

export interface TutorRequest {
  userId: string;
  message: string;
  questionId?: string;
  questionContext?: GeneratedQuestion;
  sessionId?: string;
  childAge?: number;
  history?: TutorMessage[];
}

export interface TutorResponse {
  reply: string;
  sessionId: string;
  suggestedActions?: { label: string; action: string }[];
}

// ============================================================
// SOCIAL / MULTIPLAYER
// ============================================================

export interface PlayerPresence {
  userId: string;
  username: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  area: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  level: number;
  lastSeenAt: string;
}

export interface ChatMessageDTO {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  channelId: string;
  content: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  isOwn?: boolean;
}

export type CollectibleType = "coin" | "gem" | "star" | "book" | "crystal";

export interface WorldCollectible {
  id: string;
  type: CollectibleType;
  x: number;
  y: number;
  value: number;
  respawnsAfterSec: number;
}

export type InteractableType =
  | "math-fountain"
  | "daily-chest"
  | "teleport-pad"
  | "wishing-well"
  | "treasure-dig"
  | "lucky-fountain";

export interface WorldInteractable {
  id: string;
  type: InteractableType;
  x: number;
  y: number;
  label: string;
  emoji: string;
  cooldownSec: number;
}

export interface WorldArea {
  slug: string;
  name: string;
  description: string;
  width: number;
  height: number;
  bgColor: string;
  spawnPoint: { x: number; y: number };
  portals: { x: number; y: number; target: string; label: string }[];
  npcs: { slug: string; x: number; y: number }[];
  decorations: { type: string; x: number; y: number; w: number; h: number; color: string }[];
  collectibles: WorldCollectible[];
  interactables: WorldInteractable[];
}

// ============================================================
// PROGRESS / GAMIFICATION
// ============================================================

export interface MasteryDTO {
  topicId: string;
  topicName: string;
  topicSlug: string;
  masteryScore: number; // 0..1
  attemptsCount: number;
  correctCount: number;
  avgTimeSec: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  isWeak: boolean;
  isMastered: boolean;
  confidenceScore: number;
}

export interface AchievementDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
  coinsReward: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}

export interface QuestDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  questType: string;
  category: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  coinsReward: number;
  brainEnergyReward: number;
  endsAt: string | null;
}

export interface ProgressDashboard {
  totalXp: number;
  level: number;
  levelProgress: number; // 0..1 to next level
  streak: number;
  questionsAnswered: number;
  accuracy: number;
  avgSpeedSec: number;
  brainEnergy: number;
  maxBrainEnergy: number;
  strongestTopics: MasteryDTO[];
  weakestTopics: MasteryDTO[];
  recentAchievements: AchievementDTO[];
  activeQuests: QuestDTO[];
  weeklyActivity: { date: string; questionsAnswered: number; xpEarned: number }[];
  masteryMap: { topicSlug: string; topicName: string; mastery: number; grade: number }[];
}

// ============================================================
// AI PROVIDER ABSTRACTION
// ============================================================

export type AIProviderName =
  | "groq"
  | "groq"
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "qwen"
  | "llama"
  | "mistral"
  | "ollama"
  | "zai";

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  systemPrompt?: string;
}

export interface AICompletionResponse {
  content: string;
  provider: AIProviderName;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}
