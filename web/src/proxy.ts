import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic, cookie-presence-only redirect (Next.js 16 renamed Middleware to
 * Proxy — functionality is the same). This is a UX nicety, NOT the security
 * boundary: every Route Handler still calls requireSession()/requireAdmin()
 * for the authoritative, DB-backed check (plan §5).
 */

const PUBLIC_PATHS = ["/login", "/copy"];

export function proxy(request: NextRequest) {
  const { pathname, basePath } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // `new URL('/x', request.url)` replaces the whole path, dropping any basePath the
  // app is mounted under (e.g. via Next.js Multi-Zones) — must re-prepend it explicitly.
  const to = (path: string) => new URL(`${basePath}${path}`, request.url);

  if (pathname === "/") {
    return NextResponse.redirect(to(hasSession ? "/assets" : "/login"));
  }
  if (!isPublic && !hasSession) {
    return NextResponse.redirect(to("/login"));
  }
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(to("/assets"));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
