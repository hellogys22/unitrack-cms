import { connection, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAdminOverviewData } from "@/lib/queries";

export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Administrator role required" },
        { status: 403 }
      );
    }

    const data = await getAdminOverviewData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json(
      { error: "Failed to load admin overview" },
      { status: 500 }
    );
  }
}
