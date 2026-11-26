import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getRoleHomePath } from "@/lib/auth";
import { getFacultyPortalData } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { FacultyDashboardClient } from "@/components/FacultyDashboardClient";

async function FacultyPortalContent() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (user.role !== "FACULTY" && user.role !== "ADMIN") {
    redirect(getRoleHomePath(user.role));
  }

  const [courses, demoUsers] = await Promise.all([
    getFacultyPortalData(user.id, user.role),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        enrollmentNo: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <FacultyDashboardClient
      key={user.id}
      currentUser={user}
      demoUsers={demoUsers}
      initialCourses={courses}
      defaultDate={todayIso}
    />
  );
}

export default function FacultyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-sm font-medium text-[#003366]">
          Loading Faculty Workbench...
        </div>
      }
    >
      <FacultyPortalContent />
    </Suspense>
  );
}
