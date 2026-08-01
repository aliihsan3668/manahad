/**
 * GET  /api/avatar — get current avatar config + owned cosmetics
 * POST /api/avatar — { avatarConfig: Partial<AvatarConfig> } — merge + save
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
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

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();
    const userRow = await db.user.findUnique({
      where: { id: user.id },
      include: { inventoryItems: { include: { cosmetic: true } } },
    });
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let avatarConfig: AvatarConfig = DEFAULT_AVATAR;
    try {
      avatarConfig = { ...DEFAULT_AVATAR, ...JSON.parse(userRow.avatarConfig) };
    } catch {}

    return NextResponse.json({
      avatarConfig,
      ownedCosmetics: userRow.inventoryItems.map((i) => ({
        id: i.id,
        cosmeticId: i.cosmeticId,
        slug: i.cosmetic.slug,
        name: i.cosmetic.name,
        category: i.cosmetic.category,
        isEquipped: i.isEquipped,
        acquiredAt: i.acquiredAt.toISOString(),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { avatarConfig } = body as { avatarConfig: Partial<AvatarConfig> };
    if (!avatarConfig || typeof avatarConfig !== "object") {
      return NextResponse.json({ error: "avatarConfig is required" }, { status: 400 });
    }

    const userRow = await db.user.findUnique({ where: { id: user.id } });
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let current: AvatarConfig = DEFAULT_AVATAR;
    try {
      current = { ...DEFAULT_AVATAR, ...JSON.parse(userRow.avatarConfig) };
    } catch {}

    const merged: AvatarConfig = { ...current, ...avatarConfig };
    await db.user.update({
      where: { id: user.id },
      data: { avatarConfig: JSON.stringify(merged) },
    });

    return NextResponse.json({ avatarConfig: merged });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
