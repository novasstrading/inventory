import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[66px] w-full resize-y rounded-md border border-input bg-panel px-3 py-2 text-sm text-ink transition-colors placeholder:text-faint",
        "focus-visible:outline-none focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-navy/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
