import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Chip/badge system — status, role, category (plan §7). */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        hardware: "bg-[#E8F0F9] text-[#1F5C97]",
        software: "bg-[#F0EAF9] text-[#5A3E9B]",
        active: "bg-good-bg text-good",
        removed: "bg-danger-bg text-danger",
        released: "bg-danger-bg text-danger",
        admin: "bg-[#E8F0F9] text-[#1F5C97]",
        viewer: "bg-[#F0EAF9] text-[#5A3E9B]",
        warn: "bg-gold-soft text-warn",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
