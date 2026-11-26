import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getRoleHomePath } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { StudentDashboardClient } from "@/components/StudentDashboardClient";

async function StudentPortalContent() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (user.role !== "STUDENT") {
    redirect(getRoleHomePath(user.role));
  }

  const [dashboardData, demoUsers] = await Promise.all([
    getStudentDashboardData(user.id),
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

  if (!dashboardData) {
    redirect("/");
  }

  return (
    <StudentDashboardClient
      key={dashboardData.student.id}
      initialData={dashboardData}
      demoUsers={demoUsers}
    />
  );
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-sm font-medium text-[#003366]">
          Loading Student CBCS Portal...
        </div>
      }
    >
      <StudentPortalContent />
    </Suspense>
  );
}
