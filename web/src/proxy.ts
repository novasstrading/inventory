import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic, cookie-presence-only redirect (Next.js 16 renamed Middleware to
 * Proxy — functionality is the same). This is a UX nicety, NOT the security
 * boundary: every Route Handler still calls requireSession()/requireAdmin()
 * for the authoritative, DB-backed check (plan §5).
 */

// "/no-access" is reachable with a session that lacks the Assets module (the page
// itself re-checks the session server-side).
const PUBLIC_PATHS = ["/login", "/copy", "/no-access"];

/**
 * Pure routing decision: the path-only redirect target, or null to let the request
 * through. `pathname` is basePath-relative; `basePath` is "" standalone or e.g.
 * "/admin/inventory" when mounted via Multi-Zones.
 */
export function resolveRedirect(opts: {
  pathname: string;
  basePath: string;
  hasSession: boolean;
  /** NEXT_PUBLIC_ADMIN_LOGIN_URL — the shared /admin door's login, on the public host, NOT basePath-prefixed. */
  adminLoginUrl?: string;
}): string | null {
  const { pathname, basePath, hasSession, adminLoginUrl } = opts;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const loginUrl = adminLoginUrl || `${basePath}/login`;
  const homeUrl = `${basePath}/assets`;

  if (pathname === "/") return hasSession ? homeUrl : loginUrl;
  if (pathname === "/login") {
    // Mounted: never show this app's own login — always hand off to the shared door
    // (which also breaks a stale-cookie loop, since the door re-checks /api/auth/me).
    if (adminLoginUrl) return adminLoginUrl;
    return hasSession ? homeUrl : null;
  }
  if (!isPublic && !hasSession) return loginUrl;
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname, basePath } = request.nextUrl;
  const target = resolveRedirect({
    pathname,
    basePath,
    hasSession: Boolean(request.cookies.get(SESSION_COOKIE)?.value),
    adminLoginUrl: process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL || "",
  });
  if (!target) return NextResponse.next();

  // The browser must receive a RELATIVE Location: behind a cross-project rewrite,
  // request.url carries the deployment host, not the public one. But Next 16's proxy
  // adapter (Node runtime) re-parses Location with `new URL(location)` and no base, so
  // a bare path throws ERR_INVALID_URL and 500s the request. Instead we resolve
  // against request.url — same host as the request — and the adapter then rewrites
  // any same-host Location to a path-only one (getRelativeURL) before it's sent.
  // Verified with `next start` + a spoofed Host header; see __tests__/proxy.test.ts.
  return NextResponse.redirect(new URL(target, request.url), 307);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
