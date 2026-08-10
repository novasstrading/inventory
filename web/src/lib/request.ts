import type { NextRequest } from "next/server";

/** Best-effort client IP behind Vercel's proxy — used only for OTP rate limiting, not security-critical. */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
