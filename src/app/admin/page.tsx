import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getRoleHomePath } from "@/lib/auth";
import { getAdminOverviewData } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

async function AdminPortalContent() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN") {
    redirect(getRoleHomePath(user.role));
  }

  const [overviewData, demoUsers] = await Promise.all([
    getAdminOverviewData(),
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

  return (
    <AdminDashboardClient
      key={user.id}
      currentUser={user}
      demoUsers={demoUsers}
      initialData={overviewData}
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-sm font-medium text-[#003366]">
          Loading Admin Control Center...
        </div>
      }
    >
      <AdminPortalContent />
    </Suspense>
  );
}
