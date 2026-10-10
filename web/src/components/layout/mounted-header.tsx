"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fraunces } from "next/font/google";
import { LogOutIcon } from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["700"], display: "swap" });

/** Sub-pages of this app, shown in the second row. */
const SUB_TABS = [
  { href: "/assets", label: "Assets" },
  { href: "/employees", label: "Employees" },
];

/** Same word as the dashboard header: "it-support@x.com" -> "It Support", "IS". */
function nameParts(email: string) {
  const words = (email.split("@")[0] ?? "").split(/[._\-+\s]+/).filter(Boolean);
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || email;
  const initials = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
  return { name, initials };
}

/**
 * The header when this app is mounted under the shared /admin door: the same logo, module tabs,
 * profile and Sign out as the Dashboard / Website / Analytics screens, so moving between modules
 * feels like one product. The app's own pages (Assets, Employees, Access) sit in a second row.
 * Module links are plain <a>: /admin is outside this app's basePath, so next/link would mis-prefix it.
 */
export function MountedHeader({
  email,
  role,
  modules,
}: {
  email: string;
  role: "admin" | "viewer";
  modules: string[];
}) {
  const pathname = usePathname();
  const { name, initials } = nameParts(email);
  const subTabs = role === "admin" ? [...SUB_TABS, { href: "/admin/access", label: "Access" }] : SUB_TABS;

  const modTabs = [
    { href: "/admin", label: "Dashboard", on: true, current: false },
    { href: "/admin/content", label: "Website", on: modules.includes("website"), current: false },
    { href: "/admin/analytics", label: "Analytics", on: modules.includes("website"), current: false },
    { href: "/admin/inventory", label: "Assets", on: modules.includes("assets"), current: true },
  ].filter((t) => t.on);

  return (
    <header className="border-b border-[#16191F]/10 bg-[#F6F3ED] text-[#16191F]">
      <div className="mx-auto flex max-w-[1300px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <a href="/admin" aria-label="Nova SS Trading admin home" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Image src={withBasePath("/logo.png")} alt="" width={48} height={48} className="h-11 w-auto object-contain" priority />
          <span className="flex flex-col leading-none">
            <span className={cn(fraunces.className, "text-lg font-bold tracking-tight")}>
              NOVA SS<span className="text-[#B08A4F]">.</span>
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[#3A4049]">Trading</span>
          </span>
          <span className="ml-1 hidden rounded-full border border-[#B08A4F]/40 bg-[#B08A4F]/10 px-2.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-[#6b5128] sm:inline">
            Admin
          </span>
        </a>

        <div className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1 md:justify-center">
          <nav aria-label="Admin areas" className="flex w-full gap-1 md:w-auto">
            {modTabs.map((t) => (
              <a
                key={t.label}
                href={t.href}
                aria-current={t.current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-2 text-[0.82rem] font-semibold transition-colors sm:flex-none sm:px-4",
                  t.current ? "bg-[#16191F] text-[#F6F3ED]" : "text-[#16191F]/80 hover:bg-[#B08A4F]/10 hover:text-[#8C6C3A]",
                )}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden text-[0.8rem] font-semibold text-[#16191F]/70 transition-colors hover:text-[#8C6C3A] lg:inline"
          >
            View site ↗
          </a>
          <span
            className="flex items-center gap-2.5 rounded-full border border-[#16191F]/10 bg-white py-1 pl-1 pr-3"
            title={email}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#16191F] font-mono text-[0.7rem] font-semibold tracking-wider text-[#F6F3ED]">
              {initials}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium md:block">{name}</span>
          </span>
          <SignOutButton className="hidden items-center gap-1.5 rounded-full border border-[#16191F]/20 bg-transparent px-4 py-2 text-xs font-semibold text-[#16191F] hover:bg-[#16191F]/5 hover:text-[#16191F] sm:inline-flex">
            <LogOutIcon className="size-3.5" />
          </SignOutButton>
        </div>
      </div>

      <div className="border-t border-[#16191F]/5 bg-white/60">
        <nav aria-label="Assets sections" className="mx-auto hidden max-w-[1300px] gap-1 px-4 sm:flex sm:px-6">
          {subTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors",
                  active ? "border-[#B08A4F] text-[#16191F]" : "border-transparent text-[#3A4049] hover:text-[#8C6C3A]",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
