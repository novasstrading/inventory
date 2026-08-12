# Asset Manager UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Nova SS Asset Manager's Assets experience (dashboard, header, detail sheet, form, sticker dialog) to a polished, premium enterprise UI while keeping the Navy/Gold brand identity, data model, and API surface unchanged.

**Architecture:** Client-side presentation pass only. New small primitives go in `src/components/ui`; a new `AssetCard` mobile component lives beside its siblings in `src/components/assets`. Existing components are modified in place, following their current structure (Radix primitives for Dialog/Sheet, `cva` for variant components, `cn()` for class merging).

**Tech Stack:** Next.js 16.3 (App Router), React 19, Tailwind CSS v4 (`@theme inline`), Radix UI primitives (`@radix-ui/react-dialog`, `-select`, `-tabs`, `-checkbox`, `-label`, `-slot`), `class-variance-authority`, `tw-animate-css`, `lucide-react`, `sonner` (toasts), new: `framer-motion`.

## Global Constraints
- No new Radix packages — the dropdown menu is hand-built.
- `src/lib/stickers/render.ts` (`renderStickerCanvas`) is not modified — pixel-exact physical label layout.
- Employees and Admin/Access pages/components are out of scope.
- No backend/API changes.
- Brand tokens (`--navy`, `--gold`, etc. in `globals.css:9-30`) are not renamed or removed, only extended.
- This codebase has no component-testing library (only `vitest` for pure `lib/` logic, e.g. `src/lib/__tests__/crypto.test.ts`). Verification for UI tasks is `npm run typecheck`, `npm run lint`, `npm run build`, plus a manual check in the dev server — not fabricated unit tests for JSX.
- Every task must build clean: `cd web && npm run typecheck && npm run lint` before commit.

---

### Task 1: Add framer-motion + design tokens

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Produces: CSS utilities `.glass`, `.hover-lift`, `.grad-navy`, `.grad-gold`; keyframe `shimmer`. All later tasks consume these by class name.

- [ ] **Step 1: Install framer-motion**

```bash
cd web && npm install framer-motion
```

- [ ] **Step 2: Add utilities to `globals.css`**

Append after the existing `@keyframes shake` block (`globals.css:111-124`):

```css
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}

.glass {
  background: rgba(0, 30, 70, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.hover-lift {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16, 26, 38, 0.1);
}

.grad-navy {
  background: linear-gradient(180deg, var(--navy) 0%, var(--navy-2) 100%);
}
.grad-gold {
  background: linear-gradient(180deg, var(--gold) 0%, var(--gold-2) 100%);
}
```

Also update the `body` focus-visible baseline so rings animate — add right after the `body` rule (`globals.css:106-109`):

```css
:focus-visible {
  transition: outline-offset 0.15s ease, box-shadow 0.15s ease;
}
```

- [ ] **Step 3: Verify**

```bash
cd web && npm run typecheck && npm run lint
```
Expected: no errors. `framer-motion` present in `web/package.json` dependencies.

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/package-lock.json web/src/app/globals.css
git commit -m "Add framer-motion and premium design tokens (glass, hover-lift, gradients, shimmer)"
```

---

### Task 2: `Skeleton` primitive

**Files:**
- Create: `web/src/components/ui/skeleton.tsx`

**Interfaces:**
- Produces: `Skeleton({ className, ...props }: React.ComponentProps<"div">)` — a `div` rendering a shimmering placeholder block. Consumed by Task 9 (AssetsView loading table, stat tiles) and Task 12 (sticker thumbnails).

- [ ] **Step 1: Write the component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--line-2)_0%,var(--line)_50%,var(--line-2)_100%)] bg-[length:800px_100%]",
        "animate-[shimmer_1.4s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run typecheck && npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/skeleton.tsx
git commit -m "Add Skeleton primitive for loading states"
```

---

### Task 3: `EmptyState` primitive

**Files:**
- Create: `web/src/components/ui/empty-state.tsx`

**Interfaces:**
- Produces: `EmptyState({ title, description, action, className }: { title: string; description: string; action?: React.ReactNode; className?: string })`. Consumed by Task 9 (AssetsView) and Task 12 (sticker dialog, compact usage via `className="py-6"`).

- [ ] **Step 1: Write the component**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-4 text-faint" aria-hidden="true">
        <rect x="10" y="24" width="52" height="34" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M10 32h52" stroke="currentColor" strokeWidth="2" />
        <path d="M25 24V16a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v8" stroke="currentColor" strokeWidth="2" />
        <circle cx="36" cy="45" r="6" stroke="var(--gold)" strokeWidth="2" />
      </svg>
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      <div className="mt-1.5 max-w-sm text-[13px] text-muted-foreground">{description}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { EmptyState };
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/empty-state.tsx
git commit -m "Add EmptyState primitive"
```

---

### Task 4: `Alert` primitive

**Files:**
- Create: `web/src/components/ui/alert.tsx`

**Interfaces:**
- Produces: `Alert({ variant, children, className }: { variant?: "warn" | "danger"; children: React.ReactNode; className?: string })`. Consumed by Task 12 (sticker permanence callout).

- [ ] **Step 1: Write the component**

```tsx
import * as React from "react";
import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  warn: "bg-gold-soft text-warn border-gold/30",
  danger: "bg-danger-bg text-danger border-danger/20",
};

function Alert({
  variant = "warn",
  children,
  className,
}: {
  variant?: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-[12.5px] leading-relaxed", styles[variant], className)}>
      <AlertTriangleIcon className="mt-0.5 size-4 flex-none" />
      <div>{children}</div>
    </div>
  );
}

export { Alert };
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/alert.tsx
git commit -m "Add Alert primitive for permanent-action warnings"
```

---

### Task 5: `DropdownMenu` primitive

**Files:**
- Create: `web/src/components/ui/dropdown-menu.tsx`

**Interfaces:**
- Produces: `DropdownMenu({ children })` (context provider + relative wrapper), `DropdownMenuTrigger({ children, asChild? })`, `DropdownMenuContent({ children, align? })`, `DropdownMenuItem({ children, onSelect?, className? })`. Consumed by Task 7 (header profile menu).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

function useDropdown() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu.* must be used inside <DropdownMenu>");
  return ctx;
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

function DropdownMenuTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, setOpen } = useDropdown();
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2", className)}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const { open } = useDropdown();
  if (!open) return null;
  return (
    <div
      role="menu"
      className={cn(
        "absolute top-[calc(100%+8px)] z-50 min-w-[200px] rounded-lg border border-border bg-panel py-1.5 shadow-[0_12px_32px_rgba(16,26,38,.16)]",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  children,
  onSelect,
  className,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  const { setOpen } = useDropdown();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect?.();
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/dropdown-menu.tsx
git commit -m "Add hand-built DropdownMenu primitive"
```

---

### Task 6: Button + Card polish

**Files:**
- Modify: `web/src/components/ui/button.tsx`
- Modify: `web/src/components/ui/card.tsx`

**Interfaces:**
- Modifies `buttonVariants` (`primary`, `gold`) and adds press feedback to the base class.
- Adds `Card({ hoverable?: boolean, ... })`. Consumed by Task 9 (stat tiles, asset cards) and Task 12 (sticker thumbnails).

- [ ] **Step 1: Update `buttonVariants`**

In `web/src/components/ui/button.tsx`, change the base class (line 11) to add press feedback, and update `primary`/`gold` variants (lines 15-16) to use gradients:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-semibold transition-[colors,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "grad-navy text-white border border-navy shadow-sm hover:brightness-110",
        gold: "grad-gold text-[#231600] border border-gold font-bold shadow-sm hover:brightness-105",
        outline: "bg-transparent text-navy border border-navy hover:bg-navy hover:text-white",
        ghost: "bg-transparent text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground",
        danger: "bg-white text-danger border border-[#F0C9C4] hover:bg-danger-bg",
        default: "bg-panel text-ink-2 border border-border hover:border-[#CBD5E1] hover:bg-[#F8FAFC]",
      },
      size: {
        default: "px-4 py-2.5",
        sm: "px-3 py-1.5 text-[12.5px] rounded-[7px]",
        xs: "px-2.5 py-1 text-[11.5px] rounded-md gap-1",
        lg: "px-6 py-3.5 text-[15px] rounded-[10px]",
        icon: "p-2 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

- [ ] **Step 2: Add `hoverable` to `Card`**

Replace `web/src/components/ui/card.tsx` contents:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, hoverable, ...props }: React.ComponentProps<"div"> & { hoverable?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_3px_rgba(16,26,38,.06),0_1px_2px_rgba(16,26,38,.04)]",
        hoverable && "hover-lift cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
```

- [ ] **Step 3: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ui/button.tsx web/src/components/ui/card.tsx
git commit -m "Add gradient/press polish to Button, hoverable variant to Card"
```

---

### Task 7: Header — animated nav pill + profile dropdown

**Files:**
- Modify: `web/src/components/layout/header.tsx`

**Interfaces:**
- Consumes: `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem` (Task 5), `motion` from `framer-motion`.
- No exported interface changes — `DashboardHeader({ email, role })` signature is unchanged.

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignOutButton } from "./sign-out-button";

const TABS = [
  { href: "/assets", label: "Assets", icon: "📦" },
  { href: "/employees", label: "Employees", icon: "👤" },
];

function NavLinks({ tabs, pathname, layoutId, mobile }: { tabs: typeof TABS; pathname: string; layoutId: string; mobile?: boolean }) {
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
                className={cn(
                  "absolute inset-0 -z-[1] rounded-[7px]",
                  mobile ? "bg-navy" : "bg-white",
                )}
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
          <DropdownMenuItem className="text-danger">
            <LogOutIcon className="size-3.5" />
            <SignOutButton className="flex-1 text-left" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1.5 border-t border-line bg-panel p-1.5 shadow-[0_-2px_12px_rgba(0,0,0,.08)] sm:hidden">
        <NavLinks tabs={tabs} pathname={pathname} layoutId="mobile-nav-pill" mobile />
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Check `SignOutButton` accepts `className`**

Read `web/src/components/layout/sign-out-button.tsx`. If it doesn't forward `className` to its root element, add a `className` prop and apply it via `cn()`, matching the pattern in `button.tsx`.

- [ ] **Step 3: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 4: Manual check**

```bash
cd web && npm run dev
```
Open `/assets`, confirm: nav pill slides between tabs (desktop and mobile-width), profile dropdown opens/closes on click, outside-click, and Escape, sign-out still works.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/layout/header.tsx web/src/components/layout/sign-out-button.tsx
git commit -m "Animate header nav indicator, replace inline profile info with dropdown menu"
```

---

### Task 8: `AssetCard` mobile component

**Files:**
- Create: `web/src/components/assets/asset-card.tsx`

**Interfaces:**
- Produces: `AssetCard({ asset, holderName, onOpen }: { asset: Asset; holderName: string; onOpen: () => void })`. Consumed by Task 9.
- Consumes: `Asset` type from `@/lib/types`, `Badge`/`Card` from `@/components/ui`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Asset } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssetCard({
  asset,
  holderName,
  onOpen,
}: {
  asset: Asset;
  holderName: string;
  onOpen: () => void;
}) {
  return (
    <Card
      hoverable
      onClick={onOpen}
      className={cn("flex items-center gap-3 p-3.5", asset.status === "removed" && "opacity-50")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {asset.code && <span className="font-mono text-[11px] font-bold tracking-wide text-navy">{asset.code}</span>}
          <Badge variant={asset.type}>{asset.category}</Badge>
        </div>
        <div className="mt-1 truncate font-semibold text-ink">{asset.name}</div>
        {asset.brandModel && <div className="truncate text-[11.5px] text-muted-foreground">{asset.brandModel}</div>}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span>{asset.employeeId ? holderName || "—" : "Office"}</span>
          {asset.location && (
            <>
              <span>·</span>
              <span className="truncate">{asset.location}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant={asset.status}>{asset.status}</Badge>
    </Card>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/assets/asset-card.tsx
git commit -m "Add AssetCard component for mobile list view"
```

---

### Task 9: `AssetsView` — skeletons, empty states, filter bar, sticky table, mobile cards

**Files:**
- Modify: `web/src/components/assets/assets-view.tsx`

**Interfaces:**
- Consumes: `Skeleton` (Task 2), `EmptyState` (Task 3), `AssetCard` (Task 8), `motion`/`AnimatePresence` from `framer-motion`.

- [ ] **Step 1: Replace the loading state**

Replace lines 138-140:

```tsx
if (loading) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2.5">
        <Skeleton className="h-10 min-w-[190px] flex-1" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>
      <Card className="overflow-hidden">
        <div className="divide-y divide-line-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

Add the import: `import { Skeleton } from "@/components/ui/skeleton";`

- [ ] **Step 2: Replace the empty state**

Replace lines 261-266 (the `{pageSlice.length === 0 && ...}` block):

```tsx
{pageSlice.length === 0 &&
  (assets.length === 0 ? (
    <EmptyState
      title="No assets yet"
      description="Get started by adding your first hardware or software asset to the inventory."
      action={
        isAdmin && (
          <Button variant="gold" onClick={openAdd}>
            + Add your first asset
          </Button>
        )
      }
    />
  ) : (
    <EmptyState
      title="No matches"
      description="No assets match the current search and filters. Try adjusting or clearing them."
      action={
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setFilterCategory("");
            setFilterType("");
            setFilterStatus("active");
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      }
    />
  ))}
```

Add the import: `import { EmptyState } from "@/components/ui/empty-state";`

- [ ] **Step 3: Restyle the filter row + animated result count**

Replace the filter row `<div className="mb-4 flex flex-wrap items-center gap-2.5">...</div>` (lines 151-209) — keep all existing controls, wrap in a pill container and add the animated count. New wrapper open/close only; inner controls unchanged:

```tsx
<div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-panel/60 p-2.5 shadow-[0_1px_2px_rgba(16,26,38,.04)]">
  {/* ...existing Input, Select, Segmented, Segmented, and trailing button group unchanged... */}
</div>
<AnimatePresence mode="wait">
  <motion.div
    key={filtered.length}
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 4 }}
    transition={{ duration: 0.15 }}
    className="mb-2.5 text-[11.5px] font-medium text-muted-foreground"
  >
    {filtered.length} {filtered.length === 1 ? "result" : "results"}
  </motion.div>
</AnimatePresence>
```

Add imports: `import { AnimatePresence, motion } from "framer-motion";`

- [ ] **Step 4: Sticky desktop header + row hover, mobile card list**

Wrap the existing `<Card className="overflow-hidden">...</Card>` table block (lines 211-267) so it's desktop-only, and add a mobile-only card list before it:

```tsx
{/* mobile: card list */}
<div className="flex flex-col gap-2.5 sm:hidden">
  {pageSlice.map((a) => (
    <AssetCard key={a.id} asset={a} holderName={employeeName(a.employeeId)} onOpen={() => openDetail(a)} />
  ))}
  {pageSlice.length === 0 && emptyStateBlock}
</div>

{/* desktop: table */}
<Card className="hidden overflow-hidden sm:block">
  <div className="overflow-x-auto">
    <Table>
      <TableHeader className="sticky top-[60px] z-10 bg-panel">
        {/* ...existing TableRow of TableHead unchanged... */}
      </TableHeader>
      <TableBody>
        {pageSlice.map((a) => (
          <TableRow key={a.id} className={cn("transition-colors hover:bg-muted/50", a.status === "removed" && "opacity-50")}>
            {/* ...existing cells unchanged... */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
  {pageSlice.length === 0 && emptyStateBlock}
</Card>
```

Extract the empty-state JSX from Step 2 into a local variable `const emptyStateBlock = (...)` right above the `return (` so both the mobile and desktop branches can render it once computed. Add `import { cn } from "@/lib/utils";` (if not already present) and `import { AssetCard } from "./asset-card";`.

- [ ] **Step 5: Stat tile polish**

In the `StatTile` function (bottom of file), change the `Card` to use `hoverable` and add a subtle mount animation:

```tsx
function StatTile({ label, value, accent, color }: { label: string; value: number; accent: string; color: string }) {
  return (
    <Card hoverable className="relative overflow-hidden p-4">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />
      <div className={`text-[26px] font-extrabold leading-none tracking-tight ${color}`}>{value}</div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </Card>
  );
}
```

- [ ] **Step 6: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 7: Manual check**

```bash
cd web && npm run dev
```
Open `/assets`: confirm skeleton renders briefly on load, empty state shows correctly when filters exclude everything, filter bar looks cohesive, desktop table header sticks on scroll with row hover, resizing below `sm` switches to the card list, stat tiles lift on hover.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/assets/assets-view.tsx
git commit -m "Overhaul AssetsView: skeleton loading, empty states, filter bar, sticky table, mobile cards"
```

---

### Task 10: `AssetDetailSheet` — hero + sectioned data

**Files:**
- Modify: `web/src/components/assets/asset-detail-sheet.tsx`

**Interfaces:**
- No signature changes to `AssetDetailSheet`. Consumes existing `Kv` helper (unchanged).

- [ ] **Step 1: Add a hero block**

Replace the `<SheetHeader>...</SheetHeader>` and the first lines of `<SheetBody>` (lines 90-99) with:

```tsx
<SheetHeader className="glass border-b-0 bg-[linear-gradient(135deg,var(--navy)_0%,var(--navy-2)_100%)] text-white">
  <SheetClose className="ml-auto text-white/70 hover:bg-white/10 hover:text-white" />
</SheetHeader>
<div className="bg-[linear-gradient(135deg,var(--navy)_0%,var(--navy-2)_100%)] px-5 pb-5 pt-1 text-white">
  <div className="flex flex-wrap items-center gap-2">
    {asset.code && <span className="font-mono text-[13px] font-bold text-gold-2">{asset.code}</span>}
    <Badge variant={asset.type}>{asset.category}</Badge>
    <Badge variant={asset.status}>{asset.status}</Badge>
  </div>
  <div className="mt-2 text-xl font-bold">{asset.name}</div>
  {asset.brandModel && <div className="mt-0.5 text-[13px] text-white/70">{asset.brandModel}</div>}
</div>
<SheetBody>
```

Move the action buttons block (`{isAdmin && (...)}`, lines 101-118) to sit right after this, unchanged, and remove the now-duplicated `<SheetTitle>{asset.name}</SheetTitle>` / brand-model lines that used to be at the top of `SheetBody` (old lines 98-99) since the hero now shows them.

Note: `SheetClose` needs a `className` passthrough — check `web/src/components/ui/sheet.tsx:59-69`; if it doesn't merge an incoming `className` with its default classes via `cn()`, update it to do so (same pattern as `Button`).

- [ ] **Step 2: Section the `dl`**

Replace the flat `<dl>` (lines 120-144) with three headed sections:

```tsx
<div className="mt-5">
  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Overview</div>
  <dl className="grid grid-cols-[120px_1fr] gap-x-3.5 gap-y-2 text-[13.5px]">
    <Kv label="Serial" value={asset.serial} />
    <Kv label="Vendor" value={asset.vendor} />
    <Kv label="Purchased" value={asset.purchaseDate} />
  </dl>
</div>

<div className="mt-5 border-t border-line-2 pt-4">
  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Specs &amp; value</div>
  <dl className="grid grid-cols-[120px_1fr] gap-x-3.5 gap-y-2 text-[13.5px]">
    <Kv label="Specs" value={asset.specs} />
    {asset.valueAmount && (
      <>
        <dt className="text-muted-foreground">Value</dt>
        <dd className="text-ink-2">
          {asset.valueAmount} {asset.valueCurrency}
          {asset.valueType !== "one_time" && (
            <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{asset.valueType}</span>
          )}
        </dd>
      </>
    )}
  </dl>
</div>

<div className="mt-5 border-t border-line-2 pt-4">
  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Assignment &amp; lifecycle</div>
  <dl className="grid grid-cols-[120px_1fr] gap-x-3.5 gap-y-2 text-[13.5px]">
    <dt className="text-muted-foreground">Assigned to</dt>
    <dd className="text-ink-2">{holder}</dd>
    <Kv label="Location" value={asset.location} />
    <Kv label="Notes" value={asset.notes} />
    <dt className="text-muted-foreground">Added</dt>
    <dd className="text-ink-2">{fmt(asset.createdAt)}</dd>
  </dl>
</div>
```

- [ ] **Step 2: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 3: Manual check**

```bash
cd web && npm run dev
```
Open `/assets`, click any asset row: confirm the hero renders with gradient, status/category/code visible, actions still work, transfer history and galleries still render below the sectioned `dl`.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/assets/asset-detail-sheet.tsx web/src/components/ui/sheet.tsx
git commit -m "Add hero block and sectioned data layout to AssetDetailSheet"
```

---

### Task 11: `AssetFormDialog` — grouped sections + inline validation

**Files:**
- Modify: `web/src/components/assets/asset-form-dialog.tsx`

**Interfaces:**
- No signature changes to `AssetFormDialog`. Adds local `errors: Record<string, string>` state.

- [ ] **Step 1: Add inline error state**

Add near the other `useState` declarations (after line 51):

```tsx
const [errors, setErrors] = React.useState<Record<string, string>>({});
```

Reset it in the `React.useEffect` that resets fields on open (after line 67, inside the effect): `setErrors({});`

- [ ] **Step 2: Replace `save()`'s validation**

Replace lines 70-72:

```tsx
async function save() {
  const nextErrors: Record<string, string> = {};
  if (!name.trim()) nextErrors.name = "Name is required.";
  if (!isEdit && !category) nextErrors.category = "Pick a category.";
  if (Object.keys(nextErrors).length > 0) {
    setErrors(nextErrors);
    return;
  }
  setErrors({});
```

- [ ] **Step 3: Wire the Name field to show inline errors**

Replace the Name field block (lines 140-143):

```tsx
<div className="col-span-full mb-3">
  <Label>Name / title *</Label>
  <Input
    value={name}
    onChange={(e) => {
      setName(e.target.value);
      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
    }}
    placeholder="e.g. Dell Latitude 5420"
    className={cn(errors.name && "border-danger animate-[shake_0.4s_ease-in-out]")}
  />
  {errors.name && <div className="mt-1 text-[11.5px] text-danger">{errors.name}</div>}
</div>
```

Add the import: `import { cn } from "@/lib/utils";`

- [ ] **Step 4: Group fields under section headings**

In the `grid grid-cols-1 gap-x-4 sm:grid-cols-2` block (lines 122-214), insert small uppercase headings (as `col-span-full` divs) before each logical group, without changing any field:

- Before the Category select (if `!isEdit`) and Name field: heading not needed (they're the identity fields already at top) — instead add a heading `"Identity"` as the very first child of the grid.
- Before the Vendor field (line 156): add heading `"Specs & vendor"` as a `col-span-full` div, positioned before the Brand/model + Serial + Specs fields (i.e., before line 144's Brand/model block, replacing "Identity" scope to just Name).
- Before the Value field (line 164): add heading `"Value"`.
- Before the Assigned-to field (line 192): add heading `"Assignment & notes"`.

Each heading:

```tsx
<div className="col-span-full mb-1.5 mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground first:mt-0">
  Section Name
</div>
```

Concretely, the grid's child order becomes: `Identity` heading → Category (if !isEdit) → Name → `Specs & vendor` heading → Brand/model → Serial → Specs → Vendor → Purchase date → `Value` heading → Value/cost row → `Assignment & notes` heading → Assigned to → Location → Notes.

- [ ] **Step 5: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 6: Manual check**

```bash
cd web && npm run dev
```
Open Add Asset dialog: confirm section headings render, submitting with an empty name shows a red border + shake + inline message under the field (no toast for that case), fixing the name clears the error, saving still works end-to-end.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/assets/asset-form-dialog.tsx
git commit -m "Group AssetFormDialog fields into sections, add inline validation feedback"
```

---

### Task 12: `StickerDialog` — priority polish (live preview, permanence callout, confirm step, gallery)

**Files:**
- Modify: `web/src/components/assets/sticker-dialog.tsx`

**Interfaces:**
- Consumes: `Alert` (Task 4), `Skeleton` (Task 2), `EmptyState` (Task 3), the **unmodified** `renderStickerCanvas`/`canvasToBlob` from `@/lib/stickers/render.ts`.
- No signature changes to `StickerDialog`.

- [ ] **Step 1: Add live preview state + debounced render**

Add near the other `useState` declarations (after line 77):

```tsx
const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
const [confirmingGenerate, setConfirmingGenerate] = React.useState(false);
```

Add a debounced preview effect (after the existing `load` effect, ~after line 94):

```tsx
React.useEffect(() => {
  if (!open || !asset || !newLabel.trim()) {
    setPreviewUrl(null);
    return;
  }
  let cancelled = false;
  const timer = setTimeout(async () => {
    try {
      const canvas = await renderStickerCanvas(asset, newLabel.trim());
      if (cancelled) return;
      setPreviewUrl(canvas.toDataURL("image/png"));
    } catch {
      if (!cancelled) setPreviewUrl(null);
    }
  }, 350);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}, [open, asset, newLabel]);
```

Reset `confirmingGenerate` whenever the label changes: in the `newLabel` `onChange` handler (see Step 3), also call `setConfirmingGenerate(false)`.

- [ ] **Step 2: Replace the warning paragraph with `Alert`**

Replace lines 150-154 (the `<p className="mb-2.5...">` warning text):

```tsx
<Alert variant="warn" className="mb-3">
  Each label can only be generated <b>once</b> and is then permanently saved — it can be downloaded again anytime,
  but not regenerated. To print another physical sticker for this item (e.g. one for the box, one for the
  charger), enter a new, different label below.
</Alert>
```

Add the import: `import { Alert } from "@/components/ui/alert";`

- [ ] **Step 3: Add the live preview pane + two-step confirm**

Replace the input+button row (lines 155-164):

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
  <div className="flex-1">
    <Input
      value={newLabel}
      onChange={(e) => {
        setNewLabel(e.target.value);
        setConfirmingGenerate(false);
      }}
      placeholder="e.g. Laptop body, Box, Charger"
    />
    {!confirmingGenerate ? (
      <Button
        variant="gold"
        className="mt-2 w-full sm:w-auto"
        disabled={generating || !newLabel.trim()}
        onClick={() => setConfirmingGenerate(true)}
      >
        Generate
      </Button>
    ) : (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2">
        <span className="text-[12px] text-danger">
          Generate &ldquo;{newLabel.trim()}&rdquo; — this can&apos;t be undone.
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button variant="ghost" size="xs" onClick={() => setConfirmingGenerate(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="xs" disabled={generating} onClick={generate}>
            {generating ? "Generating…" : "Confirm"}
          </Button>
        </div>
      </div>
    )}
  </div>
  {previewUrl && (
    <div className="flex flex-none flex-col items-center gap-1.5">
      <div className="rounded-lg border border-border bg-white p-1.5 shadow-[0_4px_16px_rgba(16,26,38,.12)] [transform:rotate(-1deg)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview, not an app asset */}
        <img src={previewUrl} alt="Sticker preview" className="block h-[66px] w-[150px] object-contain" />
      </div>
      <span className="text-[10px] text-muted-foreground">Preview · 340×150 print size</span>
    </div>
  )}
</div>
```

- [ ] **Step 4: Reset confirm state on successful generate**

In `generate()` (lines 98-119), after `setNewLabel("")` add `setConfirmingGenerate(false);`. Also surface a 409 (duplicate label) inline: wrap the existing `catch` block's message into a local `errors`-style state if you want it under the input — minimal version: keep the existing `toast.error`, since the confirm chip above already shows the exact label being generated, making a duplicate-label conflict self-evident on retry. (No structural change required here beyond the reset line.)

- [ ] **Step 5: Skeleton thumbnails + EmptyState**

In `StickerThumb` (lines 21-62), replace the loading placeholder (line 50):

```tsx
{src ? (
  // eslint-disable-next-line @next/next/no-img-element -- authenticated proxy blob URL
  <img src={src} alt={sticker.label} className="block w-full" />
) : (
  <Skeleton className="h-full w-full rounded-none" />
)}
```

Wrap the thumbnail's outer `<div className="flex h-[110px] w-[220px] ...">` with `hover-lift` on its parent container (line 44's outer `<div className="flex flex-col items-center gap-2">` → add `hover-lift rounded-lg p-1.5"` and keep existing classes).

Replace the "No stickers generated yet" text (line 136):

```tsx
<EmptyState
  className="py-8"
  title="No stickers yet"
  description="Generate the first physical label for this item using the form below."
/>
```

Add imports: `import { Skeleton } from "@/components/ui/skeleton";` and `import { EmptyState } from "@/components/ui/empty-state";`

- [ ] **Step 6: Verify**

```bash
cd web && npm run typecheck && npm run lint
```

- [ ] **Step 7: Manual check**

```bash
cd web && npm run dev
```
Open an asset with a code → Sticker: type a label, confirm the live preview renders within ~350ms and matches the downloaded sticker exactly (same `renderStickerCanvas` call); click Generate → confirm the inline confirm chip appears (not a browser dialog); click Confirm → sticker saves, downloads, appears in the gallery with the shimmer→image transition; try an existing label → duplicate error still surfaces via toast; empty gallery state renders correctly for an asset with no stickers yet.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/assets/sticker-dialog.tsx
git commit -m "Add live preview, permanence Alert, two-step confirm, and gallery polish to StickerDialog"
```

---

### Task 13: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

```bash
cd web && npm run typecheck && npm run lint && npm run build
```
Expected: all pass with no errors.

- [ ] **Step 2: Full manual walkthrough**

```bash
cd web && npm run dev
```
Walk through: `/assets` loading skeleton → empty state (temporarily filter to zero results) → filter bar → desktop table sticky/hover → resize to mobile width for card list → open an asset (hero + sections) → edit an asset (grouped form + trigger a validation error) → generate a sticker (preview + confirm) → header nav pill on both tab switches and screen-width breakpoints → profile dropdown → sign out still works.

- [ ] **Step 3: Commit (if any fixups were needed)**

```bash
git add -A
git commit -m "Fix issues found during full UI overhaul verification pass"
```
(Skip this step if no fixups were needed.)
