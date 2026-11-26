import { connection, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/queries";

export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Student role required" },
        { status: 403 }
      );
    }

    const data = await getStudentDashboardData(user.id);
    if (!data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/student/dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load student dashboard" },
      { status: 500 }
    );
  }
}
