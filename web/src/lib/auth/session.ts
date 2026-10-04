import "server-only";
import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { sessions, users } from "@/lib/db/schema";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "./cookies";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { hasModule, parseModules, type ModuleKey } from "./modules";

export const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null },
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({
    id: newId(),
    tokenHash: hashToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ip ?? null,
  });
  await setSessionCookie(token);
}

export type SessionUser = {
  sessionId: string;
  userId: string;
  email: string;
  role: "admin" | "viewer";
  modules: ModuleKey[];
};

/** The authoritative, DB-backed session check — the real security boundary (plan §5). */
export async function getSession(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      role: users.role,
      modules: users.modules,
      status: users.status,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now() || row.status !== "active") return null;

  return {
    sessionId: row.sessionId,
    userId: row.userId,
    email: row.email,
    role: row.role,
    modules: parseModules(row.modules),
  };
}

/**
 * API-route guard. `module` defaults to "assets" (this app), so every existing
 * route is module-gated for free; pass `null` for identity-only endpoints that
 * must work for any signed-in user (e.g. /api/auth/me, used by the shared door).
 */
export async function requireSession(module: ModuleKey | null = "assets"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Please log in.");
  if (module !== null && !hasModule(session.modules, module)) {
    throw new ForbiddenError("You don't have access to this module.");
  }
  return session;
}

/**
 * For Server Components/layouts (redirects to /login instead of throwing a 401, and
 * to /no-access when signed in without the module instead of throwing a 403).
 */
export async function requirePageSession(module: ModuleKey = "assets"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasModule(session.modules, module)) redirect("/no-access");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "admin") throw new ForbiddenError("This action needs an admin account.");
  return session;
}

/** For Server Components/layouts (redirects non-admins to /assets instead of throwing a 403). */
export async function requirePageAdmin(): Promise<SessionUser> {
  const session = await requirePageSession();
  if (session.role !== "admin") redirect("/assets");
  return session;
}

export async function destroySession(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  await clearSessionCookie();
}

/** Revokes every active session for a user — used when an admin removes their access. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
