/**
 * GET /api/online
 *
 * Returns all users whose `lastActiveAt` is within the last 2 minutes, along
 * with their world presence (current area). Requires authentication.
 *
 * Each entry: { id, username, displayName, level, area, isCurrentUser, avatarConfig }
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { AvatarConfig } from "@/lib/types";
import { DEFAULT_AVATAR } from "@/lib/auth/session";

interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  level: number;
  area: string;
  isCurrentUser: boolean;
  avatarConfig: AvatarConfig;
}

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

function parseAvatar(raw: string | null | undefined): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR;
  try {
    return { ...DEFAULT_AVATAR, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AVATAR;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);

    // Users active within the window (we don't restrict by role — moderators/admins
    // show up too, marked as such via their displayName/level).
    const recent = await db.user.findMany({
      where: { lastActiveAt: { gte: cutoff } },
      select: {
        id: true,
        username: true,
        displayName: true,
        level: true,
        avatarConfig: true,
        worldPositions: { take: 1 },
      },
    });

    const rows: OnlineUser[] = recent.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      level: u.level,
      area: u.worldPositions[0]?.area ?? "town",
      isCurrentUser: u.id === user.id,
      avatarConfig: parseAvatar(u.avatarConfig),
    }));

    // Sort: current user first, then by displayName for stability.
    rows.sort((a, b) => {
      if (a.isCurrentUser !== b.isCurrentUser) return a.isCurrentUser ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return NextResponse.json({ users: rows, count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
