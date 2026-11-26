import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function hasPrerequisiteCycle(
  courseId: string,
  candidatePrerequisiteId: string
): Promise<boolean> {
  const visited = new Set<string>([courseId]);
  let currentId: string | null = candidatePrerequisiteId;

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    const parent: { prerequisiteId: string | null } | null =
      await prisma.course.findUnique({
        where: { id: currentId },
        select: { prerequisiteId: true },
      });
    currentId = parent?.prerequisiteId ?? null;
  }

  return false;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update courses" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.course.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { status: "ENROLLED" },
          select: { id: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as {
      code?: string;
      title?: string;
      description?: string;
      credits?: number;
      semester?: number;
      maxSeats?: number;
      prerequisiteId?: string | null;
      facultyId?: string;
    } | null;

    const code = body?.code?.trim().toUpperCase() ?? existing.code;
    const title = body?.title?.trim() ?? existing.title;
    const description = body?.description?.trim() ?? existing.description;
    const credits =
      body?.credits !== undefined ? Number(body.credits) : existing.credits;
    const semester =
      body?.semester !== undefined ? Number(body.semester) : existing.semester;
    const maxSeats =
      body?.maxSeats !== undefined ? Number(body.maxSeats) : existing.maxSeats;
    const prerequisiteId =
      body?.prerequisiteId !== undefined
        ? body.prerequisiteId?.trim() || null
        : existing.prerequisiteId;
    const facultyId = body?.facultyId?.trim() || existing.facultyId;

    if (!code || !title || !description) {
      return NextResponse.json(
        { error: "Course code, title, and description cannot be empty." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(credits) || credits < 1 || credits > 12) {
      return NextResponse.json(
        { error: "Credits must be an integer between 1 and 12." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      return NextResponse.json(
        { error: "Semester must be an integer between 1 and 8." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(maxSeats) || maxSeats < 1 || maxSeats > 500) {
      return NextResponse.json(
        { error: "Max seats must be an integer between 1 and 500." },
        { status: 400 }
      );
    }

    const activeEnrolledCount = existing.enrollments.length;
    if (maxSeats < activeEnrolledCount) {
      return NextResponse.json(
        {
          error: `Cannot reduce max seats to ${maxSeats}: ${activeEnrolledCount} student(s) are currently enrolled.`,
        },
        { status: 400 }
      );
    }

    if (code !== existing.code) {
      const codeTaken = await prisma.course.findUnique({ where: { code } });
      if (codeTaken) {
        return NextResponse.json(
          { error: `Course code ${code} is already assigned to another course.` },
          { status: 400 }
        );
      }
    }

    if (prerequisiteId) {
      if (prerequisiteId === id) {
        return NextResponse.json(
          { error: "A course cannot be its own prerequisite." },
          { status: 400 }
        );
      }
      const prereqExists = await prisma.course.findUnique({
        where: { id: prerequisiteId },
      });
      if (!prereqExists) {
        return NextResponse.json(
          { error: "Selected prerequisite course does not exist." },
          { status: 400 }
        );
      }
      if (await hasPrerequisiteCycle(id, prerequisiteId)) {
        return NextResponse.json(
          {
            error:
              "Circular prerequisite detected: selected prerequisite chain cycles back to this course.",
          },
          { status: 400 }
        );
      }
    }

    const facultyUser = await prisma.user.findUnique({
      where: { id: facultyId },
    });
    if (
      !facultyUser ||
      (facultyUser.role !== "FACULTY" && facultyUser.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "Selected faculty member does not exist." },
        { status: 400 }
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        code,
        title,
        description,
        credits,
        semester,
        maxSeats,
        prerequisiteId,
        facultyId,
      },
      include: {
        faculty: { select: { id: true, name: true, email: true } },
        prerequisite: { select: { id: true, code: true, title: true } },
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error("PATCH /api/courses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can delete courses" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, code: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Rule 5: Safe Course Deletion — Block deletion if any students are currently ENROLLED
    const activeEnrolledCount = await prisma.enrollment.count({
      where: {
        courseId: id,
        status: "ENROLLED",
      },
    });

    if (activeEnrolledCount > 0) {
      return NextResponse.json(
        {
          error: `Safe Delete Blocked: Cannot delete ${course.code} (${course.title}) because ${activeEnrolledCount} student(s) are currently ENROLLED.`,
        },
        { status: 400 }
      );
    }

    await prisma.course.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Course ${course.code} (${course.title}) deleted successfully.`,
    });
  } catch (error) {
    console.error("DELETE /api/courses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
