import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_INTERNAL_MARKS } from "@/lib/cbcs";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "FACULTY" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only faculty or administrators can update internal marks." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, code: true, facultyId: true } },
        student: { select: { name: true } },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (
      user.role === "FACULTY" &&
      enrollment.course.facultyId !== user.id
    ) {
      return NextResponse.json(
        { error: `You are not assigned to ${enrollment.course.code}.` },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      internalMarks?: number | null;
      status?: "ENROLLED" | "COMPLETED";
    } | null;

    let nextMarks: number | null | undefined = undefined;
    if (body?.internalMarks !== undefined) {
      if (body.internalMarks === null) {
        nextMarks = null;
      } else {
        const parsed = Number(body.internalMarks);
        if (
          !Number.isInteger(parsed) ||
          parsed < 0 ||
          parsed > MAX_INTERNAL_MARKS
        ) {
          return NextResponse.json(
            {
              error: `Internal marks must be an integer between 0 and ${MAX_INTERNAL_MARKS}.`,
            },
            { status: 400 }
          );
        }
        nextMarks = parsed;
      }
    }

    if (
      body?.status !== undefined &&
      body.status !== "ENROLLED" &&
      body.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        { error: "Status must be ENROLLED or COMPLETED." },
        { status: 400 }
      );
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: {
        ...(nextMarks !== undefined ? { internalMarks: nextMarks } : {}),
        ...(body?.status !== undefined ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({
      enrollment: updated,
      message: `Updated ${enrollment.student.name} in ${enrollment.course.code}.`,
    });
  } catch (error) {
    console.error("PATCH /api/enrollments/[id]/marks error:", error);
    return NextResponse.json(
      { error: "Failed to update internal marks" },
      { status: 500 }
    );
  }
}
