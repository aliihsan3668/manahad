/**
 * GET  /api/inventory — list user's inventory with cosmetic details
 * POST /api/inventory — { action: "buy"|"equip"|"unequip", cosmeticSlug }
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCosmeticBySlug } from "@/lib/game/cosmetics";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrow();
    const items = await db.inventoryItem.findMany({
      where: { userId: user.id },
      include: { cosmetic: true },
      orderBy: { acquiredAt: "desc" },
    });

    return NextResponse.json({
      inventory: items.map((i) => ({
        id: i.id,
        cosmeticId: i.cosmeticId,
        slug: i.cosmetic.slug,
        name: i.cosmetic.name,
        category: i.cosmetic.category,
        rarity: i.cosmetic.rarity,
        isEquipped: i.isEquipped,
        acquiredAt: i.acquiredAt.toISOString(),
      })),
      coins: (await db.user.findUnique({ where: { id: user.id } }))?.coins ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { action, cosmeticSlug } = body;
    if (!action || !cosmeticSlug) {
      return NextResponse.json({ error: "action and cosmeticSlug are required" }, { status: 400 });
    }

    const cosmeticDef = getCosmeticBySlug(cosmeticSlug);
    if (!cosmeticDef) {
      return NextResponse.json({ error: "Unknown cosmetic" }, { status: 404 });
    }
    const cosmetic = await db.cosmetic.findUnique({ where: { slug: cosmeticSlug } });
    if (!cosmetic) {
      return NextResponse.json({ error: "Cosmetic not in catalog" }, { status: 404 });
    }

    if (action === "buy") {
      const existing = await db.inventoryItem.findUnique({
        where: { userId_cosmeticId: { userId: user.id, cosmeticId: cosmetic.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Already owned" }, { status: 400 });
      }

      // Check unlock criteria (level-based)
      const userRow = await db.user.findUnique({ where: { id: user.id } });
      if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

      if (cosmeticDef.unlockCriteria?.type === "level") {
        const required = parseInt(cosmeticDef.unlockCriteria.value, 10);
        if (userRow.level < required) {
          return NextResponse.json(
            { error: `Requires level ${required}` },
            { status: 403 }
          );
        }
      }

      if (userRow.coins < cosmetic.price) {
        return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
      }

      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { coins: { decrement: cosmetic.price } },
        }),
        db.inventoryItem.create({
          data: {
            userId: user.id,
            cosmeticId: cosmetic.id,
            isEquipped: false,
          },
        }),
      ]);

      return NextResponse.json({ success: true, action: "buy" });
    }

    if (action === "equip") {
      const item = await db.inventoryItem.findUnique({
        where: { userId_cosmeticId: { userId: user.id, cosmeticId: cosmetic.id } },
      });
      if (!item) {
        return NextResponse.json({ error: "Not owned" }, { status: 400 });
      }
      // Unequip others in same category
      const sameCategory = await db.inventoryItem.findMany({
        where: { userId: user.id, cosmetic: { category: cosmetic.category } },
      });
      await db.$transaction([
        ...sameCategory.map((i) =>
          db.inventoryItem.update({
            where: { id: i.id },
            data: { isEquipped: false },
          })
        ),
        db.inventoryItem.update({
          where: { id: item.id },
          data: { isEquipped: true },
        }),
      ]);
      return NextResponse.json({ success: true, action: "equip" });
    }

    if (action === "unequip") {
      const item = await db.inventoryItem.findUnique({
        where: { userId_cosmeticId: { userId: user.id, cosmeticId: cosmetic.id } },
      });
      if (!item) {
        return NextResponse.json({ error: "Not owned" }, { status: 400 });
      }
      await db.inventoryItem.update({
        where: { id: item.id },
        data: { isEquipped: false },
      });

      // If this was a default, equip the default for the category instead
      if (cosmeticDef.isDefault) {
        const defaultItem = await db.inventoryItem.findFirst({
          where: {
            userId: user.id,
            cosmetic: {
              category: cosmetic.category,
              isDefault: true,
              slug: { not: cosmetic.slug },
            },
          },
        });
        if (defaultItem) {
          await db.inventoryItem.update({
            where: { id: defaultItem.id },
            data: { isEquipped: true },
          });
        }
      }
      return NextResponse.json({ success: true, action: "unequip" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
