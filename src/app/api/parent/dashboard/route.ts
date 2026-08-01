/**
 * GET /api/parent/dashboard
 * Parent sees all their children's data.
 */
import { NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/learning/adaptive";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();
    if (user.role !== "PARENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Parent access required" }, { status: 403 });
    }

    const links = await db.childParentLink.findMany({
      where: { parentId: user.id },
      include: {
        child: {
          include: {
            attempts: { orderBy: { createdAt: "desc" }, take: 200 },
            masteryRecords: { include: { topic: true } },
            chatMessages: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
            dailyStats: {
              orderBy: { date: "desc" },
              take: 7,
            },
            moderationActions: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: { moderator: true },
            },
          },
        },
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const children = links.map((link) => {
      const c = link.child;
      const questionsAnswered = c.attempts.length;
      const correctCount = c.attempts.filter((a) => a.isCorrect).length;
      const accuracy = questionsAnswered > 0 ? correctCount / questionsAnswered : 0;
      const timeSpentMin7d = c.dailyStats
        .filter((d) => new Date(d.date) >= sevenDaysAgo)
        .reduce((sum, d) => sum + d.timeSpentMin, 0);
      const weakTopics = c.masteryRecords
        .filter((m) => m.isWeak)
        .map((m) => ({
          topicSlug: m.topic.slug,
          topicName: m.topic.name,
          masteryScore: m.masteryScore,
        }));

      return {
        userId: c.id,
        displayName: c.displayName,
        username: c.username,
        level: levelFromXp(c.xp),
        xp: c.xp,
        accuracy,
        questionsAnswered,
        timeSpentMin7d,
        recentModerationActions: c.moderationActions.map((ma) => ({
          id: ma.id,
          actionType: ma.actionType,
          reason: ma.reason,
          active: ma.active,
          createdAt: ma.createdAt.toISOString(),
        })),
        recentChatMessages: c.chatMessages.map((m) => ({
          id: m.id,
          rawContent: m.rawContent,
          displayedContent: m.displayedContent,
          moderationStatus: m.moderationStatus,
          createdAt: m.createdAt.toISOString(),
        })),
        masteryWeakTopics: weakTopics,
      };
    });

    return NextResponse.json({ children });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
