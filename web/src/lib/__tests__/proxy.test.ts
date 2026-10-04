import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
// The exact helper Next's proxy adapter uses to turn a same-host Location into a
// path-only one before the response leaves the server (next/dist/server/web/adapter.js).
import { getRelativeURL } from "next/dist/shared/lib/router/utils/relativize-url";
import { proxy } from "../../proxy";

const BASE = "/admin/inventory";
// Deliberately a different host than the public one — the browser must never see it.
const DEPLOY = "https://nova-inventory.vercel.app";

function req(path: string, { session = false, basePath = "" } = {}) {
  const r = new NextRequest(`${DEPLOY}${basePath}${path}`, basePath ? { nextConfig: { basePath } } : undefined);
  if (session) r.cookies.set("nova_session", "tok");
  return r;
}

/**
 * The Location the browser ends up with: what proxy() returns, relativised the
 * way Next's adapter does. Also asserts proxy() resolved against the request's
 * own host — the precondition for the adapter to relativise it at all.
 */
function location(request: NextRequest): string | null {
  const res = proxy(request);
  const raw = res.headers.get("location");
  if (!raw) return null;
  expect(res.status).toBe(307);
  expect(new URL(raw).host).toBe(new URL(request.url).host);
  const rel = getRelativeURL(raw, request.url);
  expect(rel.startsWith("/")).toBe(true);
  expect(rel).not.toContain("vercel.app");
  return rel;
}

function passesThrough(request: NextRequest) {
  const res = proxy(request);
  return res.headers.get("x-middleware-next") === "1" && !res.headers.get("location");
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL;
});

describe("proxy — standalone (no basePath, no admin login URL)", () => {
  it("sends / to /login or /assets", () => {
    expect(location(req("/"))).toBe("/login");
    expect(location(req("/", { session: true }))).toBe("/assets");
  });

  it("redirects unauthenticated private pages to /login", () => {
    expect(location(req("/assets"))).toBe("/login");
    expect(location(req("/admin/access"))).toBe("/login");
  });

  it("lets signed-in users through, and bounces them off /login", () => {
    expect(passesThrough(req("/assets", { session: true }))).toBe(true);
    expect(location(req("/login", { session: true }))).toBe("/assets");
  });

  it("leaves public paths alone", () => {
    expect(passesThrough(req("/login"))).toBe(true);
    expect(passesThrough(req("/copy"))).toBe(true);
    expect(passesThrough(req("/no-access"))).toBe(true);
    expect(passesThrough(req("/no-access", { session: true }))).toBe(true);
  });
});

describe("proxy — mounted under basePath, no admin login URL", () => {
  it("prefixes basePath on every redirect", () => {
    expect(location(req("/", { basePath: BASE }))).toBe(`${BASE}/login`);
    expect(location(req("/", { basePath: BASE, session: true }))).toBe(`${BASE}/assets`);
    expect(location(req("/employees", { basePath: BASE }))).toBe(`${BASE}/login`);
    expect(location(req("/login", { basePath: BASE, session: true }))).toBe(`${BASE}/assets`);
    expect(passesThrough(req("/login", { basePath: BASE }))).toBe(true);
  });
});

describe("proxy — mounted behind the shared /admin door", () => {
  it("hands unauthenticated visits to the admin login, without basePath", () => {
    process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL = "/admin/login";
    expect(location(req("/assets", { basePath: BASE }))).toBe("/admin/login");
    expect(location(req("/", { basePath: BASE }))).toBe("/admin/login");
  });

  it("redirects any visit to this app's own /login to the admin login", () => {
    process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL = "/admin/login";
    expect(location(req("/login", { basePath: BASE }))).toBe("/admin/login");
    expect(location(req("/login", { basePath: BASE, session: true }))).toBe("/admin/login");
  });

  it("still sends signed-in visitors of / to this app's assets page", () => {
    process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL = "/admin/login";
    expect(location(req("/", { basePath: BASE, session: true }))).toBe(`${BASE}/assets`);
    expect(passesThrough(req("/assets", { basePath: BASE, session: true }))).toBe(true);
  });

  it("keeps /copy and /no-access public", () => {
    process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL = "/admin/login";
    expect(passesThrough(req("/copy", { basePath: BASE }))).toBe(true);
    expect(passesThrough(req("/no-access", { basePath: BASE, session: true }))).toBe(true);
  });
});
