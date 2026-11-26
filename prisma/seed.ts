import { PrismaClient, Role, EnrollmentStatus, AttendanceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding UniTrack CMS database...");

  // Clear existing data in reverse foreign-key order for clean idempotent seeding
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed 4 Demo Users (Admin, Faculty, Fresh Student, Advanced Student)
  const admin = await prisma.user.create({
    data: {
      id: "user-admin-sharma",
      name: "Dr. R. Sharma",
      email: "r.sharma@unitrack.edu",
      enrollmentNo: null,
      role: Role.ADMIN,
    },
  });

  const faculty = await prisma.user.create({
    data: {
      id: "user-faculty-verma",
      name: "Prof. A. Verma",
      email: "a.verma@unitrack.edu",
      enrollmentNo: null,
      role: Role.FACULTY,
    },
  });

  const priya = await prisma.user.create({
    data: {
      id: "user-student-priya",
      name: "Priya Patel",
      email: "priya.patel@unitrack.edu",
      enrollmentNo: "BCA2026001",
      role: Role.STUDENT,
    },
  });

  const rahul = await prisma.user.create({
    data: {
      id: "user-student-rahul",
      name: "Rahul Das",
      email: "rahul.das@unitrack.edu",
      enrollmentNo: "BCA2026012",
      role: Role.STUDENT,
    },
  });

  // 2. Seed 6 Realistic BCA Courses (with self-referencing prerequisite & near-full elective)
  const bca101 = await prisma.course.create({
    data: {
      id: "course-bca-101",
      code: "BCA-101",
      title: "Programming in C",
      description:
        "Procedural programming fundamentals, control structures, arrays, pointers, dynamic memory, and file handling in C.",
      credits: 4,
      semester: 1,
      maxSeats: 50,
      prerequisiteId: null,
      facultyId: admin.id,
    },
  });

  const bca201 = await prisma.course.create({
    data: {
      id: "course-bca-201",
      code: "BCA-201",
      title: "Data Structures",
      description:
        "Abstract data types, linked lists, stacks, queues, binary trees, graphs, searching, sorting, and time-space complexity.",
      credits: 4,
      semester: 2,
      maxSeats: 40,
      prerequisiteId: bca101.id,
      facultyId: faculty.id,
    },
  });

  const bca301 = await prisma.course.create({
    data: {
      id: "course-bca-301",
      code: "BCA-301",
      title: "DBMS",
      description:
        "Relational database design, ER modeling, 3NF normalization, SQL queries, indexing, transactions, and ACID compliance.",
      credits: 6,
      semester: 3,
      maxSeats: 30,
      prerequisiteId: null,
      facultyId: faculty.id,
    },
  });

  const bca302 = await prisma.course.create({
    data: {
      id: "course-bca-302",
      code: "BCA-302",
      title: "Software Engineering",
      description:
        "SDLC models, agile sprint planning, SRS documentation, UML modeling, black-box/white-box testing, and maintenance.",
      credits: 5,
      semester: 3,
      maxSeats: 30,
      prerequisiteId: null,
      facultyId: faculty.id,
    },
  });

  const bca303 = await prisma.course.create({
    data: {
      id: "course-bca-303",
      code: "BCA-303",
      title: "Operating Systems",
      description:
        "CPU process scheduling, multithreading, mutexes and semaphores, deadlock avoidance, paging, and virtual memory.",
      credits: 5,
      semester: 3,
      maxSeats: 30,
      prerequisiteId: null,
      facultyId: faculty.id,
    },
  });

  const bca401 = await prisma.course.create({
    data: {
      id: "course-bca-401",
      code: "BCA-401",
      title: "Cloud & AI (Elective)",
      description:
        "Near-full CBCS open elective covering serverless cloud architecture, microservices, and applied AI engineering.",
      credits: 4,
      semester: 4,
      maxSeats: 2,
      prerequisiteId: null,
      facultyId: faculty.id,
    },
  });

  // 3. Seed Enrollments
  // Rahul Das: Completed BCA-101 (4 credits), Enrolled in BCA-301 (6) + BCA-302 (5) + BCA-303 (5) + BCA-401 (4) = 20/24 active credits
  await prisma.enrollment.create({
    data: {
      studentId: rahul.id,
      courseId: bca101.id,
      status: EnrollmentStatus.COMPLETED,
      internalMarks: 27,
      enrolledAt: new Date("2026-01-10T09:00:00.000Z"),
    },
  });

  const rahul301 = await prisma.enrollment.create({
    data: {
      studentId: rahul.id,
      courseId: bca301.id,
      status: EnrollmentStatus.ENROLLED,
      internalMarks: 25,
      enrolledAt: new Date("2026-08-05T10:00:00.000Z"),
    },
  });

  const rahul302 = await prisma.enrollment.create({
    data: {
      studentId: rahul.id,
      courseId: bca302.id,
      status: EnrollmentStatus.ENROLLED,
      internalMarks: 24,
      enrolledAt: new Date("2026-08-06T11:24:00.000Z"),
    },
  });

  const rahul303 = await prisma.enrollment.create({
    data: {
      studentId: rahul.id,
      courseId: bca303.id,
      status: EnrollmentStatus.ENROLLED,
      internalMarks: 23,
      enrolledAt: new Date("2026-08-07T09:30:00.000Z"),
    },
  });

  const rahul401 = await prisma.enrollment.create({
    data: {
      studentId: rahul.id,
      courseId: bca401.id,
      status: EnrollmentStatus.ENROLLED,
      internalMarks: 24,
      enrolledAt: new Date("2026-08-08T14:15:00.000Z"),
    },
  });

  // Priya Patel (Fresh): 0 completed courses; enrolled in BCA-101 (4) + BCA-301 (6) = 10/24 active credits
  const priya101 = await prisma.enrollment.create({
    data: {
      studentId: priya.id,
      courseId: bca101.id,
      status: EnrollmentStatus.ENROLLED,
      internalMarks: 19,
      enrolledAt: new Date("2026-08-05T09:15:00.000Z"),
    },
  });

  const priya301 = await prisma.enrollment.create({
    data: {
      studentId: priya.id,
      courseId: bca301.id,
      status: EnrollmentStatus.ENROLLED,
      internalMarks: 17,
      enrolledAt: new Date("2026-08-05T10:15:00.000Z"),
    },
  });

  // 4. Seed Attendance Sessions (Dates normalized to UTC midnight)
  const sessionDates = [
    new Date("2026-11-02T00:00:00.000Z"),
    new Date("2026-11-04T00:00:00.000Z"),
    new Date("2026-11-06T00:00:00.000Z"),
    new Date("2026-11-09T00:00:00.000Z"),
  ];

  // Rahul: 12/13 sessions present (92% - On Track, every course >= 75%)
  await prisma.attendance.createMany({
    data: [
      { enrollmentId: rahul301.id, date: sessionDates[0], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul301.id, date: sessionDates[1], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul301.id, date: sessionDates[2], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul301.id, date: sessionDates[3], status: AttendanceStatus.PRESENT },

      { enrollmentId: rahul302.id, date: sessionDates[0], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul302.id, date: sessionDates[1], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul302.id, date: sessionDates[2], status: AttendanceStatus.PRESENT },

      { enrollmentId: rahul303.id, date: sessionDates[0], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul303.id, date: sessionDates[1], status: AttendanceStatus.ABSENT },
      { enrollmentId: rahul303.id, date: sessionDates[2], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul303.id, date: sessionDates[3], status: AttendanceStatus.PRESENT },

      { enrollmentId: rahul401.id, date: sessionDates[0], status: AttendanceStatus.PRESENT },
      { enrollmentId: rahul401.id, date: sessionDates[1], status: AttendanceStatus.PRESENT },
    ],
  });

  // Priya: 5/8 sessions present (63% overall, 50% in DBMS -> triggers <75% critical alert)
  await prisma.attendance.createMany({
    data: [
      { enrollmentId: priya101.id, date: sessionDates[0], status: AttendanceStatus.PRESENT },
      { enrollmentId: priya101.id, date: sessionDates[1], status: AttendanceStatus.PRESENT },
      { enrollmentId: priya101.id, date: sessionDates[2], status: AttendanceStatus.ABSENT },
      { enrollmentId: priya101.id, date: sessionDates[3], status: AttendanceStatus.PRESENT },

      { enrollmentId: priya301.id, date: sessionDates[0], status: AttendanceStatus.PRESENT },
      { enrollmentId: priya301.id, date: sessionDates[1], status: AttendanceStatus.ABSENT },
      { enrollmentId: priya301.id, date: sessionDates[2], status: AttendanceStatus.ABSENT },
      { enrollmentId: priya301.id, date: sessionDates[3], status: AttendanceStatus.PRESENT },
    ],
  });

  console.log("Seed completed successfully:", {
    users: [admin.name, faculty.name, priya.name, rahul.name],
    courses: [bca101.code, bca201.code, bca301.code, bca302.code, bca303.code, bca401.code],
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
