import { connection, NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const currentUser = await getCurrentUser();
    const studentIdParam = request.nextUrl.searchParams.get("studentId");
    const targetStudentId =
      currentUser?.role === "STUDENT"
        ? currentUser.id
        : currentUser?.role === "ADMIN" && studentIdParam
          ? studentIdParam
          : null;

    const [courses, studentEnrollments] = await Promise.all([
      prisma.course.findMany({
        include: {
          faculty: {
            select: { id: true, name: true, email: true },
          },
          prerequisite: {
            select: { id: true, code: true, title: true },
          },
          enrollments: {
            select: { status: true },
          },
        },
        orderBy: [{ semester: "asc" }, { code: "asc" }],
      }),
      targetStudentId
        ? prisma.enrollment.findMany({
            where: { studentId: targetStudentId },
            select: { courseId: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    const enrollmentMap = new Map(
      studentEnrollments.map((e) => [e.courseId, e.status])
    );

    const formatted = courses.map((course) => {
      const activeSeats = course.enrollments.filter(
        (e) => e.status === "ENROLLED"
      ).length;
      const completedCount = course.enrollments.filter(
        (e) => e.status === "COMPLETED"
      ).length;

      const studentStatus = enrollmentMap.get(course.id) ?? null;
      const prereqStatus = course.prerequisiteId
        ? enrollmentMap.get(course.prerequisiteId) ?? null
        : "NONE";

      const prerequisiteMet =
        !course.prerequisiteId || prereqStatus === "COMPLETED";

      const prerequisiteMissingReason =
        course.prerequisite && !prerequisiteMet
          ? `Requires ${course.prerequisite.code} (${course.prerequisite.title}) to be COMPLETED`
          : null;

      return {
        id: course.id,
        code: course.code,
        title: course.title,
        description: course.description,
        credits: course.credits,
        semester: course.semester,
        maxSeats: course.maxSeats,
        prerequisiteId: course.prerequisiteId,
        prerequisite: course.prerequisite,
        facultyId: course.facultyId,
        faculty: course.faculty,
        activeSeats,
        completedCount,
        studentStatus,
        prerequisiteMet,
        prerequisiteMissingReason,
      };
    });

    return NextResponse.json({ courses: formatted });
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create courses" },
        { status: 403 }
      );
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

    const code = body?.code?.trim().toUpperCase() ?? "";
    const title = body?.title?.trim() ?? "";
    const description = body?.description?.trim() ?? "";
    const credits = Number(body?.credits);
    const semester = Number(body?.semester);
    const maxSeats = Number(body?.maxSeats);
    const prerequisiteId = body?.prerequisiteId?.trim() || null;
    const facultyId = body?.facultyId?.trim() ?? "";

    if (!code || !title || !description) {
      return NextResponse.json(
        { error: "Course code, title, and description are required." },
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
    if (!facultyId) {
      return NextResponse.json(
        { error: "Assigned faculty member is required." },
        { status: 400 }
      );
    }

    const [existingCode, facultyUser, prereqCourse] = await Promise.all([
      prisma.course.findUnique({ where: { code } }),
      prisma.user.findUnique({ where: { id: facultyId } }),
      prerequisiteId
        ? prisma.course.findUnique({ where: { id: prerequisiteId } })
        : Promise.resolve(null),
    ]);

    if (existingCode) {
      return NextResponse.json(
        { error: `Course code ${code} already exists.` },
        { status: 400 }
      );
    }
    if (!facultyUser || (facultyUser.role !== "FACULTY" && facultyUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Selected faculty member does not exist." },
        { status: 400 }
      );
    }
    if (prerequisiteId && !prereqCourse) {
      return NextResponse.json(
        { error: "Selected prerequisite course does not exist." },
        { status: 400 }
      );
    }

    const created = await prisma.course.create({
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

    return NextResponse.json({ course: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
