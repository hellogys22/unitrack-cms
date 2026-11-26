import { connection, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFacultyPortalData } from "@/lib/queries";

export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "FACULTY" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Faculty or Admin role required" },
        { status: 403 }
      );
    }

    const courses = await getFacultyPortalData(user.id, user.role);
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("GET /api/faculty/courses error:", error);
    return NextResponse.json(
      { error: "Failed to load faculty courses" },
      { status: 500 }
    );
  }
}
