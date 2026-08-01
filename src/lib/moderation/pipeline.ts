/**
 * MathVerse — Child Safety Moderation Pipeline
 *
 * Every chat message passes through this pipeline BEFORE being broadcast to other players:
 *
 *   1. Rule-based filter (fast, deterministic, regex + keyword matching)
 *      - Profanity, slurs, hate speech
 *      - Phone numbers, emails, addresses, social media handles
 *      - URLs, links
 *      - School names, real names (when enabled)
 *      - Spam detection (repeated characters, all-caps, message flooding)
 *
 *   2. AI moderation (when rule-based is ambiguous or as second pass)
 *      - Grooming patterns
 *      - Bullying, harassment
 *      - Self-harm, violence
 *      - Phishing, scam
 *      - Inappropriate/sexual content
 *      - Returns confidence score + suggested action
 *
 *   3. Spam detection (rate + content similarity)
 *
 *   4. Final decision: ALLOW | REWRITE | BLOCK | ESCALATE
 *
 * Escalating penalties:
 *   - 1st-3rd violation: warning
 *   - 4th: 15-minute mute
 *   - 5th: 60-minute mute
 *   - 6th: 24-hour suspension
 *   - 7th+: permanent ban (with appeal)
 */

import type {
  AIModerationResult,
  ModerationCategory,
  ModerationResult,
  ModerationRuleResult,
  ModerationStatus,
} from "@/lib/types";
import { config } from "@/lib/config";
import { askAIForJSON } from "@/lib/ai/provider";

// ============================================================
// RULE DEFINITIONS
// ============================================================

interface ModerationRule {
  id: string;
  category: ModerationCategory;
  pattern: RegExp;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  rewrite?: (matched: string) => string;
}

// Profanity & inappropriate language
const PROFANITY_WORDS = [
  "damn", "hell", "crap", "stupid", "idiot", "dumb", "shut up", "hate you",
  "ugly", "loser", "freak", "freaking", "freakin",
];

// Hate speech / slurs (censored — these are the actual blocklist patterns)
const HATE_SPEECH = [
  /\bn[i1]+g+[\w]*\b/i, /\bf[a@]+g[\w]*\b/i, /\br[t+]+a?r[dt]+\b/i,
  /\bk[i1]+k[e3]+\b/i, /\bj[a@]p+\b/i, /\bsp[i1]+c+\b/i,
  /\bw[e3]+t+b[a@]+c?k+\b/i, /\bch[i1]+nk+\b/i,
  /\bc[u@]+nt\b/i, /\bf[u@]+c?k+\b/i, /\bs[h]+[i1]+t+\b/i,
  /\bb[i1]+t[c]+h+\b/i, /\ba[s]+s+h[o0]+l[e3]+\b/i, /\bd[i1]+c?k+\b/i,
  /\bp[u@]+s[s]+y+\b/i, /\bw[h]+[o0]+r[e3]+\b/i,
  /\bb[a@]+s[t]+a?r?d+\b/i,
];

// Build the rules
const RULES: ModerationRule[] = [
  // === PERSONAL INFORMATION ===
  {
    id: "pii_phone",
    category: "personal_info_phone",
    pattern: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/,
    severity: "HIGH",
    rewrite: () => "[phone number removed]",
  },
  {
    id: "pii_email",
    category: "personal_info_email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    severity: "HIGH",
    rewrite: () => "[email removed]",
  },
  {
    id: "pii_link",
    category: "link",
    pattern: /(https?:\/\/|www\.)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+[^\s]*/i,
    severity: "HIGH",
    rewrite: () => "[link removed]",
  },
  {
    id: "pii_social_handle",
    category: "personal_info_social",
    pattern: /(?:@|follow me on |add me on |my (?:insta|snap|tiktok|facebook|twitter|discord|telegram|whatsapp))\s*[\w.]+/i,
    severity: "HIGH",
    rewrite: () => "[social handle removed]",
  },
  {
    id: "pii_address",
    category: "personal_info_address",
    pattern: /\b\d+\s+[A-Z][a-zA-Z]+\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way)\b/i,
    severity: "HIGH",
    rewrite: () => "[address removed]",
  },
  {
    id: "pii_password",
    category: "personal_info_password",
    pattern: /\bmy password is\b|\bpassword is\b|\bpasscode is\b/i,
    severity: "CRITICAL",
    rewrite: () => "[never share your password!]",
  },
  {
    id: "pii_school",
    category: "personal_info_school",
    pattern: /\b(?:my school is|i go to|i attend)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:school|academy|college|institute|high school|middle school|elementary)\b/i,
    severity: "MEDIUM",
    rewrite: () => "[school name removed]",
  },

  // === HATE SPEECH / SLURS ===
  ...HATE_SPEECH.map((pat, i) => ({
    id: `hate_${i}`,
    category: "hate_speech" as ModerationCategory,
    pattern: pat,
    severity: "CRITICAL" as const,
    rewrite: () => "[removed]",
  })),

  // === PROFANITY (mild) ===
  ...PROFANITY_WORDS.map((word) => ({
    id: `profanity_${word.replace(/\s+/g, "_")}`,
    category: "profanity" as ModerationCategory,
    pattern: new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
    severity: "LOW" as const,
    rewrite: (m: string) => "*".repeat(m.length),
  })),

  // === SELF-HARM ===
  {
    id: "self_harm",
    category: "self_harm",
    pattern: /\b(?:kill myself|hurt myself|cut myself|end it all|don't want to live|want to die|suicide|suicidal)\b/i,
    severity: "CRITICAL",
  },

  // === VIOLENCE THREATS ===
  {
    id: "violence_threat",
    category: "violence",
    pattern: /\b(?:kill you|beat you up|hurt you|punch you|fight me|i will find you|coming for you)\b/i,
    severity: "HIGH",
  },

  // === INAPPROPRIATE SEXUAL CONTENT ===
  {
    id: "sexual_content",
    category: "sexual_content",
    pattern: /\b(?:sex|sexy|naked|nude|porn|xxx|hookup|send pics|send nudes|show me your)\b/i,
    severity: "CRITICAL",
  },

  // === GROOMING PATTERNS ===
  {
    id: "grooming_meetup",
    category: "grooming",
    pattern: /\b(?:meet (?:me )?(?:up )?(?:in person|irl)|come to my house|i'll pick you up|let's meet (?:at|tomorrow|today)|where do you live|what's your address|are you alone)\b/i,
    severity: "CRITICAL",
  },
  {
    id: "grooming_secret",
    category: "grooming",
    pattern: /\b(?:don't tell (?:your )?(?:parents|mom|dad)|keep this (?:a )?secret|our little secret|between us only)\b/i,
    severity: "CRITICAL",
  },
  {
    id: "grooming_gifts",
    category: "grooming",
    pattern: /\b(?:i'll (?:buy|get) you|send me (?:your )?(?:photo|pic|picture)|i have a gift for you)\b/i,
    severity: "HIGH",
  },

  // === PHISHING / SCAM ===
  {
    id: "phishing_credentials",
    category: "phishing",
    pattern: /\b(?:free (?:robux|v-bucks|coins|gems|gift card)|click (?:here|the link)|verify your account|account (?:suspended|banned)|login again|enter your password)\b/i,
    severity: "HIGH",
  },
  {
    id: "scam_exchange",
    category: "scam",
    pattern: /\b(?:send me (?:your|ur) .* and i'll send|trade me your .* and i'll give|duplicate (?:your|ur) items|i can duplicate)\b/i,
    severity: "HIGH",
  },
];

// ============================================================
// SPAM DETECTION
// ============================================================

interface SpamDetector {
  recentMessages: Map<string, { content: string; timestamp: number }[]>;
  recordAndCheck: (userId: string, content: string) => { isSpam: boolean; reason: string };
  reset: (userId: string) => void;
}

function createSpamDetector(): SpamDetector {
  const recentMessages = new Map<string, { content: string; timestamp: number }[]>();
  const WINDOW_MS = 60_000;
  const MAX_MESSAGES = config.rateLimit.chatMessagesPerMinute;

  return {
    recentMessages,
    recordAndCheck(userId, content) {
      const now = Date.now();
      const arr = recentMessages.get(userId) ?? [];
      const recent = arr.filter((m) => now - m.timestamp < WINDOW_MS);

      // Rate limit
      if (recent.length >= MAX_MESSAGES) {
        return { isSpam: true, reason: "Rate limit exceeded" };
      }

      // Identical message repeated
      const identical = recent.filter((m) => m.content === content).length;
      if (identical >= 2) {
        return { isSpam: true, reason: "Identical message repeated" };
      }

      // Very similar messages (Levenshtein-ish — character overlap)
      const lowerContent = content.toLowerCase();
      const similar = recent.filter((m) => {
        const a = m.content.toLowerCase();
        const b = lowerContent;
        if (a === b) return true;
        // Quick check: same length, >80% char overlap
        if (Math.abs(a.length - b.length) > 3) return false;
        const minLen = Math.min(a.length, b.length);
        let matches = 0;
        for (let i = 0; i < minLen; i++) {
          if (a[i] === b[i]) matches++;
        }
        return matches / Math.max(a.length, b.length) > 0.85;
      }).length;
      if (similar >= 3) {
        return { isSpam: true, reason: "Similar messages repeated" };
      }

      // Excessive caps
      const letters = content.replace(/[^a-zA-Z]/g, "");
      if (letters.length > 10) {
        const caps = content.replace(/[^A-Z]/g, "").length;
        if (caps / letters.length > 0.7) {
          return { isSpam: true, reason: "Excessive capitalization" };
        }
      }

      // Repeated single character (e.g., "asdfghjklasdfghjkl")
      if (/(.{1,5})\1{4,}/.test(content)) {
        return { isSpam: true, reason: "Pattern spam" };
      }

      recent.push({ content, timestamp: now });
      recentMessages.set(userId, recent);
      return { isSpam: false, reason: "" };
    },
    reset(userId) {
      recentMessages.delete(userId);
    },
  };
}

export const spamDetector = createSpamDetector();

// ============================================================
// RULE-BASED MODERATION
// ============================================================

export function runRuleBasedModeration(content: string): {
  flags: ModerationRuleResult[];
  rewritten: string;
  hasCritical: boolean;
  hasHigh: boolean;
} {
  const flags: ModerationRuleResult[] = [];
  let rewritten = content;
  let hasCritical = false;
  let hasHigh = false;

  for (const rule of RULES) {
    const match = content.match(rule.pattern);
    if (match) {
      flags.push({
        ruleId: rule.id,
        category: rule.category,
        matched: match[0],
        severity: rule.severity,
      });
      if (rule.severity === "CRITICAL") hasCritical = true;
      if (rule.severity === "HIGH") hasHigh = true;

      if (rule.rewrite) {
        // Replace all occurrences
        rewritten = rewritten.replace(new RegExp(rule.pattern.source, "gi"), rule.rewrite(match[0]));
      }
    }
  }

  return { flags, rewritten, hasCritical, hasHigh };
}

// ============================================================
// AI MODERATION
// ============================================================

const AI_MODERATION_SYSTEM_PROMPT = `You are a child safety moderation AI for MathVerse, a multiplayer math game for children aged 8-13.

Analyze the following chat message and return a JSON object with these fields:
{
  "flagged": boolean,         // true if the message is unsafe for children
  "categories": string[],     // array of categories from: ["profanity","spam","personal_info_phone","personal_info_email","personal_info_address","personal_info_school","personal_info_password","personal_info_real_name","personal_info_social","link","grooming","bullying","harassment","hate_speech","inappropriate_language","sexual_content","self_harm","violence","phishing","scam"]
  "confidence": number,       // 0.0 to 1.0
  "suggestedAction": string,  // "ALLOW" | "REWRITE" | "BLOCK" | "ESCALATE"
  "rewrittenContent": string, // if REWRITE, the safe version; empty otherwise
  "reason": string            // brief explanation
}

Rules:
- Children may use mild playground language ("darn", "shoot") — ALLOW these.
- Block ANY personally identifying info (real names if asked, phone, email, address, school, social media).
- Block ALL external links.
- Block grooming patterns (asking to meet, secrets, gifts, "are you alone").
- Block bullying, harassment, hate speech.
- Block sexual or violent content.
- Block phishing/scams (free currency, account verification, password requests).
- ESCALATE (instead of BLOCK) when: self-harm mentioned, grooming suspected, or repeated severe violations.
- REWRITE only for minor profanity that has a clean substitute.
- Default to ALLOW for normal friendly chat, math talk, and game-related discussion.
- Be conservative: when in doubt, lean towards BLOCK for child safety.`;

export async function runAIModeration(content: string): Promise<AIModerationResult> {
  try {
    const result = await askAIForJSON<{
      flagged: boolean;
      categories: string[];
      confidence: number;
      suggestedAction: string;
      rewrittenContent?: string;
      reason: string;
    }>(
      `Analyze this chat message from a child in a multiplayer math game:\n\n"${content}"`,
      AI_MODERATION_SYSTEM_PROMPT
    );

    return {
      flagged: Boolean(result.flagged),
      categories: (result.categories ?? []) as ModerationCategory[],
      confidence: Math.min(1, Math.max(0, Number(result.confidence) ?? 0)),
      suggestedAction: (result.suggestedAction as AIModerationResult["suggestedAction"]) ?? "ALLOW",
      rewrittenContent: result.rewrittenContent || undefined,
      reason: result.reason ?? "",
    };
  } catch (err) {
    console.error("[moderation] AI moderation failed:", err);
    // Fail-safe: if AI is unavailable, only block what rules already caught
    return {
      flagged: false,
      categories: [],
      confidence: 0,
      suggestedAction: "ALLOW",
      reason: "AI moderation unavailable",
    };
  }
}

// ============================================================
// MAIN MODERATION PIPELINE
// ============================================================

export interface ModerationContext {
  userId: string;
  channelId: string;
  parentSettings?: { realNameSharing: boolean };
  enableAI?: boolean;
}

export async function moderateMessage(
  content: string,
  ctx: ModerationContext
): Promise<ModerationResult> {
  // Step 1: Rule-based pass
  const ruleResult = runRuleBasedModeration(content);

  // Step 2: Spam detection
  const spamCheck = spamDetector.recordAndCheck(ctx.userId, content);
  if (spamCheck.isSpam) {
    ruleResult.flags.push({
      ruleId: "spam_detected",
      category: "spam",
      matched: spamCheck.reason,
      severity: "MEDIUM",
    });
  }

  // Step 3: AI moderation (only if rules didn't already BLOCK, or if AI is explicitly enabled)
  let aiResult: AIModerationResult | null = null;
  const shouldRunAI =
    (ctx.enableAI ?? config.moderation.enableAIModeration) &&
    !ruleResult.hasCritical; // skip AI if rules already found critical issue

  if (shouldRunAI) {
    aiResult = await runAIModeration(content);
  }

  // Step 4: Decide final action
  let action: ModerationResult["action"] = "ALLOW";
  let status: ModerationStatus = "APPROVED";
  let displayedContent = content;
  let reason = "";
  let confidence = 0;

  if (ruleResult.hasCritical) {
    action = "BLOCK";
    status = "BLOCKED";
    reason = `Rule violation: ${ruleResult.flags.map((f) => f.category).join(", ")}`;
    displayedContent = "[blocked by safety filter]";
  } else if (ruleResult.hasHigh) {
    // Rewrite high-severity content (PII removal, etc.)
    action = "REWRITE";
    status = "REWRITTEN";
    displayedContent = ruleResult.rewritten;
    reason = `Personally identifiable information removed`;
    confidence = 0.95;
  } else if (aiResult && aiResult.flagged && aiResult.confidence >= config.moderation.aiConfidenceThreshold) {
    if (aiResult.suggestedAction === "ESCALATE") {
      action = "ESCALATE";
      status = "ESCALATED";
      displayedContent = "[under review]";
      reason = aiResult.reason;
      confidence = aiResult.confidence;
    } else if (aiResult.suggestedAction === "BLOCK") {
      action = "BLOCK";
      status = "BLOCKED";
      displayedContent = "[blocked by safety filter]";
      reason = aiResult.reason;
      confidence = aiResult.confidence;
    } else if (aiResult.suggestedAction === "REWRITE" && aiResult.rewrittenContent) {
      action = "REWRITE";
      status = "REWRITTEN";
      displayedContent = aiResult.rewrittenContent;
      reason = aiResult.reason;
      confidence = aiResult.confidence;
    }
  } else if (spamCheck.isSpam) {
    action = "BLOCK";
    status = "BLOCKED";
    displayedContent = "[blocked: spam]";
    reason = spamCheck.reason;
  } else if (ruleResult.flags.length > 0) {
    // Low-severity profanity: rewrite
    action = "REWRITE";
    status = "REWRITTEN";
    displayedContent = ruleResult.rewritten;
    reason = `Mild content rewritten`;
  }

  return {
    status,
    displayedContent,
    ruleFlags: ruleResult.flags,
    aiFlags: aiResult,
    confidence,
    reason,
    action,
  };
}

// ============================================================
// ESCALATING PENALTIES
// ============================================================

export function getPenaltyForViolationCount(count: number): {
  action: string;
  durationMin: number;
} {
  const penalties = config.moderation.escalatingPenalties;
  const idx = Math.min(count - 1, penalties.length - 1);
  return penalties[idx];
}

export function shouldEscalateToModerator(result: ModerationResult): boolean {
  if (result.action === "ESCALATE") return true;
  if (result.ruleFlags.some((f) => f.severity === "CRITICAL")) return true;
  if (result.aiFlags && result.aiFlags.confidence >= 0.85 && result.aiFlags.flagged) return true;
  return false;
}
