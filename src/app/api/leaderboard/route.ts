/**
 * GET /api/leaderboard?limit=20
 * Public — top players by XP.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/learning/adaptive";
import type { AvatarConfig } from "@/lib/types";

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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 20;

    const users = await db.user.findMany({
      where: { role: "CHILD" },
      orderBy: { xp: "desc" },
      take: limit,
    });

    const result = users.map((u) => {
      let avatarConfig: AvatarConfig = DEFAULT_AVATAR;
      try {
        avatarConfig = { ...DEFAULT_AVATAR, ...JSON.parse(u.avatarConfig) };
      } catch {}
      return {
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        level: levelFromXp(u.xp),
        xp: u.xp,
        avatarConfig,
      };
    });

    return NextResponse.json({ leaderboard: result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
