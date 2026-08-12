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
