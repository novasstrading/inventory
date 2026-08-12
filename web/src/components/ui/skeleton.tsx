import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--line-2)_0%,var(--line)_50%,var(--line-2)_100%)] bg-[length:800px_100%]",
        "animate-[shimmer_1.4s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
