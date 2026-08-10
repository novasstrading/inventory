import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
