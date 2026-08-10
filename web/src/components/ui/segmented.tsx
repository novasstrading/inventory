"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border-[1.5px] border-input bg-panel">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-muted",
            value === opt.value && "bg-navy text-white hover:bg-navy",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
