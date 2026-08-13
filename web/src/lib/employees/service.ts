import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decryptField, encryptField } from "@/lib/crypto";
import { newId } from "@/lib/db/ids";
import { assets, employees, transfers } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "@/lib/auth/errors";
import type { EmployeeCreateInput, EmployeeUpdateInput } from "@/lib/validation/employee.schema";

export type EmployeeDTO = {
  id: string;
  name: string;
  designation: string;
  contact: string;
  email: string;
  photoKey: string | null;
  status: "active" | "released";
  releasedAt: string | null;
  releasedNote: string;
  createdAt: string;
  updatedAt: string;
};

function toDTO(row: typeof employees.$inferSelect): EmployeeDTO {
  return {
    id: row.id,
    name: row.name,
    designation: row.designation ?? "",
    contact: decryptField(row.contactEnc),
    email: decryptField(row.emailEnc),
    photoKey: row.photoKey,
    status: row.status,
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    releasedNote: row.releasedNote ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listEmployees(): Promise<EmployeeDTO[]> {
  const rows = await db.query.employees.findMany({ orderBy: (e, { asc }) => [asc(e.name)] });
  return rows.map(toDTO);
}

export async function getEmployeeOrThrow(id: string): Promise<EmployeeDTO> {
  const row = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!row) throw new NotFoundError("Employee not found.");
  return toDTO(row);
}

export async function createEmployee(input: EmployeeCreateInput): Promise<EmployeeDTO> {
  const id = newId();
  const now = new Date();
  await db.insert(employees).values({
    id,
    name: input.name,
    designation: input.designation || null,
    contactEnc: input.contact ? encryptField(input.contact) : null,
    emailEnc: input.email ? encryptField(input.email) : null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return getEmployeeOrThrow(id);
}

export async function updateEmployee(input: EmployeeUpdateInput): Promise<EmployeeDTO> {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, input.id) });
  if (!existing) throw new NotFoundError("Employee not found.");

  const patch: Partial<typeof employees.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.designation !== undefined) patch.designation = input.designation || null;
  if (input.contact !== undefined) patch.contactEnc = input.contact ? encryptField(input.contact) : null;
  if (input.email !== undefined) patch.emailEnc = input.email ? encryptField(input.email) : null;

  await db.update(employees).set(patch).where(eq(employees.id, input.id));
  return getEmployeeOrThrow(input.id);
}

export async function setEmployeePhotoKey(id: string, photoKey: string | null): Promise<EmployeeDTO> {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!existing) throw new NotFoundError("Employee not found.");
  await db.update(employees).set({ photoKey, updatedAt: new Date() }).where(eq(employees.id, id));
  return getEmployeeOrThrow(id);
}

/**
 * Soft-release (fixes the legacy hard-delete bug that silently orphaned assets
 * pointing at a deleted employee_id — plan §requirements). Every asset
 * currently assigned to this employee must be resolved — to Office
 * (employeeId: "") or to another active employee — via `reassignments`, one
 * entry per held asset. The server re-checks who's actually held right now
 * rather than trusting the client's snapshot, so a stale dialog (e.g. an
 * asset assigned to them after the release dialog was opened) fails loudly
 * instead of silently orphaning an asset on a released employee.
 */
export async function releaseEmployee(
  id: string,
  opts: { note: string; reassignments: Array<{ assetId: string; employeeId: string }> },
  actor: { userId: string; email: string },
): Promise<{ employee: EmployeeDTO; reassignedCount: number }> {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!existing) throw new NotFoundError("Employee not found.");
  if (existing.status === "released") throw new ValidationError("Employee is already released.");

  const held = await db.select().from(assets).where(eq(assets.employeeId, id));
  const heldIds = new Set(held.map((a) => a.id));
  const resolvedIds = new Set(opts.reassignments.map((r) => r.assetId));
  if (heldIds.size !== resolvedIds.size || [...heldIds].some((hid) => !resolvedIds.has(hid))) {
    throw new ValidationError(
      "The list of currently held assets has changed — reopen the release dialog and try again.",
    );
  }

  const now = new Date();
  let reassignedCount = 0;

  await db.transaction(async (tx) => {
    await tx
      .update(employees)
      .set({
        status: "released",
        releasedAt: now,
        releasedBy: actor.userId,
        releasedNote: opts.note || null,
        updatedAt: now,
      })
      .where(eq(employees.id, id));

    for (const asset of held) {
      const reassignment = opts.reassignments.find((r) => r.assetId === asset.id)!;
      const toEmployeeId = reassignment.employeeId || null;
      const toLabel = toEmployeeId
        ? ((await tx.query.employees.findFirst({ where: eq(employees.id, toEmployeeId) }))?.name ?? "Office")
        : "Office";

      await tx.insert(transfers).values({
        id: newId(),
        assetId: asset.id,
        code: asset.code,
        assetName: asset.name,
        fromEmployeeId: id,
        toEmployeeId,
        fromLabel: existing.name,
        toLabel,
        fromLocation: asset.location,
        toLocation: asset.location,
        byUserId: actor.userId,
        byEmail: actor.email,
        notes: `Reassigned to ${toLabel} — ${existing.name} was released.`,
        createdAt: now,
      });
      await tx
        .update(assets)
        .set({ employeeId: toEmployeeId, updatedBy: actor.userId, updatedAt: now })
        .where(eq(assets.id, asset.id));
      reassignedCount++;
    }
  });

  return { employee: await getEmployeeOrThrow(id), reassignedCount };
}

export async function reinstateEmployee(id: string): Promise<EmployeeDTO> {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!existing) throw new NotFoundError("Employee not found.");
  await db
    .update(employees)
    .set({ status: "active", releasedAt: null, releasedBy: null, releasedNote: null, updatedAt: new Date() })
    .where(eq(employees.id, id));
  return getEmployeeOrThrow(id);
}

/** How many active assets this employee currently holds — used to warn admins before releasing. */
export async function countHeldAssets(employeeId: string): Promise<number> {
  const rows = await db.select({ id: assets.id }).from(assets).where(eq(assets.employeeId, employeeId));
  return rows.length;
}
