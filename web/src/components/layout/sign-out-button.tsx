"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

// Mounted behind the shared /admin door: sign-out lands on its login, outside this app's basePath.
const ADMIN_LOGIN_URL = process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL;

export function SignOutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      if (ADMIN_LOGIN_URL) {
        window.location.assign(ADMIN_LOGIN_URL);
      } else {
        router.push("/login");
        router.refresh();
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={signOut}
      className={className ?? "text-[#C5D2E4] hover:text-white"}
    >
      {children}
      Sign out
    </Button>
  );
}
