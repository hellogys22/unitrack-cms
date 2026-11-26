import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingPortal } from "@/components/LandingPortal";

async function LandingContent() {
  await connection();
  const currentUser = await getCurrentUser();
  const [demoUsers, courseCount, enrollmentCount] = await Promise.all([
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
    prisma.course.count(),
    prisma.enrollment.count({ where: { status: "ENROLLED" } }),
  ]);

  return (
    <LandingPortal
      currentUser={currentUser}
      demoUsers={demoUsers}
      stats={{
        courseCount,
        enrollmentCount,
        userCount: demoUsers.length,
      }}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-sm font-medium text-[#003366]">
          Loading UniTrack CMS...
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
