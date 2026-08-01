/**
 * POST /api/analytics
 * Public (optional auth) — track an analytics event.
 * Body: { eventType, eventProps }
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { eventType, eventProps } = body;
    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }

    await db.analyticsEvent.create({
      data: {
        userId: user?.id ?? null,
        eventType,
        eventProps: JSON.stringify(eventProps ?? {}),
        anonymized: !user,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
