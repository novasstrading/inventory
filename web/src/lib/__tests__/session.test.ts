import { beforeEach, describe, expect, it, vi } from "vitest";

// Light mocks: one fake DB row behind the select().from().innerJoin().where().limit() chain,
// a fixed cookie token, and a redirect() that throws like Next's does.
const state: { row: Record<string, unknown> | null } = { row: null };

vi.mock("@/lib/db/client", () => {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: async () => (state.row ? [state.row] : []),
  };
  return { db: { select: () => chain } };
});
vi.mock("@/lib/auth/cookies", () => ({
  getSessionToken: async () => "token",
  setSessionCookie: async () => {},
  clearSessionCookie: async () => {},
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

function userRow(modules: string, role: "admin" | "viewer" = "viewer") {
  return {
    sessionId: "s1",
    userId: "u1",
    email: "someone@novasstrading.com",
    role,
    modules,
    status: "active",
    expiresAt: new Date(Date.now() + 60_000),
  };
}

beforeEach(() => {
  state.row = null;
});

describe("session module checks", () => {
  it("parses modules onto the session", async () => {
    const { getSession } = await import("../auth/session");
    state.row = userRow("assets,website");
    expect((await getSession())?.modules).toEqual(["website", "assets"]);
  });

  it("requireSession: 401 without a session, 403 without the module, ok with it", async () => {
    const { requireSession } = await import("../auth/session");
    const { ForbiddenError, UnauthorizedError } = await import("../auth/errors");

    await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);

    state.row = userRow("website");
    await expect(requireSession()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requireSession("website")).resolves.toMatchObject({ modules: ["website"] });
    await expect(requireSession(null)).resolves.toMatchObject({ email: "someone@novasstrading.com" });

    state.row = userRow("assets");
    await expect(requireSession()).resolves.toMatchObject({ modules: ["assets"] });
  });

  it("requirePageSession: /login without a session, /no-access without the module", async () => {
    const { requirePageSession } = await import("../auth/session");
    await expect(requirePageSession()).rejects.toThrow("REDIRECT:/login");
    state.row = userRow("website");
    await expect(requirePageSession()).rejects.toThrow("REDIRECT:/no-access");
    state.row = userRow("assets");
    await expect(requirePageSession()).resolves.toMatchObject({ userId: "u1" });
  });

  it("requireAdmin needs both the assets module and the admin role", async () => {
    const { requireAdmin } = await import("../auth/session");
    const { ForbiddenError } = await import("../auth/errors");
    state.row = userRow("website", "admin");
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
    state.row = userRow("assets", "viewer");
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
    state.row = userRow("website,assets", "admin");
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });
});
