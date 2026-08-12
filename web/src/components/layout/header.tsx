"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

const TABS = [
  { href: "/assets", label: "Assets", icon: "📦" },
  { href: "/employees", label: "Employees", icon: "👤" },
];

export function DashboardHeader({ email, role }: { email: string; role: "admin" | "viewer" }) {
  const pathname = usePathname();
  const tabs = role === "admin" ? [...TABS, { href: "/admin/access", label: "Access", icon: "🔑" }] : TABS;

  return (
    <header className="sticky top-0 z-50 flex h-[60px] items-center gap-3.5 bg-navy px-4.5 text-white shadow-[0_1px_0_rgba(255,255,255,.06),0_4px_20px_rgba(0,0,0,.15)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,.2)]">
          <Image src={withBasePath("/logo-icon.png")} alt="Nova SS" width={32} height={32} className="object-contain" />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="text-[15px] font-extrabold leading-none tracking-wide">NOVA SS</div>
          <div className="text-[9.5px] font-bold leading-none tracking-[0.12em] text-gold-2">ASSET MANAGER</div>
        </div>
      </div>

      <div className="flex-1" />

      <nav className="hidden gap-1 rounded-[10px] bg-white/10 p-[3px] sm:flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold text-[#B8C5D9] transition-colors hover:bg-white/[.06] hover:text-white",
                active && "bg-white text-navy hover:bg-white hover:text-navy",
              )}
            >
              {tab.icon} {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 sm:hidden" />
      <div className="hidden flex-1 sm:block" />

      <div className="hidden items-center gap-2 text-[12.5px] text-[#C5D2E4] sm:flex">
        <span className="h-[7px] w-[7px] rounded-full bg-[#4ADE80] shadow-[0_0_0_3px_rgba(74,222,128,.2)]" />
        <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap font-medium">{email}</span>
        <span className="rounded-[5px] border border-gold/40 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-gold-2">
          {role}
        </span>
      </div>
      <SignOutButton />

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1.5 border-t border-line bg-panel p-1.5 shadow-[0_-2px_12px_rgba(0,0,0,.08)] sm:hidden">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 justify-center rounded-md px-3 py-2 text-center text-[13px] font-semibold text-muted-foreground",
                active && "bg-navy text-white",
              )}
            >
              {tab.icon} {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
