/**
 * POST /api/moderator/appeal
 * Body: { appealId, status: "APPROVED"|"DENIED", reviewNotes }
 * Updates appeal; if APPROVED, deactivates the linked ModerationAction.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { appealId, status, reviewNotes = "" } = body;
    if (!appealId || (status !== "APPROVED" && status !== "DENIED")) {
      return NextResponse.json(
        { error: "appealId and status (APPROVED|DENIED) are required" },
        { status: 400 }
      );
    }

    const appeal = await db.appeal.findUnique({
      where: { id: appealId },
      include: { action: true },
    });
    if (!appeal) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
    }

    const updated = await db.appeal.update({
      where: { id: appealId },
      data: {
        status,
        reviewerId: user.id,
        reviewNotes,
        reviewedAt: new Date(),
      },
      include: { action: true, user: true, reviewer: true },
    });

    if (status === "APPROVED") {
      await db.moderationAction.update({
        where: { id: appeal.actionId },
        data: { active: false },
      });
    }

    // Notify the user who filed the appeal
    await db.notification.create({
      data: {
        userId: appeal.userId,
        type: "MODERATION",
        title: `Appeal ${status === "APPROVED" ? "Approved" : "Denied"}`,
        body: reviewNotes || `Your appeal has been ${status.toLowerCase()}.`,
      },
    });

    return NextResponse.json({
      success: true,
      appeal: {
        id: updated.id,
        status: updated.status,
        reviewNotes: updated.reviewNotes,
        reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
        reviewer: updated.reviewer
          ? { id: updated.reviewer.id, username: updated.reviewer.username }
          : null,
        action: {
          id: updated.action.id,
          actionType: updated.action.actionType,
          active: status === "APPROVED" ? false : updated.action.active,
        },
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
