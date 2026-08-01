/**
 * MathVerse — Central configuration
 * Reads from environment with safe fallbacks.
 * All secrets/tokens live here; no other module reads process.env directly.
 */

function env(key: string, fallback = ""): string {
  const v = process.env[key];
  return v && v.length > 0 ? v : fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env?.[key]?.toLowerCase();
  if (v === undefined) return fallback;
  return v === "true" || v === "1" || v === "yes";
}

export const config = {
  app: {
    name: "MathVerse",
    version: "1.0.0",
    description: "Multiplayer mathematics learning platform for children",
    url: env("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    environment: env("NODE_ENV", "development"),
  },

  // AI provider selection — set AI_PROVIDER to one of:
  // gemini | openrouter | deepseek | qwen | llama | mistral | ollama | zai
  ai: {
    provider: env("AI_PROVIDER", "zai") as
      | "gemini"
      | "openrouter"
      | "deepseek"
      | "qwen"
      | "llama"
      | "mistral"
      | "ollama"
      | "zai",
    defaultModel: env("AI_MODEL", ""),
    defaultTemperature: 0.7,
    maxTokens: envInt("AI_MAX_TOKENS", 2048),
    timeoutMs: envInt("AI_TIMEOUT_MS", 30000),
    keys: {
      gemini: env("GEMINI_API_KEY"),
      openrouter: env("OPENROUTER_API_KEY"),
      deepseek: env("DEEPSEEK_API_KEY"),
      qwen: env("QWEN_API_KEY"),
      mistral: env("MISTRAL_API_KEY"),
      ollamaUrl: env("OLLAMA_URL", "http://localhost:11434"),
    },
  },

  // Multiplayer realtime
  realtime: {
    wsPort: envInt("WS_PORT", 3003),
    presenceTimeoutMs: envInt("PRESENCE_TIMEOUT_MS", 30000),
    positionBroadcastMs: envInt("POSITION_BROADCAST_MS", 100),
  },

  // Game balance
  game: {
    startingBrainEnergy: 100,
    maxBrainEnergy: 100,
    brainEnergyPerCorrectAnswer: envInt("BE_PER_CORRECT", 15),
    brainEnergyPerWrongAnswer: envInt("BE_PER_WRONG", 3),
    brainEnergyCostChatMessage: envInt("BE_COST_CHAT", 1),
    brainEnergyCostEmote: envInt("BE_COST_EMOTE", 0),
    brainEnergyCostTeleport: envInt("BE_COST_TELEPORT", 10),
    xpPerCorrect: envInt("XP_PER_CORRECT", 20),
    xpPerWrong: envInt("XP_PER_WRONG", 5),
    coinsPerCorrect: envInt("COINS_PER_CORRECT", 5),
    levelCurve: (level: number) => Math.floor(100 * Math.pow(level, 1.4)),
  },

  // Rate limiting (in-memory; would be Redis in production)
  rateLimit: {
    chatMessagesPerMinute: envInt("CHAT_RATE_LIMIT", 12),
    questionGenerationsPerMinute: envInt("QGEN_RATE_LIMIT", 20),
    apiRequestsPerMinute: envInt("API_RATE_LIMIT", 120),
  },

  // Moderation
  moderation: {
    enableAIModeration: envBool("AI_MODERATION_ENABLED", true),
    aiConfidenceThreshold: 0.7,
    autoMuteAfterWarnings: 3,
    escalatingPenalties: [
      { action: "WARNING", durationMin: 0 },
      { action: "WARNING", durationMin: 0 },
      { action: "WARNING", durationMin: 0 },
      { action: "MUTE", durationMin: 15 },
      { action: "MUTE", durationMin: 60 },
      { action: "SUSPEND", durationMin: 1440 },
      { action: "BAN", durationMin: 0 },
    ] as const,
  },

  // Accessibility
  accessibility: {
    dyslexiaFontEnabled: envBool("DYSLEXIA_FONT_DEFAULT", false),
    reducedMotionDefault: envBool("REDUCED_MOTION_DEFAULT", false),
    highContrastDefault: envBool("HIGH_CONTRAST_DEFAULT", false),
  },

  auth: {
    sessionSecret: env("NEXTAUTH_SECRET", "mathverse-dev-secret-change-me"),
    sessionMaxAge: 60 * 60 * 24 * 7, // 7 days
  },
} as const;

export type AppConfig = typeof config;
