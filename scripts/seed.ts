/**
 * MathVerse — Database Seed Script
 *
 * Seeds:
 *   - 5 curricula (Pakistan, Cambridge, IB, Common Core, CBSE)
 *   - Grade 6 + topic tree (24 topics across 5 curricula)
 *   - All cosmetics
 *   - All achievements
 *   - Quest templates (daily/weekly/monthly)
 *   - Sample NPCs (linked to world areas)
 *   - Demo accounts: 1 parent, 3 children, 1 moderator
 *
 * Run: bun run scripts/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { CURRICULA, GRADE_6_TOPICS } from "../src/lib/curriculum/data";
import { COSMETICS } from "../src/lib/game/cosmetics";
import { ACHIEVEMENTS, QUEST_TEMPLATES } from "../src/lib/game/achievements";
import { NPCS } from "../src/lib/game/world";
import { createPasswordHash } from "../src/lib/auth/session";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MathVerse database...");

  // ===== CURRICULA & GRADES & TOPICS =====
  for (const c of CURRICULA) {
    const curriculum = await db.curriculum.upsert({
      where: { code: c.code },
      create: { code: c.code, name: c.name, description: c.description, region: c.region },
      update: { name: c.name, description: c.description, region: c.region },
    });

    const grade = await db.grade.upsert({
      where: { curriculumId_gradeLevel: { curriculumId: curriculum.id, gradeLevel: 6 } },
      create: {
        curriculumId: curriculum.id,
        gradeLevel: 6,
        name: "Grade 6",
        description: "Sixth grade mathematics",
      },
      update: { name: "Grade 6" },
    });

    const topicsForCurriculum = GRADE_6_TOPICS.filter((t) => t.appliesTo.includes(c.code));
    for (const t of topicsForCurriculum) {
      await db.curriculumTopic.upsert({
        where: { curriculumId_slug: { curriculumId: curriculum.id, slug: t.slug } },
        create: {
          curriculumId: curriculum.id,
          gradeId: grade.id,
          slug: t.slug,
          name: t.name,
          description: t.description,
          difficulty: t.difficulty,
          sortOrder: GRADE_6_TOPICS.indexOf(t),
          learningObjective: t.learningObjective,
          bloomsLevel: t.bloomsLevel,
          estimatedMinutes: t.estimatedMinutes,
          prerequisites: JSON.stringify(t.prerequisites),
        },
        update: {
          name: t.name,
          description: t.description,
          difficulty: t.difficulty,
          learningObjective: t.learningObjective,
          bloomsLevel: t.bloomsLevel,
          estimatedMinutes: t.estimatedMinutes,
          prerequisites: JSON.stringify(t.prerequisites),
        },
      });
    }
    console.log(`  ✓ Curriculum: ${c.code} with ${topicsForCurriculum.length} topics`);
  }

  // ===== COSMETICS =====
  for (const c of COSMETICS) {
    await db.cosmetic.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        category: c.category,
        rarity: c.rarity,
        color: c.color,
        price: c.price,
        isDefault: c.isDefault,
        unlockCriteria: JSON.stringify(c.unlockCriteria ?? {}),
        metadata: JSON.stringify({ emoji: c.emoji, description: c.description }),
      },
      update: {
        name: c.name,
        category: c.category,
        rarity: c.rarity,
        color: c.color,
        price: c.price,
        isDefault: c.isDefault,
        unlockCriteria: JSON.stringify(c.unlockCriteria ?? {}),
        metadata: JSON.stringify({ emoji: c.emoji, description: c.description }),
      },
    });
  }
  console.log(`  ✓ ${COSMETICS.length} cosmetics`);

  // ===== ACHIEVEMENTS =====
  for (const a of ACHIEVEMENTS) {
    await db.achievement.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        rarity: a.rarity,
        xpReward: a.xpReward,
        coinsReward: a.coinsReward,
        criteria: JSON.stringify(a.criteria),
      },
      update: {
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        rarity: a.rarity,
        xpReward: a.xpReward,
        coinsReward: a.coinsReward,
        criteria: JSON.stringify(a.criteria),
      },
    });
  }
  console.log(`  ✓ ${ACHIEVEMENTS.length} achievements`);

  // ===== QUESTS =====
  for (const q of QUEST_TEMPLATES) {
    const now = new Date();
    const endsAt = new Date();
    if (q.questType === "DAILY") endsAt.setDate(now.getDate() + 1);
    else if (q.questType === "WEEKLY") endsAt.setDate(now.getDate() + 7);
    else endsAt.setMonth(now.getMonth() + 1);

    await db.quest.upsert({
      where: { slug: q.slug },
      create: {
        slug: q.slug,
        title: q.title,
        description: q.description,
        questType: q.questType,
        category: q.category,
        target: q.target,
        xpReward: q.xpReward,
        coinsReward: q.coinsReward,
        brainEnergyReward: q.brainEnergyReward,
        endsAt,
        isActive: true,
      },
      update: {
        title: q.title,
        description: q.description,
        target: q.target,
        xpReward: q.xpReward,
        coinsReward: q.coinsReward,
        brainEnergyReward: q.brainEnergyReward,
        endsAt,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${QUEST_TEMPLATES.length} quests`);

  // ===== NPCs =====
  for (const n of NPCS) {
    await db.nPC.upsert({
      where: { slug: n.slug },
      create: {
        slug: n.slug,
        name: n.name,
        area: n.area,
        x: 450,
        y: 250,
        dialogues: JSON.stringify(n.dialogues),
      },
      update: {
        name: n.name,
        area: n.area,
        dialogues: JSON.stringify(n.dialogues),
      },
    });
  }
  console.log(`  ✓ ${NPCS.length} NPCs`);

  // ===== DEMO ACCOUNTS =====
  const passwordHash = createPasswordHash("password123");

  const parent = await db.user.upsert({
    where: { email: "parent@mathverse.demo" },
    create: {
      email: "parent@mathverse.demo",
      username: "parent_demo",
      displayName: "Demo Parent",
      passwordHash,
      role: "PARENT",
    },
    update: {},
  });
  await db.parentSettings.upsert({
    where: { parentId: parent.id },
    create: { parentId: parent.id },
    update: {},
  });

  const childNames = [
    { email: "alex@mathverse.demo", username: "alex_kid", displayName: "Alex" },
    { email: "mia@mathverse.demo", username: "mia_kid", displayName: "Mia" },
    { email: "zain@mathverse.demo", username: "zain_kid", displayName: "Zain" },
  ];

  for (const c of childNames) {
    const child = await db.user.upsert({
      where: { email: c.email },
      create: {
        email: c.email,
        username: c.username,
        displayName: c.displayName,
        passwordHash,
        role: "CHILD",
        xp: Math.floor(Math.random() * 500) + 100,
        coins: Math.floor(Math.random() * 200) + 50,
        level: Math.floor(Math.random() * 4) + 2,
      },
      update: {},
    });

    await db.childParentLink.upsert({
      where: {
        childId_parentId_relation: {
          childId: child.id,
          parentId: parent.id,
          relation: "PARENT",
        },
      },
      create: {
        childId: child.id,
        parentId: parent.id,
        relation: "PARENT",
        approved: true,
      },
      update: {},
    });

    // Give default cosmetics (equipped)
    const defaultCosmetics = COSMETICS.filter((c) => c.isDefault);
    for (const cos of defaultCosmetics) {
      const cosmeticRecord = await db.cosmetic.findUnique({ where: { slug: cos.slug } });
      if (!cosmeticRecord) continue;
      await db.inventoryItem.upsert({
        where: {
          userId_cosmeticId: {
            userId: child.id,
            cosmeticId: cosmeticRecord.id,
          },
        },
        create: {
          userId: child.id,
          cosmeticId: cosmeticRecord.id,
          isEquipped: true,
        },
        update: {},
      });
    }

    await db.worldPresence.upsert({
      where: { userId: child.id },
      create: { userId: child.id, area: "town", x: 400 + Math.random() * 200, y: 300 + Math.random() * 100 },
      update: {},
    });
  }

  await db.user.upsert({
    where: { email: "mod@mathverse.demo" },
    create: {
      email: "mod@mathverse.demo",
      username: "moderator",
      displayName: "Math Mod",
      passwordHash,
      role: "MODERATOR",
    },
    update: {},
  });

  console.log("  ✓ Demo accounts: 1 parent, 3 children, 1 moderator");
  console.log("  Login credentials:");
  console.log("    Parent:    parent@mathverse.demo / password123");
  console.log("    Child:     alex@mathverse.demo / password123");
  console.log("    Moderator: mod@mathverse.demo / password123");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
