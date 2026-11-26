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
  { id: "dashboard", label: "Overview", icon: "dashboard" },
  { id: "attendance", label: "Attendance", icon: "attendance" },
  { id: "marks", label: "Internal Marks", icon: "marks" },
  { id: "activity", label: "Activity", icon: "courses" },
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
        const msg = payload.error ?? `Unable to enroll in ${course.code}.`;
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
      onSelectNav={setActiveNav}
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
            Manage your CBCS enrollments, track prerequisites, and monitor
            attendance.
          </p>
        </div>

        <div className="flex items-center gap-3.5 self-start rounded-2xl border border-[#E8EDF5] bg-white px-4 py-2.5 shadow-xs sm:self-auto">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#003366]">
              {data.student.enrollmentNo ?? "BCA2026"}
            </div>
            <div className="text-[11px] font-medium text-[#555555]">
              BCA • 3rd Sem
            </div>
          </div>
        </div>
      </div>

      {/* Critical Low-Attendance Warning Banner (< 75%) */}
      {hasAnyLowAttendance && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#CC0000]/35 bg-[#FFF5F5] p-3.5 text-xs"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#CC0000]" />
          <div>
            <p className="font-bold text-[#CC0000]">
              Attendance Alert (&lt; 75% Mandatory Threshold)
            </p>
            <p className="mt-0.5 text-[#333333]">
              {data.lowAttendanceAlerts.length > 0
                ? data.lowAttendanceAlerts
                    .map(
                      (a) =>
                        `${a.courseCode} ${a.courseTitle}: ${a.percentage}% (${a.presentSessions}/${a.totalSessions})`
                    )
                    .join(" • ")
                : `Overall attendance is ${attendancePct}% (${data.kpis.overallAttendance.presentSessions}/${data.kpis.overallAttendance.totalSessions}).`}
            </p>
          </div>
        </div>
      )}

      {/* 4 Compact KPI Cards */}
      <section
        aria-label="Key academic metrics"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#003366] tabular-nums">
                {data.kpis.activeCredits} / {data.kpis.creditCap}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Active Credits
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#22AA22]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#003366] tabular-nums">
                {data.kpis.completedCredits}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Completed Credits ({data.kpis.completedCourseCount})
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isOverallLowAttendance
                  ? "bg-[#FEF2F2] text-[#CC0000]"
                  : "bg-[#EAF2FD] text-[#0055CC]"
              }`}
            >
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div
                className={`text-xl font-bold tabular-nums ${
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
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#003366] tabular-nums">
                {data.kpis.avgInternalMarks !== null
                  ? `${data.kpis.avgInternalMarks} / 30`
                  : "— / 30"}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Avg Internal Marks
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TAB 1: Overview (Catalog + Progress + Capacity) */}
      {activeNav === "dashboard" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs xl:col-span-8">
            <div className="flex flex-col justify-between gap-3 border-b border-[#F0F0F0] pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-[#003366]">
                  Course Catalog &amp; Prerequisite Engine
                </h2>
                <p className="text-xs text-[#555555]">
                  Live seats, prerequisite checks, and 24-credit cap validation
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: "All" },
                    { id: "ENROLLED", label: "Enrolled" },
                    { id: "OPEN", label: "Eligible" },
                    { id: "LOCKED", label: "Locked" },
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
                  className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#333333] focus:border-[#0055CC] focus:outline-none"
                >
                  <option value="ALL">All Sems</option>
                  {semesters.map((s) => (
                    <option key={s} value={String(s)}>
                      Sem {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {validationAlert && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
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
                    <th className="rounded-l-lg px-2.5 py-2.5">Course</th>
                    <th className="px-2.5 py-2.5 text-center">Cr</th>
                    <th className="px-2.5 py-2.5">Prereq</th>
                    <th className="px-2.5 py-2.5 text-center">Seats &amp; Status</th>
                    <th className="rounded-r-lg px-2.5 py-2.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-xs text-[#666666]"
                      >
                        No courses match your active filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((course) => {
                      const isFull = course.activeSeats >= course.maxSeats;
                      const isEnrolled = course.studentStatus === "ENROLLED";
                      const isCompleted = course.studentStatus === "COMPLETED";
                      const isBusy = busyCourseId === course.id;

                      return (
                        <tr key={course.id} className="hover:bg-[#F9FBFE]">
                          <th scope="row" className="px-2.5 py-3 align-top">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#003366]">
                              <span>{course.code}</span>
                              <span className="text-[10px] font-medium text-[#666666]">
                                • Sem {course.semester}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-[#111111]">
                              {course.title}
                            </div>
                            <div className="text-[11px] font-normal text-[#666666]">
                              {course.faculty.name}
                            </div>
                          </th>

                          <td
                            data-label="Credits"
                            className="px-2.5 py-3 text-center text-xs font-semibold text-[#333333] tabular-nums"
                          >
                            {course.credits}
                          </td>

                          <td data-label="Prerequisite" className="px-2.5 py-3">
                            {course.prerequisite ? (
                              <span
                                title={
                                  course.prerequisiteMet
                                    ? `Prerequisite ${course.prerequisite.code} satisfied`
                                    : `Requires ${course.prerequisite.code} (${course.prerequisite.title})`
                                }
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
                              <span className="text-xs text-[#777777]">—</span>
                            )}
                          </td>

                          <td
                            data-label="Seats & Status"
                            className="px-2.5 py-3 text-center"
                          >
                            <div className="text-[11px] font-bold text-[#333333] tabular-nums">
                              {course.activeSeats}/{course.maxSeats}
                            </div>
                            <div className="mt-1">
                              {isEnrolled ? (
                                <span className="inline-flex rounded-full bg-[#0055CC]/12 px-2 py-0.5 text-[10px] font-semibold text-[#0055CC]">
                                  Enrolled
                                </span>
                              ) : isCompleted ? (
                                <span className="inline-flex rounded-full bg-[#22AA22]/15 px-2 py-0.5 text-[10px] font-semibold text-[#177A17]">
                                  Completed
                                </span>
                              ) : isFull ? (
                                <span className="inline-flex rounded-full bg-[#CC0000]/12 px-2 py-0.5 text-[10px] font-semibold text-[#CC0000]">
                                  Full
                                </span>
                              ) : !course.prerequisiteMet ? (
                                <span className="inline-flex rounded-full bg-[#FFB800]/20 px-2 py-0.5 text-[10px] font-semibold text-[#9A6700]">
                                  Locked
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-[#22AA22]/12 px-2 py-0.5 text-[10px] font-semibold text-[#177A17]">
                                  Open
                                </span>
                              )}
                            </div>
                          </td>

                          <td data-label="Action" className="px-2.5 py-3 text-right">
                            {isEnrolled ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDrop(course.id, course.code)}
                                className="rounded-lg border border-[#CC0000]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#CC0000] hover:bg-[#FFF5F5] disabled:opacity-50"
                              >
                                {isBusy ? "..." : "Drop"}
                              </button>
                            ) : isCompleted ? (
                              <span className="text-[11px] font-medium text-[#22AA22]">
                                Earned
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                title={course.blockReason ?? `Enroll in ${course.code}`}
                                onClick={() => handleEnroll(course)}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  course.blockReason
                                    ? "border border-[#FFB800]/60 bg-[#FFFBEB] text-[#9A6700] hover:bg-[#FEF3C7]"
                                    : "bg-[#0055CC] text-white hover:bg-[#003366]"
                                }`}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>{isBusy ? "..." : "Enroll"}</span>
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
                  Cap: {data.kpis.creditCap} Cr
                </span>
              </div>

              <div className="mt-4 flex items-center gap-5">
                <CircularProgressRing
                  percentage={creditPercent}
                  label={`${creditPercent}%`}
                  sublabel="Credit Cap"
                  color={
                    data.kpis.activeCredits >= data.kpis.creditCap
                      ? "#FFB800"
                      : "#0055CC"
                  }
                  size={112}
                />
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#555555]">Completed</span>
                    <span className="font-bold text-[#003366]">
                      {data.kpis.completedCourseCount} course(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555555]">Active</span>
                    <span className="font-bold text-[#003366]">
                      {data.kpis.activeCourseCount} course(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555555]">Credits</span>
                    <span className="font-bold text-[#003366]">
                      {data.kpis.activeCredits} / {data.kpis.creditCap}
                    </span>
                  </div>
                </div>
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

      {/* TAB 2 & 3: Focused Attendance / Marks View */}
      {(activeNav === "attendance" || activeNav === "marks") && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {activeNav === "attendance" && (
            <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs lg:col-span-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#0055CC]" />
                <h2 className="text-base font-bold text-[#003366]">
                  Attendance Summary
                </h2>
              </div>
              <div className="mt-5 flex items-center gap-5">
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
                  <div className="text-xs text-[#555555]">Present Sessions</div>
                  <div className="mt-0.5 text-xl font-bold text-[#003366] tabular-nums">
                    {data.kpis.overallAttendance.presentSessions} /{" "}
                    {data.kpis.overallAttendance.totalSessions}
                  </div>
                  <div className="mt-2">
                    {isOverallLowAttendance ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#CC0000]/12 px-2.5 py-1 text-xs font-bold text-[#CC0000]">
                        Below 75% Alert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#22AA22]/12 px-2.5 py-1 text-xs font-semibold text-[#177A17]">
                        On Track (&gt;=75%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section
            className={`rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs ${
              activeNav === "attendance" ? "lg:col-span-8" : "lg:col-span-12"
            }`}
          >
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-[#0055CC]" />
              <div>
                <h2 className="text-base font-bold text-[#003366]">
                  {activeNav === "attendance"
                    ? "Course-by-Course Attendance"
                    : "Internal Marks Gradebook (Out of 30)"}
                </h2>
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Attendance and marks breakdown"
              className="unitrack-table-wrapper unitrack-responsive-table"
            >
              <table className="w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                    <th className="rounded-l-lg px-3 py-2.5">Course</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-center">Sessions</th>
                    <th className="px-3 py-2.5 text-center">Attendance</th>
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
                          className="px-3 py-3 text-center text-xs text-[#333333] tabular-nums"
                        >
                          {att.totalSessions > 0
                            ? `${att.presentSessions} / ${att.totalSessions}`
                            : "—"}
                        </td>
                        <td data-label="Attendance" className="px-3 py-3 text-center">
                          {att.totalSessions === 0 ? (
                            <span className="text-xs text-[#666666]">N/A</span>
                          ) : att.isLowAttendance ? (
                            <span className="inline-flex rounded-full bg-[#CC0000]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#CC0000]">
                              {att.percentage}% (&lt;75% Alert)
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#22AA22]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#177A17]">
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
        </div>
      )}

      {/* TAB 4: Focused Recent Activity */}
      {activeNav === "activity" && (
        <section className="mt-6 rounded-2xl border border-[#F0F0F0] bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#0055CC]" />
            <h2 className="text-base font-bold text-[#003366]">
              Recent Academic Activity
            </h2>
          </div>
          <ul className="mt-5 space-y-3.5 border-l-2 border-[#E5E9F0] pl-4">
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
      )}
    </AppShell>
  );
}
