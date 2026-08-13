"use client";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <div className="grad-navy flex size-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-[0_8px_24px_rgba(0,30,70,.25)]">
        !
      </div>
      <div>
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. You can try again, or come back later."}
        </p>
      </div>
      <div className="flex gap-2.5">
        <Button variant="outline" asChild>
          <a href={withBasePath("/assets")}>Go home</a>
        </Button>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
