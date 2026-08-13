import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <div className="grad-navy flex size-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-[0_8px_24px_rgba(0,30,70,.25)]">
        404
      </div>
      <div>
        <h1 className="text-xl font-bold text-ink">Page not found</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link href="/assets">
        <Button variant="primary">Back to Assets</Button>
      </Link>
    </div>
  );
}
