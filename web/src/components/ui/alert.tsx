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
