"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import type { DemoUserOption } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

interface LandingStats {
  courseCount: number;
  enrollmentCount: number;
  userCount: number;
}

const DEMO_META: Record<
  string,
  {
    badge: string;
    subtitle: string;
    highlights: string[];
    accent: string;
  }
> = {
  "user-admin-sharma": {
    badge: "System Admin",
    subtitle: "Curriculum & Seat Capacity Governance",
    highlights: [
      "Create, edit & assign faculty to BCA courses",
      "Configure credit weights, seat limits & prerequisites",
      "Safe delete enforcement (blocks if ENROLLED > 0)",
    ],
    accent: "border-[#003366]/25 bg-[#003366]/5 text-[#003366]",
  },
  "user-faculty-verma": {
    badge: "Faculty Portal",
    subtitle: "Teaches Data Structures, DBMS, SE, OS & Elective",
    highlights: [
      "Session-by-session checkbox attendance marking",
      "Automatic < 75% student alert highlighting",
      "Internal marks gradebook (0–30) & completion status",
    ],
    accent: "border-[#0055CC]/25 bg-[#0055CC]/8 text-[#0055CC]",
  },
  "user-student-priya": {
    badge: "Fresh Student",
    subtitle: "BCA2026001 • 0 Completed Courses • 10 / 24 Credits",
    highlights: [
      "Test prerequisite block on BCA-201 Data Structures",
      "Inspect live < 75% attendance warning (50% in DBMS)",
      "Enroll in open courses & near-full elective",
    ],
    accent: "border-[#FFB800]/40 bg-[#FFFBEB] text-[#9A6700]",
  },
  "user-student-rahul": {
    badge: "Advanced Student",
    subtitle: "BCA2026012 • Completed BCA-101 • 20 / 24 Credits",
    highlights: [
      "Test prerequisite pass on BCA-201 Data Structures",
      "Test 24-credit CBCS semester cap enforcement",
      "92% attendance On Track & 24/30 avg internal marks",
    ],
    accent: "border-[#22AA22]/30 bg-[#F0FDF4] text-[#177A17]",
  },
};

export function LandingPortal({
  currentUser,
  demoUsers,
  stats,
}: {
  currentUser: DemoUserOption | null;
  demoUsers: DemoUserOption[];
  stats: LandingStats;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  async function loginAs(user: DemoUserOption) {
    setLoadingUserId(user.id);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({
          variant: "error",
          title: "Login failed",
          description: data.error ?? "Could not start demo session.",
        });
        return;
      }
      showToast({
        variant: "success",
        title: `Signed in as ${user.name}`,
        description: `Opening ${user.role.toLowerCase()} portal...`,
      });
      router.push(data.redirectTo);
    } catch {
      showToast({
        variant: "error",
        title: "Network error",
        description: "Unable to connect to authentication service.",
      });
    } finally {
      setLoadingUserId(null);
    }
  }

  const currentHomePath =
    currentUser?.role === "ADMIN"
      ? "/admin"
      : currentUser?.role === "FACULTY"
        ? "/faculty"
        : "/student";

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Top Academic Header */}
      <header className="border-b border-[#E5E9F0] bg-[#003366] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0055CC] text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">UniTrack CMS</h1>
              <p className="text-xs text-blue-200">
                Choice-Based Credit System & Prerequisite-Aware Course
                Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-medium text-blue-100">
              <BookOpen className="h-3.5 w-3.5" />
              {stats.courseCount} BCA Courses
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-medium text-blue-100">
              <Users className="h-3.5 w-3.5" />
              {stats.userCount} Demo Personas
            </span>
            {currentUser && (
              <Link
                href={currentHomePath}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0055CC] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <span>Resume as {currentUser.name}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        {/* Hero Overview */}
        <section className="rounded-3xl border border-[#E5E9F0] bg-white p-6 shadow-xs sm:p-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF2FD] px-3 py-1 text-xs font-semibold text-[#0055CC]">
                <Sparkles className="h-3.5 w-3.5" />
                BCA Software Engineering Mini Project • PostgreSQL + Prisma 3NF
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#003366] sm:text-3xl">
                Instant Role-Based Academic Workspace
              </h2>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#333333]">
                Select any seeded academic persona below for 1-click HTTP-only
                cookie login. Every enrollment, course deletion, attendance
                threshold, and credit cap is strictly enforced by transactional
                REST APIs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-5">
              <div className="rounded-2xl border border-[#F0F0F0] bg-[#F8FAFC] p-4">
                <div className="text-xs font-medium text-[#555555]">
                  Credit Cap
                </div>
                <div className="mt-1 text-xl font-bold text-[#003366]">
                  24 / Sem
                </div>
                <div className="mt-0.5 text-[11px] text-[#22AA22]">
                  Enforced on Enroll
                </div>
              </div>
              <div className="rounded-2xl border border-[#F0F0F0] bg-[#F8FAFC] p-4">
                <div className="text-xs font-medium text-[#555555]">
                  Min Attendance
                </div>
                <div className="mt-1 text-xl font-bold text-[#003366]">
                  75%
                </div>
                <div className="mt-0.5 text-[11px] text-[#CC0000]">
                  Auto-Alert &lt; 75%
                </div>
              </div>
              <div className="col-span-2 rounded-2xl border border-[#F0F0F0] bg-[#F8FAFC] p-4 sm:col-span-1">
                <div className="text-xs font-medium text-[#555555]">
                  Internal Max
                </div>
                <div className="mt-1 text-xl font-bold text-[#003366]">
                  30 Marks
                </div>
                <div className="mt-0.5 text-[11px] text-[#0055CC]">
                  Faculty Gradebook
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1-Click Demo Login Cards */}
        <section aria-labelledby="demo-login-heading" className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                id="demo-login-heading"
                className="text-lg font-bold text-[#003366]"
              >
                1-Click Demo Login Portal
              </h2>
              <p className="text-xs text-[#555555]">
                Sessions are signed and stored in an HTTP-only cookie (`unitrack_session`).
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {demoUsers.map((user) => {
              const meta = DEMO_META[user.id] ?? {
                badge: user.role,
                subtitle: user.email,
                highlights: ["Role-based portal access"],
                accent: "border-[#0055CC]/25 bg-[#0055CC]/5 text-[#0055CC]",
              };
              const isCurrent = currentUser?.id === user.id;
              const isLoading = loadingUserId === user.id;

              return (
                <article
                  key={user.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                    isCurrent
                      ? "border-[#0055CC] ring-2 ring-[#0055CC]/15"
                      : "border-[#E5E9F0]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.accent}`}
                      >
                        {meta.badge}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22AA22]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-[#111111]">
                      {user.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-[#0055CC]">
                      {meta.subtitle}
                    </p>
                    <p className="mt-1 text-[11px] text-[#666666]">
                      {user.email}
                    </p>

                    <ul className="mt-4 space-y-2 border-t border-[#F0F0F0] pt-3.5 text-xs text-[#333333]">
                      {meta.highlights.map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22AA22]" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={loadingUserId !== null}
                    onClick={() => loginAs(user)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0055CC] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#003366] disabled:opacity-60"
                  >
                    <span>
                      {isLoading ? "Signing in..." : `Enter as ${user.name}`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* Enforced Software Engineering Rules Matrix */}
        <section className="mt-8 rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-[#003366]">
            Backend Validation Rules Enforced via REST APIs
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "1. Prerequisite Engine",
                desc: "Verifies prerequisite course Enrollment status === COMPLETED before allowing enrollment.",
              },
              {
                icon: ShieldCheck,
                title: "2. 24-Credit Semester Cap",
                desc: "Sums active ENROLLED course credits and rejects HTTP 400 if new credits exceed 24.",
              },
              {
                icon: Users,
                title: "3. Seat Capacity Guard",
                desc: "Blocks enrollment with HTTP 400 once active ENROLLED count reaches course.maxSeats.",
              },
              {
                icon: UserCheck,
                title: "4. Duplicate Prevention",
                desc: "Rejects re-enrollment when already ENROLLED or COMPLETED while permitting re-enroll after DROPPED.",
              },
              {
                icon: AlertTriangle,
                title: "5. Safe Course Deletion",
                desc: "Admin DELETE /api/courses/[id] returns HTTP 400 whenever any student is actively ENROLLED.",
              },
              {
                icon: CheckCircle2,
                title: "6. < 75% Attendance Alert",
                desc: "Dynamically calculates (present / total) * 100 and flags low-attendance students in red.",
              },
            ].map((rule) => {
              const Icon = rule.icon;
              return (
                <div
                  key={rule.title}
                  className="rounded-xl border border-[#F0F0F0] bg-[#F9FBFD] p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-[#003366]">
                    <Icon className="h-4 w-4 text-[#0055CC]" />
                    <span>{rule.title}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#444444]">
                    {rule.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
