/**
 * POST /api/parent/settings
 * Body: Partial<ParentSettings>
 * Updates the parent's settings record.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

const ALLOWED_FIELDS = [
  "chatEnabled",
  "approvedFriendsOnly",
  "friendApprovalRequired",
  "playtimeMinutesPerDay",
  "playtimeMinutesPerSession",
  "weeklyReportEmail",
  "alertOnModeration",
  "alertOnFriendRequest",
  "realNameSharing",
] as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    if (user.role !== "PARENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Parent access required" }, { status: 403 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    const updated = await db.parentSettings.upsert({
      where: { parentId: user.id },
      create: {
        parentId: user.id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({
      settings: {
        chatEnabled: updated.chatEnabled,
        approvedFriendsOnly: updated.approvedFriendsOnly,
        friendApprovalRequired: updated.friendApprovalRequired,
        playtimeMinutesPerDay: updated.playtimeMinutesPerDay,
        playtimeMinutesPerSession: updated.playtimeMinutesPerSession,
        weeklyReportEmail: updated.weeklyReportEmail,
        alertOnModeration: updated.alertOnModeration,
        alertOnFriendRequest: updated.alertOnFriendRequest,
        realNameSharing: updated.realNameSharing,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
