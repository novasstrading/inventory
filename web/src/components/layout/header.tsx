"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronDownIcon, HomeIcon, LogOutIcon, UserIcon } from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignOutButton } from "./sign-out-button";

// Set only when mounted behind the shared /admin door (see .env.example).
const MOUNTED = Boolean(process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL);

const TABS = [
  { href: "/assets", label: "Assets", icon: "📦" },
  { href: "/employees", label: "Employees", icon: "👤" },
];

function NavLinks({
  tabs,
  pathname,
  layoutId,
  mobile,
}: {
  tabs: typeof TABS;
  pathname: string;
  layoutId: string;
  mobile?: boolean;
}) {
  return (
    <>
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative z-[1] rounded-[7px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              mobile
                ? cn("flex flex-1 justify-center rounded-md px-3 py-2 text-center text-muted-foreground", active && "text-white")
                : cn("text-[#B8C5D9] hover:text-white", active && "text-navy"),
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className={cn("absolute inset-0 -z-[1] rounded-[7px]", mobile ? "bg-navy" : "bg-white")}
              />
            )}
            <span className="relative">
              {tab.icon} {tab.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}

export function DashboardHeader({ email, role }: { email: string; role: "admin" | "viewer" }) {
  const pathname = usePathname();
  const tabs = role === "admin" ? [...TABS, { href: "/admin/access", label: "Access", icon: "🔑" }] : TABS;

  return (
    <header className="glass sticky top-0 z-50 flex h-[60px] items-center gap-3.5 px-4.5 text-white shadow-[0_1px_0_rgba(255,255,255,.06),0_4px_20px_rgba(0,0,0,.15)]">
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

      <nav className="relative hidden gap-1 rounded-[10px] bg-white/10 p-[3px] sm:flex">
        <NavLinks tabs={tabs} pathname={pathname} layoutId="nav-pill" />
      </nav>

      <div className="flex-1 sm:hidden" />
      <div className="hidden flex-1 sm:block" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-[#C5D2E4] transition-colors hover:bg-white/10">
          <span className="h-[7px] w-[7px] rounded-full bg-[#4ADE80] shadow-[0_0_0_3px_rgba(74,222,128,.2)]" />
          <span className="hidden max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap font-medium sm:inline">{email}</span>
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="text-ink">
          <div className="px-3.5 py-2">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
              <UserIcon className="size-3.5 text-muted-foreground" />
              {email}
            </div>
            <span className="mt-1.5 inline-block rounded-[5px] border border-gold/40 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-warn">
              {role}
            </span>
          </div>
          <div className="my-1 border-t border-border" />
          {MOUNTED && (
            <div className="px-1.5">
              {/* Plain <a>: /admin is outside this app's basePath, so next/link would mis-prefix it. */}
              <a
                href="/admin"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-muted"
              >
                <HomeIcon className="size-3.5" />
                Admin home
              </a>
            </div>
          )}
          <div className="px-1.5 pb-1.5">
            <SignOutButton className="flex w-full items-center justify-start gap-2 rounded-md border-0 bg-transparent px-2 py-2 text-[13px] font-semibold text-danger hover:bg-danger-bg hover:text-danger">
              <LogOutIcon className="size-3.5" />
            </SignOutButton>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1.5 border-t border-line bg-panel p-1.5 shadow-[0_-2px_12px_rgba(0,0,0,.08)] sm:hidden">
        <NavLinks tabs={tabs} pathname={pathname} layoutId="mobile-nav-pill" mobile />
      </nav>
    </header>
  );
}
