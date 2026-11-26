"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  LogIn,
} from "lucide-react";
import type { DemoUserOption } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

const ROLE_NOTES: Record<string, { tag: string; hint: string; pill: string }> = {
  "user-admin-sharma": {
    tag: "Admin",
    hint: "Course CRUD, faculty assignment, safe delete",
    pill: "bg-[#003366]/10 text-[#003366]",
  },
  "user-faculty-verma": {
    tag: "Faculty",
    hint: "Data Structures & DBMS attendance + 0–30 marks",
    pill: "bg-[#0055CC]/12 text-[#0055CC]",
  },
  "user-student-priya": {
    tag: "Fresh Student",
    hint: "0 completed • <75% attendance alert",
    pill: "bg-[#FFB800]/20 text-[#9A6700]",
  },
  "user-student-rahul": {
    tag: "Advanced Student",
    hint: "BCA-101 completed • 20/24 credits",
    pill: "bg-[#22AA22]/15 text-[#177A17]",
  },
};

export function LoginPortal({
  currentUser,
  demoUsers,
}: {
  currentUser: DemoUserOption | null;
  demoUsers: DemoUserOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function submitLogin(payload: { userId?: string; identifier?: string }, key: string) {
    setLoadingKey(key);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Unable to sign in.";
        setErrorMsg(msg);
        showToast({ variant: "error", title: "Sign in failed", description: msg });
        return;
      }

      showToast({
        variant: "success",
        title: `Welcome, ${data.user.name}`,
        description: `Opening ${data.user.role.toLowerCase()} portal...`,
      });
      router.push(data.redirectTo);
    } catch {
      setErrorMsg("Network error while signing in.");
    } finally {
      setLoadingKey(null);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("Enter your email or enrollment number (e.g. BCA2026012).");
      return;
    }
    submitLogin({ identifier: identifier.trim() }, "form");
  }

  const currentPortalPath =
    currentUser?.role === "ADMIN"
      ? "/admin"
      : currentUser?.role === "FACULTY"
        ? "/faculty"
        : "/student";

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Simple Header */}
      <header className="border-b border-[#E5E9F0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003366] text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-bold text-[#003366]">
              UniTrack CMS
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0055CC] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to 3D Overview</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Clean Credential Sign-In Form */}
          <section className="rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-xs lg:col-span-5">
            <h1 className="text-xl font-bold text-[#003366]">
              Sign in to UniTrack
            </h1>
            <p className="mt-1 text-xs text-[#555555]">
              Enter your academic email or student enrollment number, or pick a
              1-click demo persona.
            </p>

            {currentUser && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#22AA22]/30 bg-[#F0FDF4] px-3.5 py-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#177A17]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Active: {currentUser.name}
                </span>
                <Link
                  href={currentPortalPath}
                  className="font-bold text-[#0055CC] hover:underline"
                >
                  Open →
                </Link>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-[#CC0000]/35 bg-[#FFF5F5] p-3 text-xs text-[#CC0000]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-[#333333]"
                >
                  Email or Enrollment Number
                </label>
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. BCA2026012 or a.verma@unitrack.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3.5 text-sm text-[#111111] placeholder:text-[#888888] focus:border-[#0055CC] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loadingKey !== null}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0055CC] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#003366] disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                <span>
                  {loadingKey === "form" ? "Signing in..." : "Sign In to Portal"}
                </span>
              </button>
            </form>
          </section>

          {/* Right: Streamlined 1-Click Demo Personas */}
          <section className="rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-xs lg:col-span-7">
            <h2 className="text-base font-bold text-[#003366]">
              Quick Demo Access (1-Click Login)
            </h2>
            <p className="mt-0.5 text-xs text-[#555555]">
              Instant HTTP-only cookie login for BCA Software Engineering demo
              scenarios.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {demoUsers.map((user) => {
                const meta = ROLE_NOTES[user.id] ?? {
                  tag: user.role,
                  hint: user.email,
                  pill: "bg-[#0055CC]/10 text-[#0055CC]",
                };
                const isLoading = loadingKey === user.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={loadingKey !== null}
                    onClick={() => submitLogin({ userId: user.id }, user.id)}
                    className="flex flex-col justify-between rounded-xl border border-[#E5E9F0] bg-[#FAFBFD] p-4 text-left transition-all hover:border-[#0055CC] hover:bg-white hover:shadow-xs disabled:opacity-60"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.pill}`}
                        >
                          {meta.tag}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#0055CC]" />
                      </div>
                      <div className="mt-2.5 text-sm font-bold text-[#111111]">
                        {user.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#555555]">
                        {user.enrollmentNo
                          ? `${user.enrollmentNo} • `
                          : ""}
                        {user.email}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-[#ECEFF4] pt-2 text-[11px] font-medium text-[#003366]">
                      {isLoading ? "Signing in..." : meta.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
