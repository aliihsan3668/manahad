/**
 * POST /api/world/move
 * Body: { area, x, y, direction }
 * Upserts the current user's WorldPresence.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";

const VALID_DIRECTIONS = new Set(["up", "down", "left", "right"]);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { area, x, y, direction } = body;
    if (!area || typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json(
        { error: "area (string), x (number), y (number) are required" },
        { status: 400 }
      );
    }
    const dir = VALID_DIRECTIONS.has(direction) ? direction : "down";

    await db.worldPresence.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        area,
        x,
        y,
        direction: dir,
        isMoving: true,
        lastSeenAt: new Date(),
      },
      update: {
        area,
        x,
        y,
        direction: dir,
        isMoving: true,
        lastSeenAt: new Date(),
      },
    });

    // Keep the user's lastActiveAt fresh so /api/online and the admin dashboard
    // can surface them as currently online.
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
