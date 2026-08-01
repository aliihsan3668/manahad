/**
 * GET /api/moderator/dashboard
 * Returns moderation queue data.
 */
import { NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    }

    const [
      openReports,
      recentModerationActions,
      recentFlaggedMessages,
      activeMutesSuspensions,
      openAppeals,
    ] = await Promise.all([
      db.chatReport.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          message: { include: { user: true } },
          reportedUser: true,
          reporter: true,
        },
      }),
      db.moderationAction.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: true, moderator: true },
      }),
      db.chatMessage.findMany({
        where: { moderationStatus: { in: ["BLOCKED", "ESCALATED", "REWRITTEN"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: true },
      }),
      db.moderationAction.findMany({
        where: {
          active: true,
          actionType: { in: ["MUTE", "SUSPEND", "BAN"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true, moderator: true },
      }),
      db.appeal.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true, action: true },
      }),
    ]);

    return NextResponse.json({
      openReports: openReports.map((r) => ({
        id: r.id,
        messageId: r.messageId,
        reason: r.reason,
        notes: r.notes,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        message: {
          id: r.message.id,
          rawContent: r.message.rawContent,
          displayedContent: r.message.displayedContent,
          moderationStatus: r.message.moderationStatus,
        },
        reportedUser: {
          id: r.reportedUser.id,
          username: r.reportedUser.username,
          displayName: r.reportedUser.displayName,
        },
      })),
      recentModerationActions: recentModerationActions.map((ma) => ({
        id: ma.id,
        actionType: ma.actionType,
        reason: ma.reason,
        active: ma.active,
        durationMinutes: ma.durationMinutes,
        createdAt: ma.createdAt.toISOString(),
        user: {
          id: ma.user.id,
          username: ma.user.username,
          displayName: ma.user.displayName,
        },
        moderator: ma.moderator
          ? { id: ma.moderator.id, username: ma.moderator.username }
          : null,
      })),
      recentFlaggedMessages: recentFlaggedMessages.map((m) => ({
        id: m.id,
        rawContent: m.rawContent,
        displayedContent: m.displayedContent,
        moderationStatus: m.moderationStatus,
        moderationReason: m.moderationReason,
        createdAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          username: m.user.username,
          displayName: m.user.displayName,
        },
      })),
      activeMutesSuspensions: activeMutesSuspensions.map((ma) => ({
        id: ma.id,
        actionType: ma.actionType,
        reason: ma.reason,
        active: ma.active,
        expiresAt: ma.expiresAt ? ma.expiresAt.toISOString() : null,
        createdAt: ma.createdAt.toISOString(),
        user: {
          id: ma.user.id,
          username: ma.user.username,
          displayName: ma.user.displayName,
        },
      })),
      openAppeals: openAppeals.map((a) => ({
        id: a.id,
        reason: a.reason,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        user: {
          id: a.user.id,
          username: a.user.username,
          displayName: a.user.displayName,
        },
        action: {
          id: a.action.id,
          actionType: a.action.actionType,
          reason: a.action.reason,
          active: a.action.active,
        },
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
