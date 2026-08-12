import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Mirrors the legacy button classes (primary/gold/outline/ghost/danger) from
 * vercel-deploy/index.html so behavior + hierarchy stay recognizable.
 */
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

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
