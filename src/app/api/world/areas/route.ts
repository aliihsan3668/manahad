/**
 * GET /api/world/areas
 * Public — returns world areas.
 */
import { NextResponse } from "next/server";
import { WORLD_AREAS, NPCS } from "@/lib/game/world";

export async function GET() {
  return NextResponse.json({ areas: WORLD_AREAS, npcs: NPCS });
}
