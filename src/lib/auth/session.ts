/**
 * MANAHAD — Auth & Session Helpers
 *
 * Username-based dual-password system:
 *   - Each CHILD account has a `passwordHash` (student password) and an
 *     optional `parentPasswordHash` (parent password).
 *   - Logging in with the student password yields `loginMode: "STUDENT"`.
 *   - Logging in with the parent password yields `loginMode: "PARENT"`.
 *   - ADMIN accounts always log in as `loginMode: "ADMIN"`.
 *
 * Email is generated internally as `${username.toLowerCase()}@manahad.local`
 * and is never shown to the user — it simply satisfies the unique-email
 * constraint of the User table.
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

function hashPassword(password: string, salt: string = "manahad"): string {
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
// DEFAULT AVATAR
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

export { DEFAULT_AVATAR };
export type { AvatarConfig };

// ============================================================
// HELPERS
// ============================================================

export function generateId(): string {
  return randomBytes(16).toString("hex");
}

function emailFromUsername(username: string): string {
  return `${username.toLowerCase()}@manahad.local`;
}

function parseAvatar(raw: string | null | undefined): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR;
  try {
    return { ...DEFAULT_AVATAR, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AVATAR;
  }
}

function toUserSession(
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
    avatarConfig: string;
    brainEnergy: number;
    maxBrainEnergy: number;
    xp: number;
    level: number;
    coins: number;
    streak: number;
    parentSettings?: {
      chatEnabled: boolean;
      approvedFriendsOnly: boolean;
      friendApprovalRequired: boolean;
      playtimeMinutesPerDay: number;
      playtimeMinutesPerSession: number;
      weeklyReportEmail: boolean;
      alertOnModeration: boolean;
      alertOnFriendRequest: boolean;
      realNameSharing: boolean;
    } | null;
  },
  loginMode: "STUDENT" | "PARENT" | "ADMIN"
): UserSession {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserSession["role"],
    avatarConfig: parseAvatar(user.avatarConfig),
    brainEnergy: user.brainEnergy,
    maxBrainEnergy: user.maxBrainEnergy,
    xp: user.xp,
    level: user.level,
    coins: user.coins,
    streak: user.streak,
    loginMode,
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

// ============================================================
// CURRENT USER
// ============================================================

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

  // Role-based default login mode. ADMIN → ADMIN, everyone else defaults to STUDENT.
  // (The actual login mode at sign-in time is also captured by the route handler via
  // loginUserByUsername, but getCurrentUser does not have access to that signal —
  // it reconstructs the mode from role + presence of parent password hash.)
  const loginMode: UserSession["loginMode"] =
    user.role === "ADMIN"
      ? "ADMIN"
      : user.role === "PARENT"
        ? "PARENT"
        : "STUDENT";

  return toUserSession(user, loginMode);
}

export async function getCurrentUserOrThrow(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ============================================================
// REGISTRATION (username-based, dual password for CHILD)
// ============================================================

export async function registerUser(opts: {
  username: string;
  studentPassword: string;
  parentPassword?: string;
  parentEmail?: string;
}): Promise<{ user: UserSession | null; error?: string }> {
  const { username, studentPassword, parentPassword, parentEmail } = opts;

  // Validate username
  if (!username || username.length < 3) {
    return { user: null, error: "Username must be at least 3 characters" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { user: null, error: "Username can only contain letters, numbers, and underscores" };
  }

  // Validate student password (4+ chars — friendly for kids)
  if (!studentPassword || studentPassword.length < 4) {
    return { user: null, error: "Student password must be at least 4 characters" };
  }

  // Validate optional parent password (6+ chars if provided)
  if (parentPassword !== undefined && parentPassword !== "" && parentPassword.length < 6) {
    return { user: null, error: "Parent password must be at least 6 characters" };
  }

  // Validate parent email if provided
  if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    return { user: null, error: "Parent email is not valid" };
  }

  const email = emailFromUsername(username);

  // Check uniqueness (username OR email)
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return { user: null, error: "That username is already taken" };
  }

  const passwordHash = createPasswordHash(studentPassword);
  const parentPasswordHash =
    parentPassword && parentPassword.length > 0
      ? createPasswordHash(parentPassword)
      : null;

  const created = await db.user.create({
    data: {
      email,
      username,
      displayName: username,
      passwordHash,
      parentPasswordHash,
      parentEmail: parentEmail || null,
      role: "CHILD",
      avatarConfig: JSON.stringify(DEFAULT_AVATAR),
    },
    include: { parentSettings: true },
  });

  await setSessionCookie(created.id);

  return { user: toUserSession(created, "STUDENT") };
}

// ============================================================
// LOGIN (username-based, dual password)
// ============================================================

export async function loginUserByUsername(
  username: string,
  password: string
): Promise<{ user: UserSession | null; error?: string }> {
  if (!username || !password) {
    return { user: null, error: "Username and password are required" };
  }

  const user = await db.user.findUnique({
    where: { username },
    include: { parentSettings: true },
  });
  if (!user) {
    return { user: null, error: "Username not found" };
  }

  // Admin always authenticates via passwordHash (their primary password) and
  // always logs in with loginMode === "ADMIN".
  if (user.role === "ADMIN") {
    if (!verifyPassword(password, user.passwordHash)) {
      return { user: null, error: "Incorrect password" };
    }
    await setSessionCookie(user.id);
    return { user: toUserSession(user, "ADMIN") };
  }

  // Try student password first
  if (verifyPassword(password, user.passwordHash)) {
    await setSessionCookie(user.id);
    return { user: toUserSession(user, "STUDENT") };
  }

  // Then try parent password (if present)
  if (user.parentPasswordHash && verifyPassword(password, user.parentPasswordHash)) {
    await setSessionCookie(user.id);
    return { user: toUserSession(user, "PARENT") };
  }

  return { user: null, error: "Incorrect password" };
}

// ============================================================
// ADMIN BOOTSTRAP — ensures the admin account exists
// ============================================================

const ADMIN_USERNAME = "mxaliihsan";
const ADMIN_PASSWORD = "M12a34I56";

export async function ensureAdminExists(): Promise<void> {
  const existing = await db.user.findUnique({
    where: { username: ADMIN_USERNAME },
  });
  if (existing) {
    // If the admin row exists but for some reason isn't flagged as ADMIN, fix it.
    if (existing.role !== "ADMIN") {
      await db.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          passwordHash: createPasswordHash(ADMIN_PASSWORD),
        },
      });
    }
    return;
  }

  await db.user.create({
    data: {
      email: emailFromUsername(ADMIN_USERNAME),
      username: ADMIN_USERNAME,
      displayName: "Admin",
      passwordHash: createPasswordHash(ADMIN_PASSWORD),
      role: "ADMIN",
      avatarConfig: JSON.stringify(DEFAULT_AVATAR),
    },
  });
}
