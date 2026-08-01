/**
 * POST /api/quests/claim
 * Body: { questId }
 * Awards quest rewards; sets claimedAt.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { questId } = body;
    if (!questId) {
      return NextResponse.json({ error: "questId is required" }, { status: 400 });
    }

    const uq = await db.userQuest.findUnique({
      where: { userId_questId: { userId: user.id, questId } },
      include: { quest: true },
    });
    if (!uq) {
      return NextResponse.json({ error: "Quest not assigned" }, { status: 404 });
    }
    if (!uq.completed) {
      return NextResponse.json({ error: "Quest not completed" }, { status: 400 });
    }
    if (uq.claimedAt) {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }

    await db.$transaction([
      db.userQuest.update({
        where: { id: uq.id },
        data: { claimedAt: new Date() },
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: uq.quest.xpReward },
          coins: { increment: uq.quest.coinsReward },
          brainEnergy: { increment: uq.quest.brainEnergyReward },
        },
      }),
    ]);

    await db.notification.create({
      data: {
        userId: user.id,
        type: "QUEST_COMPLETE",
        title: `Quest Complete: ${uq.quest.title}!`,
        body: `You earned ${uq.quest.xpReward} XP, ${uq.quest.coinsReward} coins, ${uq.quest.brainEnergyReward} Brain Energy!`,
      },
    });

    return NextResponse.json({
      success: true,
      rewards: {
        xp: uq.quest.xpReward,
        coins: uq.quest.coinsReward,
        brainEnergy: uq.quest.brainEnergyReward,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
