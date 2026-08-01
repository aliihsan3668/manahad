/**
 * GET /api/quests
 * Returns all active quests with the user's progress.
 */
import { NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { QuestDTO } from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();

    const quests = await db.quest.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    const userQuests = await db.userQuest.findMany({
      where: { userId: user.id },
    });
    const uqMap = new Map(userQuests.map((uq) => [uq.questId, uq]));

    const result: QuestDTO[] = quests.map((q) => {
      const uq = uqMap.get(q.id);
      return {
        id: q.id,
        slug: q.slug,
        title: q.title,
        description: q.description,
        questType: q.questType,
        category: q.category,
        target: q.target,
        progress: uq?.progress ?? 0,
        completed: uq?.completed ?? false,
        claimed: uq?.claimedAt !== null && uq?.claimedAt !== undefined,
        xpReward: q.xpReward,
        coinsReward: q.coinsReward,
        brainEnergyReward: q.brainEnergyReward,
        endsAt: q.endsAt ? q.endsAt.toISOString() : null,
      };
    });

    return NextResponse.json({ quests: result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
