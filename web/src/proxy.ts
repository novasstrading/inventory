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
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/assets" : "/login", request.url));
  }
  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/assets", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
