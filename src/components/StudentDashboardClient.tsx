"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  PlusCircle,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  AppShell,
  type DemoUserOption,
  type NavItem,
} from "@/components/AppShell";
import {
  CapacityBarChart,
  CircularProgressRing,
} from "@/components/CapacityBarChart";
import { useToast } from "@/components/ToastProvider";
import type {
  CatalogCourseItem,
  StudentActivityItem,
  StudentEnrollmentItem,
} from "@/lib/queries";
import type { AttendanceStats } from "@/lib/cbcs";

export interface StudentDashboardPayload {
  student: DemoUserOption;
  kpis: {
    activeCredits: number;
    creditCap: number;
    completedCredits: number;
    completedCourseCount: number;
    activeCourseCount: number;
    overallAttendance: AttendanceStats;
    avgInternalMarks: number | null;
  };
  lowAttendanceAlerts: Array<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    percentage: number;
    presentSessions: number;
    totalSessions: number;
  }>;
  enrollments: StudentEnrollmentItem[];
  catalogCourses: CatalogCourseItem[];
  recentActivity: StudentActivityItem[];
}

const STUDENT_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "courses", label: "My Courses", icon: "courses" },
  { id: "attendance", label: "Attendance", icon: "attendance" },
  { id: "marks", label: "Marks", icon: "marks" },
  { id: "catalog", label: "Course Catalog", icon: "catalog" },
  { id: "enroll", label: "Enroll / Drop", icon: "enroll" },
];

export function StudentDashboardClient({
  initialData,
  demoUsers,
}: {
  initialData: StudentDashboardPayload;
  demoUsers: DemoUserOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [data, setData] = useState<StudentDashboardPayload>(initialData);
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<
    "ALL" | "ENROLLED" | "OPEN" | "LOCKED"
  >("ALL");
  const [semesterFilter, setSemesterFilter] = useState<string>("ALL");
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function refreshDashboard() {
    const res = await fetch("/api/student/dashboard", { cache: "no-store" });
    if (res.ok) {
      const next: StudentDashboardPayload = await res.json();
      setData(next);
    }
    router.refresh();
  }

  async function handleEnroll(course: CatalogCourseItem) {
    setBusyCourseId(course.id);
    setValidationAlert(null);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const payload = await res.json();
      if (!res.ok) {
        const msg =
          payload.error ?? `Unable to enroll in ${course.code}.`;
        setValidationAlert({ type: "error", message: msg });
        showToast({
          variant: "error",
          title: `Enrollment Blocked — ${course.code}`,
          description: msg,
        });
        return;
      }
      setValidationAlert({ type: "success", message: payload.message });
      showToast({
        variant: "success",
        title: `Enrolled in ${course.code}`,
        description: payload.message,
      });
      await refreshDashboard();
    } catch {
      showToast({
        variant: "error",
        title: "Network error",
        description: "Failed to submit enrollment request.",
      });
    } finally {
      setBusyCourseId(null);
    }
  }

  async function handleDrop(courseId: string, courseCode: string) {
    setBusyCourseId(courseId);
    setValidationAlert(null);
    try {
      const res = await fetch("/api/enroll/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        const msg = payload.error ?? `Could not drop ${courseCode}.`;
        setValidationAlert({ type: "error", message: msg });
        showToast({
          variant: "error",
          title: `Drop Failed — ${courseCode}`,
          description: msg,
        });
        return;
      }
      setValidationAlert({ type: "success", message: payload.message });
      showToast({
        variant: "info",
        title: `Dropped ${courseCode}`,
        description: payload.message,
      });
      await refreshDashboard();
    } catch {
      showToast({
        variant: "error",
        title: "Network error",
        description: "Failed to drop course.",
      });
    } finally {
      setBusyCourseId(null);
    }
  }

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.catalogCourses.filter((c) => {
      if (
        q &&
        !c.code.toLowerCase().includes(q) &&
        !c.title.toLowerCase().includes(q) &&
        !c.faculty.name.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (semesterFilter !== "ALL" && String(c.semester) !== semesterFilter) {
        return false;
      }
      if (catalogFilter === "ENROLLED") {
        return c.studentStatus === "ENROLLED" || c.studentStatus === "COMPLETED";
      }
      if (catalogFilter === "OPEN") {
        return (
          c.studentStatus !== "ENROLLED" &&
          c.studentStatus !== "COMPLETED" &&
          c.prerequisiteMet &&
          c.activeSeats < c.maxSeats
        );
      }
      if (catalogFilter === "LOCKED") {
        return !c.prerequisiteMet;
      }
      return true;
    });
  }, [data.catalogCourses, searchQuery, semesterFilter, catalogFilter]);

  const semesters = useMemo(
    () =>
      Array.from(new Set(data.catalogCourses.map((c) => c.semester))).sort(
        (a, b) => a - b
      ),
    [data.catalogCourses]
  );

  const creditPercent = Math.min(
    100,
    Math.round((data.kpis.activeCredits / data.kpis.creditCap) * 100)
  );
  const attendancePct = data.kpis.overallAttendance.percentage ?? 100;
  const isOverallLowAttendance = data.kpis.overallAttendance.isLowAttendance;
  const hasAnyLowAttendance =
    isOverallLowAttendance || data.lowAttendanceAlerts.length > 0;

  return (
    <AppShell
      currentUser={data.student}
      demoUsers={demoUsers}
      navItems={STUDENT_NAV}
      activeNav={activeNav}
      onSelectNav={(id) => {
        setActiveNav(id);
        if (id === "courses") setCatalogFilter("ENROLLED");
        else if (id === "catalog" || id === "enroll") setCatalogFilter("ALL");
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search courses by code, title, or faculty..."
    >
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#003366]">
            Welcome back, {data.student.name}!
          </h1>
          <p className="mt-1 text-sm text-[#444444]">
            Track your CBCS credit cap, check prerequisites, and manage semester
            enrollments.
          </p>
        </div>

        <div className="flex items-center gap-4 self-start rounded-2xl border border-[#E8EDF5] bg-white px-4 py-3 shadow-xs sm:self-auto">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#003366]">
                BCA Student
              </div>
              <div className="text-[11px] font-medium text-[#555555]">
                {data.student.enrollmentNo ?? "BCA2026"}
              </div>
            </div>
          </div>
          <div className="h-8 w-px bg-[#E5E9F0]" />
          <div>
            <div className="text-[11px] font-medium text-[#666666]">
              Current Semester
            </div>
            <div className="text-xs font-bold text-[#003366]">3rd Sem</div>
          </div>
        </div>
      </div>

      {/* Critical Low-Attendance Warning Banner (< 75%) */}
      {hasAnyLowAttendance && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#CC0000]/35 bg-[#FFF5F5] p-4 text-[#111111]"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#CC0000]" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-[#CC0000]">
              Critical Attendance Alert (&lt; 75% Mandatory Threshold)
            </p>
            <p className="mt-0.5 text-[#333333]">
              {data.lowAttendanceAlerts.length > 0
                ? data.lowAttendanceAlerts
                    .map(
                      (a) =>
                        `${a.courseCode} ${a.courseTitle}: ${a.percentage}% (${a.presentSessions}/${a.totalSessions} sessions)`
                    )
                    .join(" • ")
                : `Overall attendance is ${attendancePct}% (${data.kpis.overallAttendance.presentSessions}/${data.kpis.overallAttendance.totalSessions} sessions).`}
            </p>
          </div>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <section
        aria-label="Key academic metrics"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {/* Active Credits / 24 */}
        <div className="relative overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FD] text-[#0055CC]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366] tabular-nums">
                {data.kpis.activeCredits} / {data.kpis.creditCap}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Active Credits
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-medium text-[#0055CC]">
            {data.kpis.creditCap - data.kpis.activeCredits > 0
              ? `${data.kpis.creditCap - data.kpis.activeCredits} credits available under CBCS cap`
              : "Semester 24-credit cap reached"}
          </div>
        </div>

        {/* Completed Credits */}
        <div className="relative overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#22AA22]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366] tabular-nums">
                {data.kpis.completedCredits}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Completed Credits
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-medium text-[#22AA22]">
            {data.kpis.completedCourseCount} course(s) completed
          </div>
        </div>

        {/* Overall Attendance % */}
        <div className="relative overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isOverallLowAttendance
                  ? "bg-[#FEF2F2] text-[#CC0000]"
                  : "bg-[#EAF2FD] text-[#0055CC]"
              }`}
            >
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  isOverallLowAttendance ? "text-[#CC0000]" : "text-[#003366]"
                }`}
              >
                {data.kpis.overallAttendance.totalSessions > 0
                  ? `${attendancePct}%`
                  : "N/A"}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Overall Attendance
              </div>
            </div>
          </div>
          <div
            className={`mt-3 text-[11px] font-semibold ${
              isOverallLowAttendance ? "text-[#CC0000]" : "text-[#22AA22]"
            }`}
          >
            {data.kpis.overallAttendance.totalSessions === 0
              ? "No sessions recorded yet"
              : isOverallLowAttendance
                ? "Below 75% mandatory threshold"
                : `${data.kpis.overallAttendance.presentSessions}/${data.kpis.overallAttendance.totalSessions} sessions present`}
          </div>
        </div>

        {/* Avg Internal Marks */}
        <div className="relative overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FD] text-[#0055CC]">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366] tabular-nums">
                {data.kpis.avgInternalMarks !== null
                  ? `${data.kpis.avgInternalMarks} / 30`
                  : "— / 30"}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Avg Internal Marks
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-medium text-[#555555]">
            Continuous assessment score
          </div>
        </div>
      </section>

      {/* Main Middle Section: Course Catalog & Prerequisite Engine + Progress/Capacity */}
      {(activeNav === "dashboard" ||
        activeNav === "catalog" ||
        activeNav === "enroll" ||
        activeNav === "courses") && (
        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          {/* Course Catalog & Prerequisite Engine Table */}
          <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs xl:col-span-8">
            <div className="flex flex-col justify-between gap-3 border-b border-[#F0F0F0] pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 text-[#0055CC]" />
                <div>
                  <h2 className="text-base font-bold text-[#003366]">
                    Course Catalog & Prerequisite Engine
                  </h2>
                  <p className="text-xs text-[#555555]">
                    Live seat counts, prerequisite validation, and 24-credit cap
                    enforcement
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: "ALL", label: "All" },
                    { id: "ENROLLED", label: "My Courses" },
                    { id: "OPEN", label: "Eligible" },
                    { id: "LOCKED", label: "Prereq Locked" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCatalogFilter(tab.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      catalogFilter === tab.id
                        ? "bg-[#0055CC] text-white"
                        : "bg-[#F1F5F9] text-[#333333] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                <label htmlFor="student-sem-filter" className="sr-only">
                  Filter by semester
                </label>
                <select
                  id="student-sem-filter"
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#333333] focus:border-[#0055CC] focus:outline-none"
                >
                  <option value="ALL">All Semesters</option>
                  {semesters.map((s) => (
                    <option key={s} value={String(s)}>
                      Sem {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inline Server Validation Alert */}
            {validationAlert && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                  validationAlert.type === "error"
                    ? "border-[#CC0000]/35 bg-[#FFF5F5] text-[#990000]"
                    : "border-[#22AA22]/35 bg-[#F0FDF4] text-[#14532D]"
                }`}
              >
                {validationAlert.type === "error" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#CC0000]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22AA22]" />
                )}
                <span className="font-medium leading-relaxed">
                  {validationAlert.message}
                </span>
              </div>
            )}

            <div
              tabIndex={0}
              role="region"
              aria-label="Course Catalog Table"
              className="unitrack-table-wrapper unitrack-responsive-table mt-4"
            >
              <table className="w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                    <th className="rounded-l-lg px-3 py-2.5">Course Code</th>
                    <th className="px-3 py-2.5">Title & Faculty</th>
                    <th className="px-3 py-2.5 text-center">Credits</th>
                    <th className="px-3 py-2.5">Prerequisite</th>
                    <th className="px-3 py-2.5 text-center">Seats</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="rounded-r-lg px-3 py-2.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-xs text-[#666666]"
                      >
                        No courses match the active search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((course) => {
                      const isFull = course.activeSeats >= course.maxSeats;
                      const isNearFull =
                        !isFull &&
                        course.maxSeats - course.activeSeats <= 1 &&
                        course.maxSeats <= 5;
                      const isEnrolled = course.studentStatus === "ENROLLED";
                      const isCompleted = course.studentStatus === "COMPLETED";
                      const isBusy = busyCourseId === course.id;

                      return (
                        <tr
                          key={course.id}
                          className="transition-colors hover:bg-[#F9FBFE]"
                        >
                          <th
                            scope="row"
                            className="whitespace-nowrap px-3 py-3 text-xs font-bold text-[#003366]"
                          >
                            {course.code}
                            <div className="text-[10px] font-medium text-[#666666]">
                              Sem {course.semester}
                            </div>
                          </th>

                          <td data-label="Course" className="px-3 py-3">
                            <div className="font-semibold text-[#111111]">
                              {course.title}
                            </div>
                            <div className="text-[11px] text-[#555555]">
                              {course.faculty.name}
                            </div>
                          </td>

                          <td
                            data-label="Credits"
                            className="px-3 py-3 text-center text-xs font-semibold text-[#333333] tabular-nums"
                          >
                            {course.credits}
                          </td>

                          <td data-label="Prerequisite" className="px-3 py-3">
                            {course.prerequisite ? (
                              <span
                                title={
                                  course.prerequisiteMet
                                    ? `Prerequisite ${course.prerequisite.code} satisfied`
                                    : `Must complete ${course.prerequisite.code} (${course.prerequisite.title}) first`
                                }
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                  course.prerequisiteMet
                                    ? "bg-[#22AA22]/12 text-[#177A17]"
                                    : "bg-[#FFB800]/20 text-[#9A6700]"
                                }`}
                              >
                                {course.prerequisiteMet ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {course.prerequisite.code}
                              </span>
                            ) : (
                              <span className="text-xs text-[#666666]">—</span>
                            )}
                          </td>

                          <td
                            data-label="Seats"
                            className="px-3 py-3 text-center text-xs font-semibold tabular-nums"
                          >
                            <span
                              className={
                                isFull
                                  ? "text-[#CC0000]"
                                  : isNearFull
                                    ? "text-[#B27B00]"
                                    : "text-[#333333]"
                              }
                            >
                              {course.activeSeats} / {course.maxSeats}
                            </span>
                          </td>

                          <td data-label="Status" className="px-3 py-3 text-center">
                            {isEnrolled ? (
                              <span className="inline-flex rounded-full bg-[#0055CC]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#0055CC]">
                                Enrolled
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex rounded-full bg-[#22AA22]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#177A17]">
                                Completed
                              </span>
                            ) : isFull ? (
                              <span className="inline-flex rounded-full bg-[#CC0000]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#CC0000]">
                                Full
                              </span>
                            ) : !course.prerequisiteMet ? (
                              <span className="inline-flex rounded-full bg-[#FFB800]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#9A6700]">
                                Prereq Pending
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-[#22AA22]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#177A17]">
                                Open
                              </span>
                            )}
                          </td>

                          <td
                            data-label="Action"
                            className="px-3 py-3 text-right"
                          >
                            {isEnrolled ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleDrop(course.id, course.code)
                                }
                                className="inline-flex items-center rounded-lg border border-[#CC0000]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#CC0000] transition-colors hover:bg-[#FFF5F5] disabled:opacity-50"
                              >
                                {isBusy ? "Dropping..." : "Drop"}
                              </button>
                            ) : isCompleted ? (
                              <span className="text-xs font-medium text-[#22AA22]">
                                Credit Earned
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                title={
                                  course.blockReason ??
                                  `Enroll in ${course.code} (${course.credits} credits)`
                                }
                                onClick={() => handleEnroll(course)}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  course.blockReason
                                    ? "border border-[#FFB800]/60 bg-[#FFFBEB] text-[#9A6700] hover:bg-[#FEF3C7]"
                                    : "bg-[#0055CC] text-white hover:bg-[#003366]"
                                }`}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>{isBusy ? "Checking..." : "Enroll"}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Column: My Progress + Enrollment Capacity vs Batch Limit */}
          <div className="space-y-6 xl:col-span-4">
            <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#0055CC]" />
                  <h2 className="text-base font-bold text-[#003366]">
                    My Progress
                  </h2>
                </div>
                <span className="text-xs font-semibold text-[#0055CC]">
                  CBCS Cap: {data.kpis.creditCap} Cr
                </span>
              </div>

              <div className="mt-5 flex items-center gap-5">
                <CircularProgressRing
                  percentage={creditPercent}
                  label={`${creditPercent}%`}
                  sublabel="Credit Cap"
                  color={
                    data.kpis.activeCredits >= data.kpis.creditCap
                      ? "#FFB800"
                      : "#0055CC"
                  }
                />
                <div className="flex-1 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#555555]">Completed Courses</span>
                    <span className="font-bold text-[#003366]">
                      {data.kpis.completedCourseCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555555]">Active Courses</span>
                    <span className="font-bold text-[#003366]">
                      {data.kpis.activeCourseCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555555]">Total Active Credits</span>
                    <span className="font-bold text-[#003366]">
                      {data.kpis.activeCredits} / {data.kpis.creditCap}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium ${
                  data.kpis.activeCredits >= data.kpis.creditCap
                    ? "border-[#FFB800]/40 bg-[#FFFBEB] text-[#9A6700]"
                    : "border-[#E5E9F0] bg-[#F8FAFC] text-[#333333]"
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#CC0000]" />
                <span>
                  {data.kpis.activeCredits >= data.kpis.creditCap
                    ? "Maximum 24-credit semester limit reached. Drop a course before adding another."
                    : "You are on track! Keep completing prerequisites to unlock higher courses."}
                </span>
              </div>
            </section>

            <CapacityBarChart
              items={data.catalogCourses.map((c) => ({
                code: c.code,
                title: c.title,
                activeSeats: c.activeSeats,
                maxSeats: c.maxSeats,
              }))}
            />
          </div>
        </div>
      )}

      {/* Personal Attendance & Internal Marks Table */}
      {(activeNav === "dashboard" ||
        activeNav === "attendance" ||
        activeNav === "marks" ||
        activeNav === "courses") && (
        <section className="mt-6 rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#0055CC]" />
              <div>
                <h2 className="text-base font-bold text-[#003366]">
                  My Attendance & Internal Marks Record
                </h2>
                <p className="text-xs text-[#555555]">
                  Courses below 75% attendance are automatically flagged in red
                </p>
              </div>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Personal attendance and marks table"
            className="unitrack-table-wrapper unitrack-responsive-table"
          >
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                  <th className="rounded-l-lg px-3 py-2.5">Course</th>
                  <th className="px-3 py-2.5">Faculty</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Sessions</th>
                  <th className="px-3 py-2.5 text-center">Attendance %</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">
                    Internal Marks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {data.enrollments.map((enr) => {
                  const att = enr.attendanceStats;
                  return (
                    <tr key={enr.id} className="hover:bg-[#F9FBFE]">
                      <th
                        scope="row"
                        className="px-3 py-3 text-xs font-bold text-[#003366]"
                      >
                        {enr.course.code} —{" "}
                        <span className="font-semibold text-[#111111]">
                          {enr.course.title}
                        </span>
                      </th>
                      <td data-label="Faculty" className="px-3 py-3 text-xs text-[#444444]">
                        {enr.course.facultyName}
                      </td>
                      <td data-label="Status" className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            enr.status === "COMPLETED"
                              ? "bg-[#22AA22]/15 text-[#177A17]"
                              : "bg-[#0055CC]/12 text-[#0055CC]"
                          }`}
                        >
                          {enr.status}
                        </span>
                      </td>
                      <td
                        data-label="Sessions"
                        className="px-3 py-3 text-center text-xs font-medium text-[#333333] tabular-nums"
                      >
                        {att.totalSessions > 0
                          ? `${att.presentSessions} / ${att.totalSessions}`
                          : "No sessions"}
                      </td>
                      <td data-label="Attendance" className="px-3 py-3 text-center">
                        {att.totalSessions === 0 ? (
                          <span className="text-xs text-[#666666]">N/A</span>
                        ) : att.isLowAttendance ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#CC0000]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#CC0000]">
                            <AlertTriangle className="h-3 w-3" />
                            {att.percentage}% (&lt;75% Alert)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#22AA22]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#177A17]">
                            <CheckCircle2 className="h-3 w-3" />
                            {att.percentage}% On Track
                          </span>
                        )}
                      </td>
                      <td
                        data-label="Internal Marks"
                        className="px-3 py-3 text-right text-xs font-bold text-[#003366] tabular-nums"
                      >
                        {enr.internalMarks !== null
                          ? `${enr.internalMarks} / 30`
                          : "Pending"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bottom 3-Card Row (Attendance Overview + Recent Activity + Academic Crest Card) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs lg:col-span-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#0055CC]" />
            <h2 className="text-base font-bold text-[#003366]">
              Attendance Overview
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <CircularProgressRing
              percentage={
                data.kpis.overallAttendance.totalSessions > 0
                  ? attendancePct
                  : 100
              }
              label={
                data.kpis.overallAttendance.totalSessions > 0
                  ? `${attendancePct}%`
                  : "—"
              }
              color={isOverallLowAttendance ? "#CC0000" : "#0055CC"}
              size={108}
            />
            <div>
              <div className="text-xs font-medium text-[#555555]">
                Present Sessions
              </div>
              <div className="mt-0.5 text-xl font-bold text-[#003366] tabular-nums">
                {data.kpis.overallAttendance.presentSessions} /{" "}
                {data.kpis.overallAttendance.totalSessions}
              </div>
              <div className="mt-2">
                {isOverallLowAttendance ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#CC0000]/12 px-2.5 py-1 text-xs font-bold text-[#CC0000]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Below 75% Alert
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2FD] px-2.5 py-1 text-xs font-semibold text-[#0055CC]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    On Track
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs lg:col-span-5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#0055CC]" />
            <h2 className="text-base font-bold text-[#003366]">
              Recent Activity
            </h2>
          </div>
          <ul className="mt-4 space-y-3 border-l-2 border-[#E5E9F0] pl-4">
            {data.recentActivity.length === 0 ? (
              <li className="text-xs text-[#666666]">
                No recent enrollment or attendance events yet.
              </li>
            ) : (
              data.recentActivity.map((act) => (
                <li
                  key={act.id}
                  className="relative flex items-start justify-between gap-3 text-xs"
                >
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#0055CC] ring-4 ring-white" />
                  <span className="font-medium text-[#111111]">{act.title}</span>
                  <span className="shrink-0 text-[11px] text-[#666666]">
                    {act.timestamp.slice(0, 10)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#003366] to-[#0055CC] p-6 text-center text-white shadow-xs lg:col-span-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-4 text-lg font-bold leading-snug">
            Aim Higher.
            <br />
            Achieve More.
          </h2>
          <p className="mt-2 text-xs text-blue-100/90">
            CBCS Cap: 24 Credits • Minimum 75% Attendance
          </p>
        </section>
      </div>
    </AppShell>
  );
}
