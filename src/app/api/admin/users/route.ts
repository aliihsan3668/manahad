/**
 * GET  /api/admin/users                — list all users + dashboard stats (ADMIN only)
 * DELETE /api/admin/users?userId=<id>  — delete a user (ADMIN only, cannot delete self)
 *
 * Access control: caller's loginMode MUST be "ADMIN".
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

interface AdminUserRow {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  coins: number;
  questionsAnswered: number;
  accuracy: number;
  lastActiveAt: string;
  createdAt: string;
  parentEmail: string | null;
  hasParentPassword: boolean;
}

interface AdminUsersResponse {
  stats: {
    totalUsers: number;
    totalStudents: number;
    activeToday: number;
    totalAttempts: number;
    totalQuestions: number;
  };
  users: AdminUserRow[];
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.loginMode !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Aggregate counts in parallel
    const [allUsers, attemptCount, questionCount] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { attempts: true } },
          attempts: {
            select: { isCorrect: true },
            take: 1000,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      db.attempt.count(),
      db.question.count(),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const rows: AdminUserRow[] = allUsers.map((u) => {
      const total = u.attempts.length;
      const correct = u.attempts.filter((a) => a.isCorrect).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        role: u.role,
        xp: u.xp,
        level: u.level,
        coins: u.coins,
        questionsAnswered: u._count.attempts,
        accuracy,
        lastActiveAt: u.lastActiveAt.toISOString(),
        createdAt: u.createdAt.toISOString(),
        parentEmail: u.parentEmail,
        hasParentPassword: !!u.parentPasswordHash,
      };
    });

    const totalStudents = allUsers.filter((u) => u.role === "CHILD").length;
    const activeToday = allUsers.filter((u) => u.lastActiveAt >= startOfToday).length;

    const response: AdminUsersResponse = {
      stats: {
        totalUsers: allUsers.length,
        totalStudents,
        activeToday,
        totalAttempts: attemptCount,
        totalQuestions: questionCount,
      },
      users: rows,
    };

    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.loginMode !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const targetId = url.searchParams.get("userId");
    if (!targetId) {
      return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
    }
    if (targetId === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.user.delete({ where: { id: targetId } });

    return NextResponse.json({ success: true, deletedId: targetId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
