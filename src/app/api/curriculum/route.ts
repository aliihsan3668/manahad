/**
 * GET /api/curriculum
 * Public endpoint — lists all curricula with their topics.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const curricula = await db.curriculum.findMany({
      orderBy: { code: "asc" },
      include: {
        topics: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const result = curricula.map((c) => ({
      code: c.code,
      name: c.name,
      description: c.description,
      region: c.region,
      topics: c.topics.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        difficulty: t.difficulty,
        bloomsLevel: t.bloomsLevel,
        learningObjective: t.learningObjective,
      })),
    }));

    return NextResponse.json({ curricula: result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
