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
      identifier?: string;
    } | null;

    const userId = body?.userId?.trim();
    const email = body?.email?.trim().toLowerCase();
    const identifier = body?.identifier?.trim();

    if (!userId && !email && !identifier) {
      return NextResponse.json(
        { error: "Please enter an email address or enrollment number." },
        { status: 400 }
      );
    }

    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : email
        ? await prisma.user.findUnique({ where: { email } })
        : await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: identifier, mode: "insensitive" } },
                { enrollmentNo: { equals: identifier, mode: "insensitive" } },
              ],
            },
          });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Account not found. Try a seeded email (e.g. rahul.das@unitrack.edu) or enrollment no (e.g. BCA2026012).",
        },
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
