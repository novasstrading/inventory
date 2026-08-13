"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3.5 p-8 text-center">
      <div className="grad-navy flex size-12 items-center justify-center rounded-xl text-lg font-extrabold text-white">!</div>
      <div>
        <h1 className="text-base font-bold text-ink">This section hit a snag</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {error.message || "Something went wrong loading this page."}
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
