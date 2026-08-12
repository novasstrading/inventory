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
