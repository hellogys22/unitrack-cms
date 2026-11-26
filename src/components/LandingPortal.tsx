"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  GraduationCap,
  Lock,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  UniTrack3DCanvas,
  type Course3DNode,
} from "@/components/UniTrack3DCanvas";
import type { DemoUserOption } from "@/components/AppShell";

export function LandingPortal({
  currentUser,
  courses,
}: {
  currentUser: DemoUserOption | null;
  courses: Course3DNode[];
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(
    courses.find((c) => c.prerequisiteCode)?.code ?? courses[0]?.code ?? null
  );

  const portalHref =
    currentUser?.role === "ADMIN"
      ? "/admin"
      : currentUser?.role === "FACULTY"
        ? "/faculty"
        : "/student";

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#111111]">
      {/* Minimal Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#002855]/95 text-white backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0055CC] text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight">
                UniTrack CMS
              </span>
              <span className="block text-[11px] text-blue-200">
                CBCS Academic Engine
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <a
              href="/downloads/unitrack-cms.apk"
              download="UniTrack-CMS.apk"
              className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 sm:inline-flex"
            >
              <Smartphone className="h-3.5 w-3.5 text-blue-200" />
              <span>Download APK</span>
            </a>

            <Link
              href={currentUser ? portalHref : "/login"}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0055CC] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-500"
            >
              <span>
                {currentUser ? `Open Portal (${currentUser.name})` : "Sign In"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Priority 1: Interactive 3D Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#001836] via-[#003366] to-[#004899] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-12 lg:py-16">
          {/* Clean Value Proposition & Primary Login CTA */}
          <div className="lg:col-span-5">
            <span className="inline-flex items-center rounded-full border border-blue-300/30 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
              Choice-Based Credit System • BCA Software Engineering
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
              Academic Credit &amp; Prerequisite Control in Real Time.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100/90 sm:text-base">
              Explore the interactive 3D course constellation on the right, then
              sign in as Admin, Faculty, or Student to test live prerequisite
              locks, 24-credit caps, seat limits, and 75% attendance tracking.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={currentUser ? portalHref : "/login"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0055CC] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500"
              >
                <span>
                  {currentUser ? "Go to My Dashboard" : "Get Started — Sign In"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="/downloads/unitrack-cms.apk"
                download="UniTrack-CMS.apk"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Smartphone className="h-4 w-4 text-[#FFB800]" />
                <span>Android APK</span>
              </a>
            </div>

            {currentUser && (
              <div className="mt-4 text-xs text-blue-200">
                Signed in as{" "}
                <strong className="text-white">{currentUser.name}</strong> •{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Switch account
                </Link>
              </div>
            )}
          </div>

          {/* Interactive 3D Three.js Scene */}
          <div className="lg:col-span-7">
            <UniTrack3DCanvas
              courses={courses}
              selectedCode={selectedCode}
              onSelectCourse={setSelectedCode}
            />
          </div>
        </div>
      </section>

      {/* Simplified 3-Pillar Overview */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#FFB800]">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#003366]">
              Prerequisite Graph
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#444444]">
              Automatically verifies that required courses like{" "}
              <code>BCA-101</code> are marked <code>COMPLETED</code> before
              unlocking <code>BCA-201 Data Structures</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#0055CC]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#003366]">
              24-Credit Cap &amp; Seat Guard
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#444444]">
              Enforces the 24-credit semester limit, blocks full electives, and
              prevents deleting courses with active enrolled students.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#22AA22]">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#003366]">
              Attendance &amp; Marks Engine
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#444444]">
              Faculty record session checkboxes and 0–30 internal marks while
              flagging any student below the 75% attendance threshold.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E5E9F0] bg-white py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-[#555555] sm:px-8">
          <span>UniTrack CMS • Choice-Based Credit System</span>
          <Link
            href="/login"
            className="font-semibold text-[#0055CC] hover:underline"
          >
            Continue to Login Portal →
          </Link>
        </div>
      </footer>
    </div>
  );
}
