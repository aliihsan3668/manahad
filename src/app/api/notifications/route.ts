/**
 * GET  /api/notifications — list unread notifications (limit 20, most recent first)
 * POST /api/notifications — body { action: "read", notificationId | "readAll" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();
    const notifications = await db.notification.findMany({
      where: { userId: user.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
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
    const { action, notificationId } = body;
    if (action !== "read") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (notificationId === "readAll") {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, marked: "all" });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    await db.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, marked: notificationId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
