/**
 * MANAHAD — Auth API
 *
 * GET  /api/auth                  — current session
 * POST /api/auth action=register  — create a CHILD account (username + dual passwords)
 * POST /api/auth action=login     — log in by username (returns loginMode: STUDENT | PARENT | ADMIN)
 * POST /api/auth action=logout    — clear session
 *
 * ensureAdminExists() runs on every request so the admin account is always reachable.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  registerUser,
  loginUserByUsername,
  clearSessionCookie,
  getCurrentUser,
  ensureAdminExists,
} from "@/lib/auth/session";

export async function GET() {
  await ensureAdminExists();
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  await ensureAdminExists();

  const body = await req.json();
  const { action } = body;

  if (action === "register") {
    const result = await registerUser({
      username: body.username,
      studentPassword: body.studentPassword,
      parentPassword: body.parentPassword,
      parentEmail: body.parentEmail,
    });
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error ?? "Registration failed" }, { status: 400 });
    }
    return NextResponse.json({ user: result.user });
  }

  if (action === "login") {
    const result = await loginUserByUsername(body.username, body.password);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error ?? "Login failed" }, { status: 401 });
    }
    return NextResponse.json({ user: result.user });
  }

  if (action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
