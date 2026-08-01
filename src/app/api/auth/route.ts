/**
 * MathVerse — Auth API
 * POST /api/auth/register — create account
 * POST /api/auth/login — log in
 * POST /api/auth/logout — log out
 * GET  /api/auth/me — current session
 */

import { NextRequest, NextResponse } from "next/server";
import { registerUser, loginUser, clearSessionCookie, getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "register") {
    const result = await registerUser({
      email: body.email,
      username: body.username,
      displayName: body.displayName,
      password: body.password,
      role: body.role,
      parentEmail: body.parentEmail,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ user: result.user });
  }

  if (action === "login") {
    const result = await loginUser(body.email, body.password);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ user: result.user });
  }

  if (action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
