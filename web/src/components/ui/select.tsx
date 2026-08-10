import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <select>, styled to match Input — simpler and just as capable as Radix Select for plain option lists. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-md border border-input bg-panel px-3 pr-8 text-sm text-ink transition-colors",
          "focus-visible:outline-none focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-navy/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
    </div>
  );
}

export { Select };
