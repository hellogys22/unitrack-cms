import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "unitrack_session";

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "unitrack-cms-cbcs-demo-signing-secret";

function signUserId(userId: string): string {
  return createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
}

export function createSessionToken(userId: string): string {
  const sig = signUserId(userId);
  return `${userId}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  if (!userId || !sig) return null;

  const expectedSig = signUserId(userId);
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return userId;
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(isHttps = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: isHttps || process.env.VERCEL === "1",
  };
}

export function getRoleHomePath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "FACULTY":
      return "/faculty";
    case "STUDENT":
      return "/student";
  }
}
