"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Edit3,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  AppShell,
  type DemoUserOption,
  type NavItem,
} from "@/components/AppShell";
import { CapacityBarChart } from "@/components/CapacityBarChart";
import { useToast } from "@/components/ToastProvider";
import type { AttendanceStats } from "@/lib/cbcs";

export interface AdminCourseRow {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  semester: number;
  maxSeats: number;
  activeSeats: number;
  completedCount: number;
  lowAttendanceStudents: number;
  prerequisiteId: string | null;
  prerequisite: { id: string; code: string; title: string } | null;
  facultyId: string;
  faculty: { id: string; name: string; email: string };
}

export interface AdminOverviewPayload {
  courses: AdminCourseRow[];
  facultyMembers: Array<{ id: string; name: string; email: string; role: string }>;
  students: Array<{
    id: string;
    name: string;
    email: string;
    enrollmentNo: string | null;
    activeCredits: number;
    completedCredits: number;
    activeCoursesCount: number;
    completedCoursesCount: number;
    attendanceStats: AttendanceStats;
  }>;
  metrics: {
    totalCourses: number;
    totalActiveEnrollments: number;
    totalMaxSeats: number;
    totalLowAttendanceAlerts: number;
    totalStudents: number;
  };
}

const ADMIN_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "courses", label: "Course Catalog", icon: "courses" },
  { id: "students", label: "Student CBCS Audit", icon: "users" },
  { id: "analytics", label: "Capacity Analytics", icon: "analytics" },
];

interface CourseFormState {
  id?: string;
  code: string;
  title: string;
  description: string;
  credits: string;
  semester: string;
  maxSeats: string;
  facultyId: string;
  prerequisiteId: string;
}

export function AdminDashboardClient({
  currentUser,
  demoUsers,
  initialData,
}: {
  currentUser: DemoUserOption;
  demoUsers: DemoUserOption[];
  initialData: AdminOverviewPayload;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [data, setData] = useState<AdminOverviewPayload>(initialData);
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const courseDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [courseToDelete, setCourseToDelete] = useState<AdminCourseRow | null>(
    null
  );

  const defaultFacultyId =
    data.facultyMembers.find((f) => f.role === "FACULTY")?.id ??
    data.facultyMembers[0]?.id ??
    "";

  const [form, setForm] = useState<CourseFormState>({
    code: "",
    title: "",
    description: "",
    credits: "4",
    semester: "3",
    maxSeats: "30",
    facultyId: defaultFacultyId,
    prerequisiteId: "",
  });

  async function refreshOverview() {
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (res.ok) {
      const next: AdminOverviewPayload = await res.json();
      setData(next);
    }
    router.refresh();
  }

  function openCreateModal() {
    setFormError(null);
    setForm({
      code: "",
      title: "",
      description: "",
      credits: "4",
      semester: "3",
      maxSeats: "30",
      facultyId: defaultFacultyId,
      prerequisiteId: "",
    });
    courseDialogRef.current?.showModal();
  }

  function openEditModal(course: AdminCourseRow) {
    setFormError(null);
    setForm({
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      credits: String(course.credits),
      semester: String(course.semester),
      maxSeats: String(course.maxSeats),
      facultyId: course.facultyId,
      prerequisiteId: course.prerequisiteId ?? "",
    });
    courseDialogRef.current?.showModal();
  }

  function openDeleteConfirm(course: AdminCourseRow) {
    setCourseToDelete(course);
    deleteDialogRef.current?.showModal();
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      code: form.code,
      title: form.title,
      description: form.description,
      credits: Number(form.credits),
      semester: Number(form.semester),
      maxSeats: Number(form.maxSeats),
      facultyId: form.facultyId,
      prerequisiteId: form.prerequisiteId || null,
    };

    try {
      const isEdit = Boolean(form.id);
      const res = await fetch(
        isEdit ? `/api/courses/${form.id}` : "/api/courses",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error ?? "Failed to save course.");
        return;
      }

      courseDialogRef.current?.close();
      showToast({
        variant: "success",
        title: isEdit
          ? `Updated ${payload.code.toUpperCase()}`
          : `Created ${payload.code.toUpperCase()}`,
        description: `${payload.title} saved to CBCS catalog.`,
      });
      await refreshOverview();
    } catch {
      setFormError("Network error while saving course.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!courseToDelete) return;
    setSubmitting(true);
    setDeleteAlert(null);

    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      deleteDialogRef.current?.close();

      if (!res.ok) {
        const msg = result.error ?? `Unable to delete ${courseToDelete.code}.`;
        setDeleteAlert({ type: "error", message: msg });
        showToast({
          variant: "error",
          title: `Safe Delete Blocked — ${courseToDelete.code}`,
          description: msg,
        });
        return;
      }

      setDeleteAlert({ type: "success", message: result.message });
      showToast({
        variant: "success",
        title: `Deleted ${courseToDelete.code}`,
        description: result.message,
      });
      await refreshOverview();
    } catch {
      showToast({
        variant: "error",
        title: "Network Error",
        description: "Failed to delete course.",
      });
    } finally {
      setSubmitting(false);
      setCourseToDelete(null);
    }
  }

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.courses;
    return data.courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.faculty.name.toLowerCase().includes(q)
    );
  }, [data.courses, searchQuery]);

  return (
    <AppShell
      currentUser={currentUser}
      demoUsers={demoUsers}
      navItems={ADMIN_NAV}
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
            Welcome back, {currentUser.name}!
          </h1>
          <p className="mt-1 text-sm text-[#444444]">
            Configure CBCS curriculum, assign faculty, manage prerequisite chains,
            and monitor live seat utilization.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-[#0055CC] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#003366] sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Course</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <section
        aria-label="Admin key metrics"
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FD] text-[#0055CC]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366] tabular-nums">
                {data.metrics.totalCourses}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Active CBCS Courses
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FD] text-[#0055CC]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366] tabular-nums">
                {data.metrics.totalActiveEnrollments} /{" "}
                {data.metrics.totalMaxSeats}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Enrolled / Batch Seats
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                data.metrics.totalLowAttendanceAlerts > 0
                  ? "bg-[#FEF2F2] text-[#CC0000]"
                  : "bg-[#ECFDF3] text-[#22AA22]"
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  data.metrics.totalLowAttendanceAlerts > 0
                    ? "text-[#CC0000]"
                    : "text-[#003366]"
                }`}
              >
                {data.metrics.totalLowAttendanceAlerts}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                &lt; 75% Attendance Alerts
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#22AA22]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366] tabular-nums">
                {data.metrics.totalStudents}
              </div>
              <div className="text-xs font-medium text-[#555555]">
                Registered Students
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Course Management Table + Capacity Chart */}
      {(activeNav === "dashboard" ||
        activeNav === "courses" ||
        activeNav === "analytics") && (
        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <section className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs xl:col-span-8">
            <div className="flex flex-col justify-between gap-3 border-b border-[#F0F0F0] pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-[#003366]">
                  CBCS Course Catalog & Safe Deletion Control
                </h2>
                <p className="text-xs text-[#555555]">
                  Courses with active ENROLLED students are protected from
                  deletion (HTTP 400).
                </p>
              </div>
            </div>

            {deleteAlert && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                  deleteAlert.type === "error"
                    ? "border-[#CC0000]/35 bg-[#FFF5F5] text-[#990000]"
                    : "border-[#22AA22]/35 bg-[#F0FDF4] text-[#14532D]"
                }`}
              >
                {deleteAlert.type === "error" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#CC0000]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22AA22]" />
                )}
                <span className="font-medium leading-relaxed">
                  {deleteAlert.message}
                </span>
              </div>
            )}

            <div
              tabIndex={0}
              role="region"
              aria-label="Admin Course Management Table"
              className="unitrack-table-wrapper unitrack-responsive-table mt-4"
            >
              <table className="w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                    <th className="rounded-l-lg px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Title & Faculty</th>
                    <th className="px-3 py-2.5 text-center">Credits</th>
                    <th className="px-3 py-2.5">Prerequisite</th>
                    <th className="px-3 py-2.5 text-center">Enrolled / Max</th>
                    <th className="rounded-r-lg px-3 py-2.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filteredCourses.map((course) => {
                    const isFull = course.activeSeats >= course.maxSeats;
                    return (
                      <tr key={course.id} className="hover:bg-[#F9FBFE]">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2FD] px-2.5 py-0.5 text-[11px] font-semibold text-[#0055CC]">
                              <Lock className="h-3 w-3" />
                              {course.prerequisite.code}
                            </span>
                          ) : (
                            <span className="text-xs text-[#666666]">None</span>
                          )}
                        </td>
                        <td
                          data-label="Enrolled"
                          className="px-3 py-3 text-center text-xs font-bold tabular-nums"
                        >
                          <span
                            className={
                              isFull
                                ? "text-[#CC0000]"
                                : course.activeSeats > 0
                                  ? "text-[#0055CC]"
                                  : "text-[#666666]"
                            }
                          >
                            {course.activeSeats} / {course.maxSeats}
                          </span>
                        </td>
                        <td
                          data-label="Actions"
                          className="px-3 py-3 text-right"
                        >
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(course)}
                              aria-label={`Edit ${course.code}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003366] hover:bg-[#F4F7FB]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm(course)}
                              aria-label={`Delete ${course.code}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#CC0000]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#CC0000] hover:bg-[#FFF5F5]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-6 xl:col-span-4">
            <CapacityBarChart
              items={data.courses.map((c) => ({
                code: c.code,
                title: c.title,
                activeSeats: c.activeSeats,
                maxSeats: c.maxSeats,
              }))}
            />
          </div>
        </div>
      )}

      {/* Student CBCS Credit & Attendance Audit */}
      {(activeNav === "dashboard" || activeNav === "students") && (
        <section className="mt-6 rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0055CC]" />
            <div>
              <h2 className="text-base font-bold text-[#003366]">
                Student CBCS Credit Cap & Attendance Compliance
              </h2>
              <p className="text-xs text-[#555555]">
                Live audit across registered BCA students
              </p>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Student CBCS compliance table"
            className="unitrack-table-wrapper unitrack-responsive-table"
          >
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E9F0] bg-[#F8FAFC] text-xs font-semibold text-[#555555]">
                  <th className="rounded-l-lg px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Enrollment No</th>
                  <th className="px-3 py-2.5 text-center">
                    Active Credits / 24
                  </th>
                  <th className="px-3 py-2.5 text-center">Completed Credits</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">
                    Overall Attendance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {data.students.map((st) => {
                  const att = st.attendanceStats;
                  return (
                    <tr key={st.id} className="hover:bg-[#F9FBFE]">
                      <th
                        scope="row"
                        className="px-3 py-3 text-xs font-bold text-[#111111]"
                      >
                        {st.name}
                        <div className="text-[11px] font-normal text-[#666666]">
                          {st.email}
                        </div>
                      </th>
                      <td
                        data-label="Enrollment No"
                        className="px-3 py-3 text-xs font-medium text-[#003366]"
                      >
                        {st.enrollmentNo ?? "—"}
                      </td>
                      <td
                        data-label="Active Credits"
                        className="px-3 py-3 text-center text-xs font-bold text-[#003366] tabular-nums"
                      >
                        {st.activeCredits} / 24 ({st.activeCoursesCount}{" "}
                        courses)
                      </td>
                      <td
                        data-label="Completed Credits"
                        className="px-3 py-3 text-center text-xs font-semibold text-[#22AA22] tabular-nums"
                      >
                        {st.completedCredits} ({st.completedCoursesCount}{" "}
                        courses)
                      </td>
                      <td
                        data-label="Attendance"
                        className="px-3 py-3 text-right text-xs"
                      >
                        {att.totalSessions === 0 ? (
                          <span className="text-[#666666]">No sessions</span>
                        ) : att.isLowAttendance ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#CC0000]/12 px-2.5 py-0.5 font-bold text-[#CC0000]">
                            <AlertTriangle className="h-3 w-3" />
                            {att.percentage}% (&lt;75% Alert)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#22AA22]/12 px-2.5 py-0.5 font-semibold text-[#177A17]">
                            <CheckCircle2 className="h-3 w-3" />
                            {att.percentage}% On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Native <dialog> Create / Edit Course Modal */}
      <dialog
        ref={courseDialogRef}
        aria-labelledby="course-modal-title"
        className="m-auto w-full max-w-lg rounded-2xl border border-[#E5E9F0] bg-white p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F0F0F0] px-6 py-4">
          <h1
            id="course-modal-title"
            className="text-base font-bold text-[#003366]"
          >
            {form.id ? `Edit Course — ${form.code}` : "Create New CBCS Course"}
          </h1>
          <button
            type="button"
            onClick={() => courseDialogRef.current?.close()}
            aria-label="Close modal"
            className="rounded-lg p-1 text-[#555555] hover:bg-[#F1F5F9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSaveCourse} className="space-y-4 p-6">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-[#CC0000]/35 bg-[#FFF5F5] p-3 text-xs font-medium text-[#CC0000]"
            >
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="course-code"
                className="block text-xs font-semibold text-[#333333]"
              >
                Course Code *
              </label>
              <input
                id="course-code"
                name="code"
                type="text"
                required
                autoFocus
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="e.g. BCA-304"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="course-faculty"
                className="block text-xs font-semibold text-[#333333]"
              >
                Assigned Faculty *
              </label>
              <select
                id="course-faculty"
                name="facultyId"
                required
                value={form.facultyId}
                onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
              >
                {data.facultyMembers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="course-title"
              className="block text-xs font-semibold text-[#333333]"
            >
              Course Title *
            </label>
            <input
              id="course-title"
              name="title"
              type="text"
              required
              placeholder="e.g. Computer Networks"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="course-desc"
              className="block text-xs font-semibold text-[#333333]"
            >
              Course Description *
            </label>
            <textarea
              id="course-desc"
              name="description"
              required
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="course-credits"
                className="block text-xs font-semibold text-[#333333]"
              >
                Credits *
              </label>
              <input
                id="course-credits"
                name="credits"
                type="text"
                inputMode="numeric"
                required
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="course-semester"
                className="block text-xs font-semibold text-[#333333]"
              >
                Semester (1–8) *
              </label>
              <input
                id="course-semester"
                name="semester"
                type="text"
                inputMode="numeric"
                required
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="course-seats"
                className="block text-xs font-semibold text-[#333333]"
              >
                Max Seats *
              </label>
              <input
                id="course-seats"
                name="maxSeats"
                type="text"
                inputMode="numeric"
                required
                value={form.maxSeats}
                onChange={(e) => setForm({ ...form, maxSeats: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="course-prereq"
              className="block text-xs font-semibold text-[#333333]"
            >
              Prerequisite Course (Optional)
            </label>
            <select
              id="course-prereq"
              name="prerequisiteId"
              value={form.prerequisiteId}
              onChange={(e) =>
                setForm({ ...form, prerequisiteId: e.target.value })
              }
              className="mt-1 h-10 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#111111] focus:border-[#0055CC] focus:outline-none"
            >
              <option value="">None (No Prerequisite)</option>
              {data.courses
                .filter((c) => c.id !== form.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#F0F0F0] pt-4">
            <button
              type="button"
              onClick={() => courseDialogRef.current?.close()}
              className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#333333] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#0055CC] px-5 py-2 text-xs font-semibold text-white hover:bg-[#003366] disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : form.id
                  ? "Save Changes"
                  : "Create Course"}
            </button>
          </div>
        </form>
      </dialog>

      {/* Native <dialog> Safe Delete Confirmation Modal */}
      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-modal-title"
        className="m-auto w-full max-w-md rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-2xl"
      >
        <h1
          id="delete-modal-title"
          className="text-base font-bold text-[#003366]"
        >
          Confirm Course Deletion
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#444444]">
          Are you sure you want to delete{" "}
          <strong className="text-[#111111]">
            {courseToDelete?.code} — {courseToDelete?.title}
          </strong>
          ? Note: Safe Deletion will block this operation with HTTP 400 if any
          students are currently <code>ENROLLED</code> (currently{" "}
          {courseToDelete?.activeSeats ?? 0} active).
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => deleteDialogRef.current?.close()}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#333333] hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirmDelete}
            className="rounded-xl bg-[#CC0000] px-4 py-2 text-xs font-semibold text-white hover:bg-[#990000] disabled:opacity-50"
          >
            {submitting ? "Checking..." : "Attempt Delete"}
          </button>
        </div>
      </dialog>
    </AppShell>
  );
}
