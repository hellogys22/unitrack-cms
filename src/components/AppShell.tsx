"use client";

import React, { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  Download,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { useToast } from "@/components/ToastProvider";

export interface DemoUserOption {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string | null;
  role: Role;
}

export interface NavItem {
  id: string;
  label: string;
  icon:
    | "dashboard"
    | "courses"
    | "attendance"
    | "marks"
    | "catalog"
    | "enroll"
    | "users"
    | "analytics";
}

function getInitials(name: string): string {
  const parts = name
    .replace(/^(Dr\.|Prof\.)\s*/i, "")
    .trim()
    .split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function NavIcon({ kind }: { kind: NavItem["icon"] }) {
  switch (kind) {
    case "dashboard":
      return <LayoutDashboard className="h-4 w-4 shrink-0" />;
    case "courses":
      return <BookOpen className="h-4 w-4 shrink-0" />;
    case "attendance":
      return <CalendarCheck className="h-4 w-4 shrink-0" />;
    case "marks":
      return <Award className="h-4 w-4 shrink-0" />;
    case "catalog":
      return <BarChart3 className="h-4 w-4 shrink-0" />;
    case "enroll":
      return <PlusCircle className="h-4 w-4 shrink-0" />;
    case "users":
      return <Users className="h-4 w-4 shrink-0" />;
    case "analytics":
      return <ShieldCheck className="h-4 w-4 shrink-0" />;
  }
}

function formatRoleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "FACULTY":
      return "Faculty";
    case "STUDENT":
      return "Student";
  }
}

export function AppShell({
  currentUser,
  demoUsers,
  navItems,
  activeNav,
  onSelectNav,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search courses...",
  children,
}: {
  currentUser: DemoUserOption;
  demoUsers: DemoUserOption[];
  navItems: NavItem[];
  activeNav: string;
  onSelectNav: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);

  async function handleSwitchUser(userId: string) {
    if (switching) return;
    setSwitching(true);
    setRoleMenuOpen(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({
          variant: "error",
          title: "Role switch failed",
          description: data.error ?? "Unable to switch demo user.",
        });
        return;
      }
      showToast({
        variant: "info",
        title: `Switched to ${data.user.name}`,
        description: `Loaded ${formatRoleLabel(data.user.role)} portal.`,
      });
      if (pathname === data.redirectTo) {
        router.refresh();
      } else {
        router.push(data.redirectTo);
        router.refresh();
      }
    } catch {
      showToast({
        variant: "error",
        title: "Network error",
        description: "Could not switch demo account.",
      });
    } finally {
      setSwitching(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#003366] text-white">
      <div>
        {/* Brand Crest */}
        <Link
          href="/"
          className="flex items-center gap-3 border-b border-white/10 px-5 py-5 hover:bg-white/5 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0055CC] text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-white">
              UniTrack CMS
            </div>
            <div className="text-[11px] font-medium text-blue-200/90">
              Choice-Based Credit System
            </div>
          </div>
        </Link>

        {/* Primary Navigation */}
        <nav aria-label="Portal sections" className="mt-5 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectNav(item.id);
                  drawerRef.current?.close();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#0055CC] text-white shadow-xs"
                    : "text-blue-100/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavIcon kind={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="my-3 border-t border-white/10" />

          <a
            href="/downloads/unitrack-cms.apk"
            download="UniTrack-CMS.apk"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-blue-100/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>Download Android APK</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-blue-100/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Switch Account / Logout</span>
          </button>
        </nav>
      </div>

      {/* Bottom Academic Footer */}
      <div className="border-t border-white/10 px-5 py-5 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-100">
          <BookOpen className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-white">
          BCA Software Engineering
        </p>
        <p className="mt-0.5 text-[11px] text-blue-200/80">
          Learn • Build • Grow
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F7FB]">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Slide-Over Navigation Drawer using native <dialog> */}
      <dialog
        ref={drawerRef}
        aria-label="Mobile navigation menu"
        className="m-0 h-screen max-h-screen w-72 max-w-[82vw] border-0 bg-[#003366] p-0 text-white lg:hidden"
        onClick={(e) => {
          if (e.target === drawerRef.current) {
            drawerRef.current.close();
          }
        }}
      >
        <div className="relative flex h-full flex-col">
          <button
            type="button"
            autoFocus
            onClick={() => drawerRef.current?.close()}
            aria-label="Close navigation menu"
            className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-blue-100 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebarContent}
        </div>
      </dialog>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 border-b border-[#E8EDF5] bg-white/95 px-4 py-3 backdrop-blur-xs sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => drawerRef.current?.showModal()}
                aria-label="Open navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E9F0] text-[#003366] hover:bg-[#F4F7FB] lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {onSearchChange ? (
                <search className="w-full max-w-md">
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="relative flex items-center"
                  >
                    <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#6B7280]" />
                    <label htmlFor="topbar-course-search" className="sr-only">
                      {searchPlaceholder}
                    </label>
                    <input
                      id="topbar-course-search"
                      type="search"
                      value={searchQuery ?? ""}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="h-10 w-full rounded-full border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#111111] placeholder:text-[#6B7280] focus:border-[#0055CC] focus:bg-white focus:outline-none"
                    />
                  </form>
                </search>
              ) : (
                <div className="text-sm font-semibold text-[#003366]">
                  UniTrack CBCS Academic Portal
                </div>
              )}
            </div>

            {/* Role / Demo Account Switcher + User Badge */}
            <div className="relative flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRoleMenuOpen((prev) => !prev)}
                aria-expanded={roleMenuOpen}
                aria-haspopup="listbox"
                disabled={switching}
                className="inline-flex items-center gap-2 rounded-full bg-[#003366] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0055CC] disabled:opacity-60"
              >
                <span>Role: {formatRoleLabel(currentUser.role)}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              <div
                title={`${currentUser.name} (${currentUser.email})`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4E2F4] bg-[#EAF2FD] text-xs font-bold text-[#003366]"
              >
                {getInitials(currentUser.name)}
              </div>

              {roleMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Switch demo user"
                  className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-[#E5E9F0] bg-white p-2 shadow-xl"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
                    1-Click Demo Role Switcher
                  </div>
                  <div className="mt-1 space-y-1">
                    {demoUsers.map((demo) => {
                      const selected = demo.id === currentUser.id;
                      return (
                        <button
                          key={demo.id}
                          type="button"
                          onClick={() => handleSwitchUser(demo.id)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                            selected
                              ? "bg-[#EAF2FD] text-[#003366]"
                              : "text-[#333333] hover:bg-[#F4F7FB]"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#111111]">
                              {demo.name}
                            </p>
                            <p className="truncate text-[11px] text-[#666666]">
                              {demo.enrollmentNo
                                ? `${demo.enrollmentNo} • `
                                : ""}
                              {demo.email}
                            </p>
                          </div>
                          <span
                            className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              demo.role === "ADMIN"
                                ? "bg-[#003366]/10 text-[#003366]"
                                : demo.role === "FACULTY"
                                  ? "bg-[#0055CC]/10 text-[#0055CC]"
                                  : "bg-[#22AA22]/15 text-[#177A17]"
                            }`}
                          >
                            {formatRoleLabel(demo.role)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Portal Main Body */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
