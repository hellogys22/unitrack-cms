import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SEMESTER_CREDIT_CAP } from "@/lib/cbcs";
import { prisma } from "@/lib/prisma";

class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      courseId?: string;
      studentId?: string;
    } | null;

    const courseId = body?.courseId?.trim();
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    const targetStudentId =
      user.role === "STUDENT"
        ? user.id
        : user.role === "ADMIN" && body?.studentId
          ? body.studentId.trim()
          : null;

    if (!targetStudentId) {
      return NextResponse.json(
        { error: "Only student accounts can enroll in courses." },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: courseId },
        include: {
          prerequisite: {
            select: { id: true, code: true, title: true },
          },
        },
      });

      if (!course) {
        throw new ValidationError("Course not found.", 404);
      }

      // Rule 4: Duplicate Enrollment Prevention
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: targetStudentId,
            courseId: course.id,
          },
        },
      });

      if (existingEnrollment?.status === "ENROLLED") {
        throw new ValidationError(
          `Duplicate enrollment blocked: You are already ENROLLED in ${course.code} (${course.title}).`
        );
      }
      if (existingEnrollment?.status === "COMPLETED") {
        throw new ValidationError(
          `Duplicate enrollment blocked: You have already COMPLETED ${course.code} (${course.title}).`
        );
      }

      // Rule 1: Prerequisite Check
      if (course.prerequisiteId && course.prerequisite) {
        const prereqEnrollment = await tx.enrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId: targetStudentId,
              courseId: course.prerequisiteId,
            },
          },
        });

        if (!prereqEnrollment || prereqEnrollment.status !== "COMPLETED") {
          const currentState = prereqEnrollment
            ? `currently ${prereqEnrollment.status}`
            : "not taken";
          throw new ValidationError(
            `Prerequisite not met: You must COMPLETE ${course.prerequisite.code} (${course.prerequisite.title}) before enrolling in ${course.code} (${course.title}) [${currentState}].`
          );
        }
      }

      // Rule 3: Seat Capacity Check
      const activeSeatCount = await tx.enrollment.count({
        where: {
          courseId: course.id,
          status: "ENROLLED",
        },
      });

      if (activeSeatCount >= course.maxSeats) {
        throw new ValidationError(
          `Seat capacity reached: ${course.code} (${course.title}) is full (${activeSeatCount}/${course.maxSeats} seats occupied).`
        );
      }

      // Rule 2: Semester Credit Cap (<= 24 credits)
      const activeEnrollments = await tx.enrollment.findMany({
        where: {
          studentId: targetStudentId,
          status: "ENROLLED",
        },
        include: {
          course: { select: { credits: true } },
        },
      });

      const currentCredits = activeEnrollments.reduce(
        (sum, item) => sum + item.course.credits,
        0
      );

      if (currentCredits + course.credits > SEMESTER_CREDIT_CAP) {
        throw new ValidationError(
          `Semester credit cap exceeded: Enrolling in ${course.code} (+${course.credits} credits) with ${currentCredits} active credits would reach ${currentCredits + course.credits}/${SEMESTER_CREDIT_CAP} credits.`
        );
      }

      const enrollment = existingEnrollment
        ? await tx.enrollment.update({
            where: { id: existingEnrollment.id },
            data: {
              status: "ENROLLED",
              enrolledAt: new Date(),
            },
          })
        : await tx.enrollment.create({
            data: {
              studentId: targetStudentId,
              courseId: course.id,
              status: "ENROLLED",
            },
          });

      return {
        enrollment,
        course,
        activeCredits: currentCredits + course.credits,
        reEnrolled: Boolean(existingEnrollment),
      };
    });

    return NextResponse.json(
      {
        enrollment: result.enrollment,
        activeCredits: result.activeCredits,
        message: `Successfully enrolled in ${result.course.code} (${result.course.title}). Active credits: ${result.activeCredits}/${SEMESTER_CREDIT_CAP}.`,
      },
      { status: result.reEnrolled ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("POST /api/enroll error:", error);
    return NextResponse.json(
      { error: "Failed to process enrollment" },
      { status: 500 }
    );
  }
}
