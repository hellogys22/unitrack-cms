"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Save,
  Users,
} from "lucide-react";
import {
  AppShell,
  type DemoUserOption,
  type NavItem,
} from "@/components/AppShell";
import { CapacityBarChart } from "@/components/CapacityBarChart";
import { useToast } from "@/components/ToastProvider";
import type { AttendanceStats } from "@/lib/cbcs";

export interface FacultyCourseStudent {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  enrollmentNo: string | null;
  status: "ENROLLED" | "COMPLETED" | "DROPPED";
  internalMarks: number | null;
  attendanceStats: AttendanceStats;
  attendanceByDate: Record<string, "PRESENT" | "ABSENT">;
}

export interface FacultyCourseItem {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  semester: number;
  maxSeats: number;
  activeSeats: number;
  faculty: { id: string; name: string; email: string };
  prerequisite: { id: string; code: string; title: string } | null;
  sessionDates: string[];
  lowAttendanceCount: number;
  students: FacultyCourseStudent[];
}

const FACULTY_NAV: NavItem[] = [
  { id: "attendance", label: "Attendance", icon: "attendance" },
  { id: "marks", label: "Internal Marks", icon: "marks" },
  { id: "alerts", label: "Alerts & Capacity", icon: "analytics" },
];

export function FacultyDashboardClient({
  currentUser,
  demoUsers,
  initialCourses,
  defaultDate,
}: {
  currentUser: DemoUserOption;
  demoUsers: DemoUserOption[];
  initialCourses: FacultyCourseItem[];
  defaultDate: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<FacultyCourseItem[]>(initialCourses);
  const [activeNav, setActiveNav] = useState<string>("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourses.find((c) => c.students.length > 0)?.id ??
      initialCourses[0]?.id ??
      ""
  );
  const [sessionDate, setSessionDate] = useState<string>(defaultDate);
  const [attendanceDraft, setAttendanceDraft] = useState<
    Record<string, boolean>
  >({});
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingMarksId, setSavingMarksId] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.students.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [courses, searchQuery]);

  const selectedCourse = useMemo(
    () =>
      courses.find((c) => c.id === selectedCourseId) ??
      filteredCourses[0] ??
      null,
    [courses, filteredCourses, selectedCourseId]
  );

  const activeStudents = useMemo(
    () =>
      selectedCourse
        ? selectedCourse.students.filter((s) => s.status === "ENROLLED")
        : [],
    [selectedCourse]
  );

  function getCheckedForStudent(student: FacultyCourseStudent): boolean {
    const key = `${student.enrollmentId}:${sessionDate}`;
    if (key in attendanceDraft) return attendanceDraft[key];
    const recorded = student.attendanceByDate[sessionDate];
    return recorded ? recorded === "PRESENT" : true;
  }

  function toggleStudentAttendance(enrollmentId: string, checked: boolean) {
    setAttendanceDraft((prev) => ({
      ...prev,
      [`${enrollmentId}:${sessionDate}`]: checked,
    }));
  }

  function markAllPresent(value: boolean) {
    const updates: Record<string, boolean> = {};
    for (const st of activeStudents) {
      updates[`${st.enrollmentId}:${sessionDate}`] = value;
    }
    setAttendanceDraft((prev) => ({ ...prev, ...updates }));
  }

  async function refreshCourses() {
    const res = await fetch("/api/faculty/courses", { cache: "no-store" });
    if (res.ok) {
      const payload = await res.json();
      setCourses(payload.courses ?? []);
    }
    router.refresh();
  }

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse || activeStudents.length === 0) return;

    setSavingAttendance(true);
    try {
      const records = activeStudents.map((st) => ({
        enrollmentId: st.enrollmentId,
        status: getCheckedForStudent(st)
          ? ("PRESENT" as const)
          : ("ABSENT" as const),
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          date: sessionDate,
          records,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        showToast({
          variant: "error",
          title: "Attendance Save Failed",
          description: payload.error ?? "Unable to save attendance session.",
        });
        return;
      }

      showToast({
        variant: "success",
        title: `Session Saved — ${selectedCourse.code}`,
        description: payload.message,
      });
      await refreshCourses();
    } catch {
      showToast({
        variant: "error",
        title: "Network Error",
        description: "Could not save session attendance.",
      });
    } finally {
      setSavingAttendance(false);
    }
  }

  async function handleSaveMarks(
    student: FacultyCourseStudent,
    overrideStatus?: "ENROLLED" | "COMPLETED"
  ) {
    const rawVal =
      marksDraft[student.enrollmentId] ??
      (student.internalMarks !== null ? String(student.internalMarks) : "");
    const parsedMarks = rawVal.trim() === "" ? null : Number(rawVal);

    if (
      parsedMarks !== null &&
      (!Number.isInteger(parsedMarks) || parsedMarks < 0 || parsedMarks > 30)
    ) {
      showToast({
        variant: "error",
        title: "Invalid Internal Marks",
        description: "Marks must be a whole number between 0 and 30.",
      });
      return;
    }

    setSavingMarksId(student.enrollmentId);
    try {
      const res = await fetch(`/api/enrollments/${student.enrollmentId}/marks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalMarks: parsedMarks,
          ...(overrideStatus ? { status: overrideStatus } : {}),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        showToast({
          variant: "error",
          title: "Update Failed",
          description: payload.error ?? "Could not update marks.",
        });
        return;
      }

      showToast({
        variant: "success",
        title: `Updated ${student.name}`,
        description: overrideStatus
          ? `Course status set to ${overrideStatus}.`
          : `Internal marks saved (${parsedMarks ?? "Cleared"}/30).`,
      });
      await refreshCourses();
    } catch {
      showToast({
        variant: "error",
        title: "Network Error",
        description: "Could not save student marks.",
      });
    } finally {
      setSavingMarksId(null);
    }
  }

  const kpis = useMemo(() => {
    const totalCourses = courses.length;
    const totalActiveEnrollments = courses.reduce(
      (sum, c) => sum + c.activeSeats,
      0
    );
    const totalLowAlerts = courses.reduce(
      (sum, c) => sum + c.lowAttendanceCount,
      0
    );
    const allStats = courses
      .flatMap((c) => c.students)
      .filter((s) => s.status === "ENROLLED" && s.attendanceStats.totalSessions > 0);
    const avgPct =
      allStats.length > 0
        ? Math.round(
            allStats.reduce(
              (sum, s) => sum + (s.attendanceStats.exactPercentage ?? 0),
              0
            ) / allStats.length
          )
        : null;

    return { totalCourses, totalActiveEnrollments, totalLowAlerts, avgPct };
  }, [courses]);

  const lowAttendanceRoster = useMemo(
    () =>
      courses.flatMap((c) =>
        c.students
          .filter(
            (s) => s.status === "ENROLLED" && s.attendanceStats.isLowAttendance
          )
          .map((s) => ({ courseCode: c.code, courseTitle: c.title, ...s }))
      ),
    [courses]
  );

  return (
    <AppShell
      currentUser={currentUser}
      demoUsers={demoUsers}
      navItems={FACULTY_NAV}
      activeNav={activeNav}
      onSelectNav={setActiveNav}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search assigned courses or students..."
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#003366]">
          Welcome back, {currentUser.name}!
        </h1>
        <p className="mt-1 text-sm text-[#444444]">
          Record session attendance and enter 0–30 internal assessment marks.
        </p>
      </div>

      {/* Compact KPI Row */}
      <section
        aria-label="Faculty KPI summary"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#003366] tabular-nums">
                {kpis.totalCourses}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Assigned Courses
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#003366] tabular-nums">
                {kpis.totalActiveEnrollments}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Active Enrollments
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                kpis.totalLowAlerts > 0
                  ? "bg-[#FEF2F2] text-[#CC0000]"
                  : "bg-[#ECFDF3] text-[#22AA22]"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div
                className={`text-xl font-bold tabular-nums ${
                  kpis.totalLowAlerts > 0 ? "text-[#CC0000]" : "text-[#003366]"
                }`}
              >
                {kpis.totalLowAlerts}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                &lt; 75% Alerts
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#22AA22]">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#003366] tabular-nums">
                {kpis.avgPct !== null ? `${kpis.avgPct}%` : "N/A"}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Avg Class Attendance
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Selector Pills */}
      {activeNav !== "alerts" && (
        <div className="mt-5 rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-xs">
          <div className="flex flex-wrap gap-2">
            {filteredCourses.map((course) => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-[#0055CC] bg-[#0055CC] text-white"
                      : "border-[#E5E9F0] bg-[#F8FAFC] text-[#003366] hover:border-[#0055CC]/50"
                  }`}
                >
                  <span>{course.code}</span>
                  <span
                    className={`font-normal ${
                      isSelected ? "text-blue-100" : "text-[#555555]"
                    }`}
                  >
                    {course.title}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[#EAF2FD] text-[#0055CC]"
                    }`}
                  >
                    {course.activeSeats}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: Attendance Roster */}
      {selectedCourse && activeNav === "attendance" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs xl:col-span-8">
            <form onSubmit={handleSaveAttendance}>
              <div className="flex flex-col justify-between gap-4 border-b border-[#F0F0F0] pb-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-base font-bold text-[#003366]">
                    Session Attendance — {selectedCourse.code} (
                    {selectedCourse.title})
                  </h2>
                  <p className="mt-0.5 text-xs text-[#555555]">
                    Students below 75% are automatically flagged in red.
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label
                      htmlFor="session-date-input"
                      className="block text-[11px] font-semibold text-[#333333]"
                    >
                      Date
                    </label>
                    <input
                      id="session-date-input"
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="mt-1 h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs font-medium text-[#111111] focus:border-[#0055CC] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => markAllPresent(true)}
                    className="h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#003366] hover:bg-[#EAF2FD]"
                  >
                    All Present
                  </button>

                  <button
                    type="submit"
                    disabled={savingAttendance || activeStudents.length === 0}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0055CC] px-4 text-xs font-semibold text-white hover:bg-[#003366] disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingAttendance ? "Saving..." : "Save Session"}</span>
                  </button>
                </div>
              </div>

              {selectedCourse.sessionDates.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-medium text-[#555555]">Dates:</span>
                  {selectedCourse.sessionDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSessionDate(d)}
                      className={`rounded-full px-2.5 py-0.5 font-medium ${
                        sessionDate === d
                          ? "bg-[#003366] text-white"
                          : "bg-[#F1F5F9] text-[#333333] hover:bg-[#E2E8F0]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              <div
                tabIndex={0}
                role="region"
                aria-label="Session attendance student roster"
                className="unitrack-table-wrapper unitrack-responsive-table mt-4"
              >
                <table className="w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                      <th className="rounded-l-lg px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5 text-center">
                        Session ({sessionDate})
                      </th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">
                        Cumulative %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {activeStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-xs text-[#666666]"
                        >
                          No students currently enrolled in {selectedCourse.code}.
                        </td>
                      </tr>
                    ) : (
                      activeStudents.map((st) => {
                        const isPresent = getCheckedForStudent(st);
                        const att = st.attendanceStats;
                        const checkboxId = `att-${st.enrollmentId}`;
                        return (
                          <tr key={st.enrollmentId} className="hover:bg-[#F9FBFE]">
                            <th scope="row" className="px-3 py-3">
                              <div className="text-xs font-bold text-[#111111]">
                                {st.name}
                              </div>
                              <div className="text-[11px] font-normal text-[#666666]">
                                {st.enrollmentNo ?? st.email}
                              </div>
                            </th>
                            <td data-label="Present" className="px-3 py-3 text-center">
                              <label
                                htmlFor={checkboxId}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold hover:border-[#0055CC]"
                              >
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  checked={isPresent}
                                  onChange={(e) =>
                                    toggleStudentAttendance(
                                      st.enrollmentId,
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 accent-[#0055CC]"
                                />
                                <span
                                  className={
                                    isPresent
                                      ? "text-[#22AA22]"
                                      : "text-[#CC0000]"
                                  }
                                >
                                  {isPresent ? "Present" : "Absent"}
                                </span>
                              </label>
                            </td>
                            <td
                              data-label="Attendance"
                              className="px-3 py-3 text-right text-xs"
                            >
                              {att.totalSessions === 0 ? (
                                <span className="text-[#666666]">0 sessions</span>
                              ) : att.isLowAttendance ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#CC0000]/12 px-2.5 py-0.5 font-bold text-[#CC0000]">
                                  <AlertCircle className="h-3 w-3" />
                                  {att.percentage}% ({att.presentSessions}/
                                  {att.totalSessions}) &lt;75%
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#22AA22]/12 px-2.5 py-0.5 font-semibold text-[#177A17]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {att.percentage}% ({att.presentSessions}/
                                  {att.totalSessions})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </form>
          </section>

          <div className="space-y-6 xl:col-span-4">
            <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-[#003366]">
                Low Attendance Alerts (&lt; 75%)
              </h2>
              {lowAttendanceRoster.length === 0 ? (
                <p className="mt-3 text-xs text-[#22AA22]">
                  All students meet the 75% attendance requirement.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {lowAttendanceRoster.map((item) => (
                    <li
                      key={item.enrollmentId}
                      className="rounded-xl border border-[#CC0000]/25 bg-[#FFF5F5] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-[#CC0000]">
                        <span>{item.name}</span>
                        <span>{item.attendanceStats.percentage}%</span>
                      </div>
                      <div className="mt-0.5 text-[#333333]">
                        {item.courseCode} •{" "}
                        {item.attendanceStats.presentSessions}/
                        {item.attendanceStats.totalSessions} sessions
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: Internal Marks (0-30) */}
      {selectedCourse && activeNav === "marks" && (
        <section className="mt-6 rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-[#0055CC]" />
            <div>
              <h2 className="text-base font-bold text-[#003366]">
                Internal Marks (0–30) — {selectedCourse.code}
              </h2>
              <p className="text-xs text-[#555555]">
                Update internal scores or mark course completion to unlock
                prerequisites.
              </p>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Internal marks gradebook"
            className="unitrack-table-wrapper unitrack-responsive-table"
          >
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                  <th className="rounded-l-lg px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Marks (0–30)</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {selectedCourse.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-xs text-[#666666]"
                    >
                      No student enrollments recorded for {selectedCourse.code}.
                    </td>
                  </tr>
                ) : (
                  selectedCourse.students.map((st) => {
                    const inputVal =
                      marksDraft[st.enrollmentId] ??
                      (st.internalMarks !== null
                        ? String(st.internalMarks)
                        : "");
                    const isSaving = savingMarksId === st.enrollmentId;
                    const marksId = `marks-${st.enrollmentId}`;

                    return (
                      <tr key={st.enrollmentId} className="hover:bg-[#F9FBFE]">
                        <th scope="row" className="px-3 py-3">
                          <div className="text-xs font-bold text-[#111111]">
                            {st.name}
                          </div>
                          <div className="text-[11px] font-normal text-[#666666]">
                            {st.enrollmentNo ?? st.email}
                          </div>
                        </th>
                        <td data-label="Status" className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              st.status === "COMPLETED"
                                ? "bg-[#22AA22]/15 text-[#177A17]"
                                : "bg-[#0055CC]/12 text-[#0055CC]"
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td data-label="Marks" className="px-3 py-3 text-center">
                          <label htmlFor={marksId} className="sr-only">
                            Internal marks for {st.name}
                          </label>
                          <input
                            id={marksId}
                            type="text"
                            inputMode="numeric"
                            value={inputVal}
                            onChange={(e) =>
                              setMarksDraft((prev) => ({
                                ...prev,
                                [st.enrollmentId]: e.target.value,
                              }))
                            }
                            placeholder="0-30"
                            className="h-9 w-24 rounded-lg border border-[#D1D5DB] px-2.5 text-center text-xs font-semibold text-[#003366] focus:border-[#0055CC] focus:outline-none"
                          />
                        </td>
                        <td data-label="Actions" className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveMarks(st)}
                              className="rounded-lg bg-[#0055CC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003366] disabled:opacity-50"
                            >
                              {isSaving ? "..." : "Save"}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                handleSaveMarks(
                                  st,
                                  st.status === "COMPLETED"
                                    ? "ENROLLED"
                                    : "COMPLETED"
                                )
                              }
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#333333] hover:bg-[#F4F7FB] disabled:opacity-50"
                            >
                              {st.status === "COMPLETED" ? "Reopen" : "Complete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: Capacity & Alerts Overview */}
      {activeNav === "alerts" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CapacityBarChart
            items={courses.map((c) => ({
              code: c.code,
              title: c.title,
              activeSeats: c.activeSeats,
              maxSeats: c.maxSeats,
            }))}
            title="Assigned Course Capacity"
            subtitle="Active seats vs. batch limit"
          />

          <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-[#003366]">
              Attendance Alerts (&lt; 75%)
            </h2>
            {lowAttendanceRoster.length === 0 ? (
              <p className="mt-3 text-xs text-[#22AA22]">
                All enrolled students meet the 75% threshold.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {lowAttendanceRoster.map((item) => (
                  <li
                    key={item.enrollmentId}
                    className="rounded-xl border border-[#CC0000]/25 bg-[#FFF5F5] p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-[#CC0000]">
                      <span>{item.name}</span>
                      <span>{item.attendanceStats.percentage}%</span>
                    </div>
                    <div className="mt-1 text-[#333333]">
                      {item.courseCode} ({item.courseTitle}) •{" "}
                      {item.attendanceStats.presentSessions}/
                      {item.attendanceStats.totalSessions} sessions
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
