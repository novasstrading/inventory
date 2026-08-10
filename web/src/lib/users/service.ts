import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { sessions, users } from "@/lib/db/schema";
import { sendUserAddedEmail, sendUserRemovedEmail } from "@/lib/email/brevo";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/auth/errors";

export type UserDTO = {
  id: string;
  email: string;
  role: "admin" | "viewer";
  protected: boolean;
  status: "active" | "revoked";
};

function toDTO(row: typeof users.$inferSelect): UserDTO {
  return { id: row.id, email: row.email, role: row.role, protected: row.protected, status: row.status };
}

export async function listUsers(): Promise<UserDTO[]> {
  const rows = await db.select().from(users).where(eq(users.status, "active")).orderBy(asc(users.email));
  return rows.map(toDTO);
}

export async function addUser(
  email: string,
  role: "admin" | "viewer",
  actor: { email: string; userId: string },
): Promise<UserDTO> {
  const normalized = email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalized) });
  if (existing && existing.status === "active") throw new ConflictError("That email already has access.");

  let id: string;
  const now = new Date();
  if (existing) {
    // Re-adding a previously-revoked email — reactivate the same row (keeps audit history intact).
    id = existing.id;
    await db.update(users).set({ role, status: "active", updatedAt: now }).where(eq(users.id, id));
  } else {
    id = newId();
    await db.insert(users).values({
      id,
      email: normalized,
      role,
      protected: false,
      status: "active",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await sendUserAddedEmail(normalized, role, actor.email).catch((e) => console.error("user-added email failed:", e));
  return toDTO((await db.query.users.findFirst({ where: eq(users.id, id) }))!);
}

/**
 * Soft-revokes access (does not hard-delete the row) — users are referenced by
 * assets.createdBy, transfers.byUserId, audit_log.actorUserId etc., so deleting
 * the row would either violate those foreign keys or destroy audit history.
 * A revoked user simply fails the `status === 'active'` check in lib/auth/otp.ts
 * and lib/auth/session.ts, so they can no longer request codes or use a session.
 */
export async function removeUser(id: string, actorEmail: string): Promise<void> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!existing) throw new NotFoundError("User not found.");
  if (existing.protected) {
    throw new ForbiddenError("That email is a server-defined admin and can't be removed here.");
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ status: "revoked", updatedAt: new Date() }).where(eq(users.id, id));
    await tx.delete(sessions).where(eq(sessions.userId, id));
  });

  await sendUserRemovedEmail(existing.email, actorEmail).catch((e) => console.error("user-removed email failed:", e));
}
