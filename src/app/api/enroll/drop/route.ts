import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SEMESTER_CREDIT_CAP } from "@/lib/cbcs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can drop enrolled courses." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      courseId?: string;
    } | null;

    const courseId = body?.courseId?.trim();
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId,
        },
      },
      include: {
        course: { select: { code: true, title: true, credits: true } },
      },
    });

    if (!enrollment || enrollment.status !== "ENROLLED") {
      return NextResponse.json(
        { error: "You are not currently ENROLLED in this course." },
        { status: 400 }
      );
    }

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "DROPPED" },
    });

    const remaining = await prisma.enrollment.findMany({
      where: { studentId: user.id, status: "ENROLLED" },
      include: { course: { select: { credits: true } } },
    });
    const activeCredits = remaining.reduce(
      (sum, item) => sum + item.course.credits,
      0
    );

    return NextResponse.json({
      ok: true,
      activeCredits,
      message: `Dropped ${enrollment.course.code} (${enrollment.course.title}). Active credits: ${activeCredits}/${SEMESTER_CREDIT_CAP}.`,
    });
  } catch (error) {
    console.error("POST /api/enroll/drop error:", error);
    return NextResponse.json(
      { error: "Failed to drop course" },
      { status: 500 }
    );
  }
}
