/**
 * POST /api/moderator/action
 * Body: { actionType, userId, reason, durationMinutes? }
 * Creates a ModerationAction.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

const VALID_ACTIONS = new Set(["WARNING", "MUTE", "SUSPEND", "BAN", "UNMUTE", "UNSUSPEND"]);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { actionType, userId, reason, durationMinutes = 0 } = body;
    if (!actionType || !userId || !reason) {
      return NextResponse.json(
        { error: "actionType, userId, reason are required" },
        { status: 400 }
      );
    }
    if (!VALID_ACTIONS.has(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    let expiresAt: Date | null = null;
    let active = true;
    if (actionType === "WARNING") active = false;
    if (actionType === "UNMUTE" || actionType === "UNSUSPEND") {
      active = false;
      // Lift existing similar action
      const matchType = actionType === "UNMUTE" ? "MUTE" : "SUSPEND";
      await db.moderationAction.updateMany({
        where: { userId, actionType: matchType, active: true },
        data: { active: false },
      });
    }
    if (durationMinutes > 0 && (actionType === "MUTE" || actionType === "SUSPEND")) {
      expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    }

    const action = await db.moderationAction.create({
      data: {
        userId,
        moderatorId: user.id,
        actionType,
        reason,
        durationMinutes,
        active,
        expiresAt,
      },
      include: { user: true, moderator: true },
    });

    // Notify the affected user
    await db.notification.create({
      data: {
        userId,
        type: "MODERATION",
        title: `Moderation action: ${actionType}`,
        body: reason,
      },
    });

    return NextResponse.json({
      success: true,
      action: {
        id: action.id,
        actionType: action.actionType,
        reason: action.reason,
        active: action.active,
        durationMinutes: action.durationMinutes,
        expiresAt: action.expiresAt ? action.expiresAt.toISOString() : null,
        createdAt: action.createdAt.toISOString(),
        moderator: action.moderator
          ? { id: action.moderator.id, username: action.moderator.username }
          : null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
