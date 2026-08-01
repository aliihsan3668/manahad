/**
 * MathVerse — Auth & Session Helpers
 *
 * Lightweight session management using signed cookies.
 * For production with Supabase, swap these for Supabase Auth — the
 * rest of the app calls getCurrentUser() and doesn't care about the
 * implementation underneath.
 */

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { UserSession, AvatarConfig } from "@/lib/types";
import { config } from "@/lib/config";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "mv_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days, in seconds

// ============================================================
// PASSWORD HASHING (simple, server-only)
// In production, use argon2 or bcrypt via edge function
// ============================================================

function hashPassword(password: string, salt: string = "mathverse"): string {
  return createHash("sha256")
    .update(salt + password + config.auth.sessionSecret)
    .digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  if (computed.length !== hash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function createPasswordHash(password: string): string {
  return hashPassword(password);
}

// ============================================================
// SESSION TOKENS (signed)
// Format: userId.hmac
// ============================================================

function signToken(userId: string): string {
  const hmac = createHash("sha256")
    .update(userId + config.auth.sessionSecret)
    .digest("hex")
    .slice(0, 32);
  return `${userId}.${hmac}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  const expected = createHash("sha256")
    .update(userId + config.auth.sessionSecret)
    .digest("hex")
    .slice(0, 32);
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return userId;
  } catch {
    return null;
  }
}

// ============================================================
// COOKIE MANAGEMENT
// ============================================================

export async function setSessionCookie(userId: string): Promise<void> {
  const token = signToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.app.environment === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

// ============================================================
// CURRENT USER
// ============================================================

const DEFAULT_AVATAR: AvatarConfig = {
  skinTone: "#fbcfa0",
  hair: "hair-short",
  hairColor: "#3a2a1a",
  outfit: "outfit-default",
  hat: "hat-none",
  accessory: "acc-none",
  shoes: "shoes-default",
  backpack: "bp-none",
  pet: "pet-none",
  trail: "trail-none",
  emote: "emote-wave",
};

export async function getCurrentUser(): Promise<UserSession | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { parentSettings: true },
  });
  if (!user) return null;

  let avatarConfig: AvatarConfig;
  try {
    avatarConfig = { ...DEFAULT_AVATAR, ...JSON.parse(user.avatarConfig) };
  } catch {
    avatarConfig = DEFAULT_AVATAR;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserSession["role"],
    avatarConfig,
    brainEnergy: user.brainEnergy,
    maxBrainEnergy: user.maxBrainEnergy,
    xp: user.xp,
    level: user.level,
    coins: user.coins,
    streak: user.streak,
    parentSettings: user.parentSettings
      ? {
          chatEnabled: user.parentSettings.chatEnabled,
          approvedFriendsOnly: user.parentSettings.approvedFriendsOnly,
          friendApprovalRequired: user.parentSettings.friendApprovalRequired,
          playtimeMinutesPerDay: user.parentSettings.playtimeMinutesPerDay,
          playtimeMinutesPerSession: user.parentSettings.playtimeMinutesPerSession,
          weeklyReportEmail: user.parentSettings.weeklyReportEmail,
          alertOnModeration: user.parentSettings.alertOnModeration,
          alertOnFriendRequest: user.parentSettings.alertOnFriendRequest,
          realNameSharing: user.parentSettings.realNameSharing,
        }
      : undefined,
  };
}

export async function getCurrentUserOrThrow(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ============================================================
// REGISTRATION
// ============================================================

export async function registerUser(opts: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  role?: "CHILD" | "PARENT" | "TEACHER" | "MODERATOR";
  parentEmail?: string; // for child accounts
}): Promise<{ user: UserSession; error?: string }> {
  const { email, username, displayName, password, role = "CHILD", parentEmail } = opts;

  // Validate
  if (!email || !email.includes("@")) return { user: null as never, error: "Invalid email" };
  if (!username || username.length < 3) return { user: null as never, error: "Username must be at least 3 characters" };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { user: null as never, error: "Username can only contain letters, numbers, and underscores" };
  if (!password || password.length < 6) return { user: null as never, error: "Password must be at least 6 characters" };

  // Check uniqueness
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return { user: null as never, error: "Email or username already taken" };
  }

  const passwordHash = createPasswordHash(password);

  const user = await db.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash,
      role,
      avatarConfig: JSON.stringify(DEFAULT_AVATAR),
    },
  });

  // If child registering with parent email, create a pending parent link
  if (role === "CHILD" && parentEmail) {
    const parent = await db.user.findUnique({ where: { email: parentEmail } });
    if (parent && parent.role === "PARENT") {
      await db.childParentLink.create({
        data: {
          childId: user.id,
          parentId: parent.id,
          relation: "PARENT",
          approved: true,
        },
      });
    }
  }

  // If parent registering, create parent settings
  if (role === "PARENT") {
    await db.parentSettings.create({
      data: { parentId: user.id },
    });
  }

  await setSessionCookie(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role as UserSession["role"],
      avatarConfig: DEFAULT_AVATAR,
      brainEnergy: user.brainEnergy,
      maxBrainEnergy: user.maxBrainEnergy,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      streak: user.streak,
    },
  };
}

export async function loginUser(email: string, password: string): Promise<{ user: UserSession | null; error?: string }> {
  const user = await db.user.findUnique({ where: { email }, include: { parentSettings: true } });
  if (!user) return { user: null, error: "Email not found" };
  if (!verifyPassword(password, user.passwordHash)) return { user: null, error: "Incorrect password" };

  await setSessionCookie(user.id);

  let avatarConfig: AvatarConfig;
  try {
    avatarConfig = { ...DEFAULT_AVATAR, ...JSON.parse(user.avatarConfig) };
  } catch {
    avatarConfig = DEFAULT_AVATAR;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role as UserSession["role"],
      avatarConfig,
      brainEnergy: user.brainEnergy,
      maxBrainEnergy: user.maxBrainEnergy,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      streak: user.streak,
      parentSettings: user.parentSettings
        ? {
            chatEnabled: user.parentSettings.chatEnabled,
            approvedFriendsOnly: user.parentSettings.approvedFriendsOnly,
            friendApprovalRequired: user.parentSettings.friendApprovalRequired,
            playtimeMinutesPerDay: user.parentSettings.playtimeMinutesPerDay,
            playtimeMinutesPerSession: user.parentSettings.playtimeMinutesPerSession,
            weeklyReportEmail: user.parentSettings.weeklyReportEmail,
            alertOnModeration: user.parentSettings.alertOnModeration,
            alertOnFriendRequest: user.parentSettings.alertOnFriendRequest,
            realNameSharing: user.parentSettings.realNameSharing,
          }
        : undefined,
    },
  };
}

// ============================================================
// HELPERS
// ============================================================

export function generateId(): string {
  return randomBytes(16).toString("hex");
}
