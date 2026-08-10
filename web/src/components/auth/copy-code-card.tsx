"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Ported from the legacy api.php?action=copy_helper page: opened from the
 * email's "Copy code" link, auto-copies the code, then offers one tap back
 * into the app. Email clients block JS, so a real clipboard copy can only
 * happen on a page like this, outside the email.
 */
export function CopyCodeCard({ code }: { code: string }) {
  const [status, setStatus] = React.useState<"copying" | "ok" | "err">("copying");

  React.useEffect(() => {
    navigator.clipboard
      .writeText(code)
      .then(() => setStatus("ok"))
      .catch(() => setStatus("err"));
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDEFF3] p-5">
      <div className="w-full max-w-[360px] rounded-2xl bg-white p-9 py-8 text-center shadow-[0_10px_40px_rgba(0,0,0,.12)]">
        <div className="mx-auto mb-4 h-[52px] w-[52px] rounded-[10px] bg-navy p-1.5">
          <Image src="/logo-icon.png" alt="" width={40} height={40} className="h-full w-full object-contain" />
        </div>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Your sign-in code</div>
        <div className="my-2 select-all font-mono text-[44px] font-extrabold tracking-[0.18em] text-navy">{code}</div>
        <div
          className={cn(
            "my-3.5 flex min-h-[44px] items-center justify-center gap-2 text-[14.5px] font-semibold",
            status === "ok" && "text-good",
            status === "err" && "text-danger",
          )}
        >
          {status === "copying" && "Copying…"}
          {status === "ok" && (
            <>
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-good text-[13px] text-white">
                ✓
              </span>
              Copied — paste it in the app
            </>
          )}
          {status === "err" && "Tap the code above to select, then copy manually"}
        </div>
        <Link href="/login" className="block rounded-[10px] bg-navy px-4 py-3 text-[14.5px] font-bold text-white">
          ← Back to Asset Manager
        </Link>
      </div>
    </div>
  );
}
