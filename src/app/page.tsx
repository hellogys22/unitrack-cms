import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingPortal } from "@/components/LandingPortal";

async function LandingContent() {
  await connection();
  const currentUser = await getCurrentUser();
  const courses = await prisma.course.findMany({
    include: {
      prerequisite: { select: { code: true } },
      enrollments: { where: { status: "ENROLLED" }, select: { id: true } },
    },
    orderBy: [{ semester: "asc" }, { code: "asc" }],
  });

  const nodes = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    credits: c.credits,
    semester: c.semester,
    maxSeats: c.maxSeats,
    activeSeats: c.enrollments.length,
    prerequisiteCode: c.prerequisite?.code ?? null,
  }));

  return <LandingPortal currentUser={currentUser} courses={nodes} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#002855] text-sm font-medium text-white">
          Loading UniTrack 3D Experience...
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
