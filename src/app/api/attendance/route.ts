import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeSessionDate } from "@/lib/cbcs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "FACULTY" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only faculty or administrators can record attendance." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      courseId?: string;
      date?: string;
      records?: Array<{
        enrollmentId: string;
        status: "PRESENT" | "ABSENT";
      }>;
    } | null;

    const courseId = body?.courseId?.trim();
    const dateStr = body?.date?.trim() ?? "";
    const records = body?.records ?? [];

    if (!courseId || !dateStr || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "courseId, YYYY-MM-DD date, and attendance records are required." },
        { status: 400 }
      );
    }

    const sessionDate = normalizeSessionDate(dateStr);
    if (!sessionDate) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, facultyId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (user.role === "FACULTY" && course.facultyId !== user.id) {
      return NextResponse.json(
        { error: `You are not assigned as faculty for ${course.code}.` },
        { status: 403 }
      );
    }

    const validEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        id: { in: records.map((r) => r.enrollmentId) },
        status: "ENROLLED",
      },
      select: { id: true },
    });
    const validIds = new Set(validEnrollments.map((e) => e.id));

    for (const rec of records) {
      if (!validIds.has(rec.enrollmentId)) {
        return NextResponse.json(
          { error: `Enrollment ${rec.enrollmentId} is not active in ${course.code}.` },
          { status: 400 }
        );
      }
      if (rec.status !== "PRESENT" && rec.status !== "ABSENT") {
        return NextResponse.json(
          { error: "Attendance status must be PRESENT or ABSENT." },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      records.map((rec) =>
        prisma.attendance.upsert({
          where: {
            enrollmentId_date: {
              enrollmentId: rec.enrollmentId,
              date: sessionDate,
            },
          },
          create: {
            enrollmentId: rec.enrollmentId,
            date: sessionDate,
            status: rec.status,
          },
          update: {
            status: rec.status,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      message: `Saved ${records.length} attendance record(s) for ${course.code} on ${dateStr}.`,
    });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json(
      { error: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
