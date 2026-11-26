import { connection, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  try {
    const currentUser = await getCurrentUser();
    const demoUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        enrollmentNo: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      user: currentUser,
      demoUsers,
    });
  } catch (error) {
    console.error("GET /api/auth/session error:", error);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 }
    );
  }
}
