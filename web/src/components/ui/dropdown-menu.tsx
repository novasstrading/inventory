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
