import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SEMESTER_CREDIT_CAP,
  calculateAttendanceStats,
  type AttendanceStats,
} from "@/lib/cbcs";

export interface CatalogCourseItem {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  semester: number;
  maxSeats: number;
  activeSeats: number;
  prerequisiteId: string | null;
  prerequisite: { id: string; code: string; title: string } | null;
  faculty: { id: string; name: string; email: string };
  studentStatus: "ENROLLED" | "COMPLETED" | "DROPPED" | null;
  prerequisiteMet: boolean;
  blockReason: string | null;
}

export interface StudentEnrollmentItem {
  id: string;
  courseId: string;
  status: "ENROLLED" | "COMPLETED" | "DROPPED";
  internalMarks: number | null;
  enrolledAt: string;
  course: {
    id: string;
    code: string;
    title: string;
    credits: number;
    semester: number;
    maxSeats: number;
    facultyName: string;
    prerequisiteCode: string | null;
  };
  attendanceStats: AttendanceStats;
  sessions: Array<{ id: string; date: string; status: "PRESENT" | "ABSENT" }>;
}

export interface StudentActivityItem {
  id: string;
  title: string;
  timestamp: string;
  kind: "enrollment" | "attendance" | "marks";
}

export async function getStudentDashboardData(studentId: string) {
  const [student, courses, enrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        enrollmentNo: true,
        role: true,
      },
    }),
    prisma.course.findMany({
      include: {
        faculty: { select: { id: true, name: true, email: true } },
        prerequisite: { select: { id: true, code: true, title: true } },
        enrollments: { select: { status: true } },
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    }),
    prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            faculty: { select: { name: true } },
            prerequisite: { select: { code: true } },
          },
        },
        attendance: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  if (!student) {
    return null;
  }

  const enrollmentByCourseId = new Map(
    enrollments.map((e) => [e.courseId, e])
  );

  const activeEnrollments = enrollments.filter((e) => e.status === "ENROLLED");
  const completedEnrollments = enrollments.filter(
    (e) => e.status === "COMPLETED"
  );

  const activeCredits = activeEnrollments.reduce(
    (sum, e) => sum + e.course.credits,
    0
  );
  const completedCredits = completedEnrollments.reduce(
    (sum, e) => sum + e.course.credits,
    0
  );

  const activeAttendanceRecords = activeEnrollments.flatMap((e) => e.attendance);
  const overallAttendance = calculateAttendanceStats(activeAttendanceRecords);

  const scoredEnrollments = activeEnrollments.filter(
    (e) => e.internalMarks !== null
  );
  const avgInternalMarks =
    scoredEnrollments.length > 0
      ? Math.round(
          scoredEnrollments.reduce((s, e) => s + (e.internalMarks ?? 0), 0) /
            scoredEnrollments.length
        )
      : null;

  const formattedEnrollments: StudentEnrollmentItem[] = enrollments
    .filter((e) => e.status !== "DROPPED")
    .map((e) => ({
      id: e.id,
      courseId: e.courseId,
      status: e.status,
      internalMarks: e.internalMarks,
      enrolledAt: e.enrolledAt.toISOString(),
      course: {
        id: e.course.id,
        code: e.course.code,
        title: e.course.title,
        credits: e.course.credits,
        semester: e.course.semester,
        maxSeats: e.course.maxSeats,
        facultyName: e.course.faculty.name,
        prerequisiteCode: e.course.prerequisite?.code ?? null,
      },
      attendanceStats: calculateAttendanceStats(e.attendance),
      sessions: e.attendance.map((a) => ({
        id: a.id,
        date: a.date.toISOString().slice(0, 10),
        status: a.status,
      })),
    }));

  const lowAttendanceAlerts = formattedEnrollments
    .filter(
      (e) => e.status === "ENROLLED" && e.attendanceStats.isLowAttendance
    )
    .map((e) => ({
      courseId: e.courseId,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      percentage: e.attendanceStats.percentage ?? 0,
      presentSessions: e.attendanceStats.presentSessions,
      totalSessions: e.attendanceStats.totalSessions,
    }));

  const catalogCourses: CatalogCourseItem[] = courses.map((course) => {
    const activeSeats = course.enrollments.filter(
      (e) => e.status === "ENROLLED"
    ).length;
    const studentEnrollment = enrollmentByCourseId.get(course.id);
    const studentStatus = studentEnrollment?.status ?? null;

    const prereqEnrollment = course.prerequisiteId
      ? enrollmentByCourseId.get(course.prerequisiteId)
      : null;
    const prerequisiteMet =
      !course.prerequisiteId || prereqEnrollment?.status === "COMPLETED";

    let blockReason: string | null = null;
    if (studentStatus === "ENROLLED") {
      blockReason = "Already enrolled";
    } else if (studentStatus === "COMPLETED") {
      blockReason = "Already completed";
    } else if (!prerequisiteMet && course.prerequisite) {
      blockReason = `Requires ${course.prerequisite.code} (${course.prerequisite.title}) completed`;
    } else if (activeSeats >= course.maxSeats) {
      blockReason = `Seats full (${activeSeats}/${course.maxSeats})`;
    } else if (activeCredits + course.credits > SEMESTER_CREDIT_CAP) {
      blockReason = `Exceeds ${SEMESTER_CREDIT_CAP}-credit cap (${activeCredits + course.credits}/${SEMESTER_CREDIT_CAP})`;
    }

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      credits: course.credits,
      semester: course.semester,
      maxSeats: course.maxSeats,
      activeSeats,
      prerequisiteId: course.prerequisiteId,
      prerequisite: course.prerequisite,
      faculty: course.faculty,
      studentStatus,
      prerequisiteMet,
      blockReason,
    };
  });

  const recentActivity: StudentActivityItem[] = [
    ...enrollments
      .filter((e) => e.status !== "DROPPED")
      .slice(0, 3)
      .map((e) => ({
        id: `enroll-${e.id}`,
        title:
          e.status === "COMPLETED"
            ? `Completed ${e.course.code} ${e.course.title}`
            : `Enrolled in ${e.course.code} ${e.course.title}`,
        timestamp: e.enrolledAt.toISOString(),
        kind: "enrollment" as const,
      })),
    ...activeAttendanceRecords.slice(0, 3).map((a) => {
      const parent = activeEnrollments.find((e) => e.id === a.enrollmentId);
      return {
        id: `att-${a.id}`,
        title: `Marked ${a.status === "PRESENT" ? "Present" : "Absent"} in ${parent?.course.code ?? "Course"}`,
        timestamp: a.date.toISOString(),
        kind: "attendance" as const,
      };
    }),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  return {
    student,
    kpis: {
      activeCredits,
      creditCap: SEMESTER_CREDIT_CAP,
      completedCredits,
      completedCourseCount: completedEnrollments.length,
      activeCourseCount: activeEnrollments.length,
      overallAttendance,
      avgInternalMarks,
    },
    lowAttendanceAlerts,
    enrollments: formattedEnrollments,
    catalogCourses,
    recentActivity,
  };
}

export async function getFacultyPortalData(userId: string, role: Role) {
  const courses = await prisma.course.findMany({
    where: role === "ADMIN" ? {} : { facultyId: userId },
    include: {
      faculty: { select: { id: true, name: true, email: true } },
      prerequisite: { select: { id: true, code: true, title: true } },
      enrollments: {
        where: { status: { in: ["ENROLLED", "COMPLETED"] } },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              enrollmentNo: true,
            },
          },
          attendance: {
            orderBy: { date: "desc" },
          },
        },
        orderBy: { student: { name: "asc" } },
      },
    },
    orderBy: [{ semester: "asc" }, { code: "asc" }],
  });

  return courses.map((course) => {
    const sessionDatesSet = new Set<string>();
    const students = course.enrollments.map((enr) => {
      for (const att of enr.attendance) {
        sessionDatesSet.add(att.date.toISOString().slice(0, 10));
      }
      const stats = calculateAttendanceStats(enr.attendance);
      return {
        enrollmentId: enr.id,
        studentId: enr.student.id,
        name: enr.student.name,
        email: enr.student.email,
        enrollmentNo: enr.student.enrollmentNo,
        status: enr.status,
        internalMarks: enr.internalMarks,
        attendanceStats: stats,
        attendanceByDate: Object.fromEntries(
          enr.attendance.map((a) => [a.date.toISOString().slice(0, 10), a.status])
        ),
      };
    });

    const lowAttendanceCount = students.filter(
      (s) => s.status === "ENROLLED" && s.attendanceStats.isLowAttendance
    ).length;

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      credits: course.credits,
      semester: course.semester,
      maxSeats: course.maxSeats,
      activeSeats: students.filter((s) => s.status === "ENROLLED").length,
      faculty: course.faculty,
      prerequisite: course.prerequisite,
      sessionDates: Array.from(sessionDatesSet).sort((a, b) =>
        b.localeCompare(a)
      ),
      lowAttendanceCount,
      students,
    };
  });
}

export async function getAdminOverviewData() {
  const [courses, facultyMembers, students] = await Promise.all([
    prisma.course.findMany({
      include: {
        faculty: { select: { id: true, name: true, email: true } },
        prerequisite: { select: { id: true, code: true, title: true } },
        enrollments: {
          include: {
            attendance: { select: { status: true } },
          },
        },
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: { in: ["FACULTY", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: {
        enrollments: {
          include: {
            course: { select: { code: true, credits: true } },
            attendance: { select: { status: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const formattedCourses = courses.map((c) => {
    const activeEnrollments = c.enrollments.filter(
      (e) => e.status === "ENROLLED"
    );
    const completedCount = c.enrollments.filter(
      (e) => e.status === "COMPLETED"
    ).length;
    const lowAttendanceStudents = activeEnrollments.filter(
      (e) => calculateAttendanceStats(e.attendance).isLowAttendance
    ).length;

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      credits: c.credits,
      semester: c.semester,
      maxSeats: c.maxSeats,
      activeSeats: activeEnrollments.length,
      completedCount,
      lowAttendanceStudents,
      prerequisiteId: c.prerequisiteId,
      prerequisite: c.prerequisite,
      facultyId: c.facultyId,
      faculty: c.faculty,
    };
  });

  const studentSummaries = students.map((s) => {
    const active = s.enrollments.filter((e) => e.status === "ENROLLED");
    const completed = s.enrollments.filter((e) => e.status === "COMPLETED");
    const activeCredits = active.reduce((sum, e) => sum + e.course.credits, 0);
    const completedCredits = completed.reduce(
      (sum, e) => sum + e.course.credits,
      0
    );
    const attStats = calculateAttendanceStats(
      active.flatMap((e) => e.attendance)
    );
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      enrollmentNo: s.enrollmentNo,
      activeCredits,
      completedCredits,
      activeCoursesCount: active.length,
      completedCoursesCount: completed.length,
      attendanceStats: attStats,
    };
  });

  const totalActiveEnrollments = formattedCourses.reduce(
    (sum, c) => sum + c.activeSeats,
    0
  );
  const totalMaxSeats = formattedCourses.reduce(
    (sum, c) => sum + c.maxSeats,
    0
  );
  const totalLowAttendanceAlerts = formattedCourses.reduce(
    (sum, c) => sum + c.lowAttendanceStudents,
    0
  );

  return {
    courses: formattedCourses,
    facultyMembers,
    students: studentSummaries,
    metrics: {
      totalCourses: formattedCourses.length,
      totalActiveEnrollments,
      totalMaxSeats,
      totalLowAttendanceAlerts,
      totalStudents: studentSummaries.length,
    },
  };
}
