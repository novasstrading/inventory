import type { ReactNode } from "react";
import { requirePageSession } from "@/lib/auth/session";
import { DashboardHeader } from "@/components/layout/header";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();
  return (
    <>
      <DashboardHeader email={session.email} role={session.role} modules={session.modules} />
      <main className="mx-auto max-w-[1300px] px-[18px] py-5 pb-16 sm:pb-[60px]">{children}</main>
    </>
  );
}
