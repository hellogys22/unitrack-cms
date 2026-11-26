import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginPortal } from "@/components/LoginPortal";

async function LoginContent() {
  await connection();
  const [currentUser, demoUsers] = await Promise.all([
    getCurrentUser(),
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

  return <LoginPortal currentUser={currentUser} demoUsers={demoUsers} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-sm font-medium text-[#003366]">
          Loading Login Portal...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
