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
 * pointing at a deleted employee_id — plan §requirements). By default, any asset
 * still assigned to this employee is auto-returned to Office with a transfer log
 * entry recording why; pass reassignAssetsToOffice:false to leave them assigned
 * (surfaced to admins as "needs reassignment" in the UI) instead.
 */
export async function releaseEmployee(
  id: string,
  opts: { note: string; reassignAssetsToOffice: boolean },
  actor: { userId: string; email: string },
): Promise<{ employee: EmployeeDTO; reassignedCount: number }> {
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (!existing) throw new NotFoundError("Employee not found.");
  if (existing.status === "released") throw new ValidationError("Employee is already released.");

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

    if (opts.reassignAssetsToOffice) {
      const held = await tx.select().from(assets).where(eq(assets.employeeId, id));
      for (const asset of held) {
        await tx.insert(transfers).values({
          id: newId(),
          assetId: asset.id,
          code: asset.code,
          assetName: asset.name,
          fromEmployeeId: id,
          toEmployeeId: null,
          fromLabel: existing.name,
          toLabel: "Office",
          fromLocation: asset.location,
          toLocation: asset.location,
          byUserId: actor.userId,
          byEmail: actor.email,
          notes: `Auto-returned to Office — ${existing.name} was released.`,
          createdAt: now,
        });
        await tx
          .update(assets)
          .set({ employeeId: null, updatedBy: actor.userId, updatedAt: now })
          .where(eq(assets.id, asset.id));
        reassignedCount++;
      }
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
