import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getRoleHomePath,
  getSessionCookieOptions,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      userId?: string;
      email?: string;
    } | null;

    const userId = body?.userId?.trim();
    const email = body?.email?.trim().toLowerCase();

    if (!userId && !email) {
      return NextResponse.json(
        { error: "userId or email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Demo user account not found. Ensure database is seeded." },
        { status: 404 }
      );
    }

    const token = createSessionToken(user.id);
    const isHttps = request.nextUrl.protocol === "https:";
    const response = NextResponse.json({
      user,
      redirectTo: getRoleHomePath(user.role),
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(isHttps)
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
