import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decryptField, encryptField } from "@/lib/crypto";
import { newId } from "@/lib/db/ids";
import { assets, categories, employees, transfers } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "@/lib/auth/errors";
import type { AssetCreateInput, AssetTransferInput, AssetUpdateInput } from "@/lib/validation/asset.schema";
import { nextCode } from "./codes";

export type AssetDTO = {
  id: string;
  code: string | null;
  type: "hardware" | "software";
  category: string;
  name: string;
  brandModel: string;
  serial: string;
  specs: string;
  vendor: string;
  purchaseDate: string;
  valueAmount: string;
  valueCurrency: "BDT" | "USD";
  valueType: "one_time" | "monthly" | "yearly";
  employeeId: string | null;
  location: string;
  status: "active" | "removed";
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type AssetRow = typeof assets.$inferSelect & { category?: typeof categories.$inferSelect | null };

function toDTO(row: AssetRow): AssetDTO {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    category: row.category?.name ?? "",
    name: row.name,
    brandModel: row.brandModel ?? "",
    serial: row.serial ?? "",
    specs: row.specs ?? "",
    vendor: row.vendor ?? "",
    purchaseDate: row.purchaseDate ?? "",
    valueAmount: row.valueAmount ?? "",
    valueCurrency: row.valueCurrency,
    valueType: row.valueType,
    employeeId: row.employeeId,
    location: row.location ?? "",
    status: row.status,
    notes: decryptField(row.notesEnc),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAssets(): Promise<AssetDTO[]> {
  // Small internal-tool data volume (hundreds, not millions of rows) — the whole set is
  // returned and the client owns search/filter/pagination, same as the legacy app.
  const rows = await db.query.assets.findMany({
    with: { category: true },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });
  return rows.map(toDTO);
}

export async function getAssetOrThrow(id: string): Promise<AssetDTO> {
  const row = await db.query.assets.findFirst({ where: eq(assets.id, id), with: { category: true } });
  if (!row) throw new NotFoundError("Asset not found.");
  return toDTO(row);
}

export async function createAsset(input: AssetCreateInput, actorUserId: string): Promise<AssetDTO> {
  const category = await db.query.categories.findFirst({ where: eq(categories.name, input.category) });
  if (!category || !category.isActive) throw new ValidationError("Pick a valid category.");
  if (category.kind === "hardware" && !category.codeTag) {
    throw new ValidationError("This category has no code tag configured.");
  }

  const id = newId();
  const now = new Date();

  const code = await db.transaction(async (tx) => {
    const tag = category.kind === "hardware" ? await nextCode(tx, category.codeTag!) : null;
    await tx.insert(assets).values({
      id,
      code: tag,
      type: category.kind,
      categoryId: category.id,
      name: input.name,
      brandModel: input.brandModel || null,
      serial: input.serial || null,
      specs: input.specs || null,
      vendor: input.vendor || null,
      purchaseDate: input.purchaseDate || null,
      valueAmount: input.valueAmount || null,
      valueCurrency: input.valueCurrency,
      valueType: input.valueType,
      employeeId: input.employeeId || null,
      location: input.location || null,
      status: "active",
      notesEnc: input.notes ? encryptField(input.notes) : null,
      createdBy: actorUserId,
      updatedBy: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    return tag;
  });

  return toDTO({
    id,
    legacyId: null,
    code,
    type: category.kind,
    categoryId: category.id,
    name: input.name,
    brandModel: input.brandModel || null,
    serial: input.serial || null,
    specs: input.specs || null,
    vendor: input.vendor || null,
    purchaseDate: input.purchaseDate || null,
    valueAmount: input.valueAmount || null,
    valueCurrency: input.valueCurrency,
    valueType: input.valueType,
    employeeId: input.employeeId || null,
    location: input.location || null,
    status: "active",
    notesEnc: input.notes ? encryptField(input.notes) : null,
    createdBy: actorUserId,
    updatedBy: actorUserId,
    createdAt: now,
    updatedAt: now,
    category,
  });
}

export async function updateAsset(input: AssetUpdateInput, actorUserId: string): Promise<AssetDTO> {
  const existing = await db.query.assets.findFirst({ where: eq(assets.id, input.id) });
  if (!existing) throw new NotFoundError("Asset not found.");

  const patch: Partial<typeof assets.$inferInsert> = { updatedBy: actorUserId, updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.brandModel !== undefined) patch.brandModel = input.brandModel || null;
  if (input.serial !== undefined) patch.serial = input.serial || null;
  if (input.specs !== undefined) patch.specs = input.specs || null;
  if (input.vendor !== undefined) patch.vendor = input.vendor || null;
  if (input.purchaseDate !== undefined) patch.purchaseDate = input.purchaseDate || null;
  if (input.valueAmount !== undefined) patch.valueAmount = input.valueAmount || null;
  if (input.valueCurrency !== undefined) patch.valueCurrency = input.valueCurrency;
  if (input.valueType !== undefined) patch.valueType = input.valueType;
  if (input.employeeId !== undefined) patch.employeeId = input.employeeId || null;
  if (input.location !== undefined) patch.location = input.location || null;
  if (input.notes !== undefined) patch.notesEnc = input.notes ? encryptField(input.notes) : null;

  await db.update(assets).set(patch).where(eq(assets.id, input.id));
  return getAssetOrThrow(input.id);
}

export async function setAssetRemoved(id: string, restore: boolean, actorUserId: string): Promise<AssetDTO> {
  const existing = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  if (!existing) throw new NotFoundError("Asset not found.");
  await db
    .update(assets)
    .set({ status: restore ? "active" : "removed", updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(assets.id, id));
  return getAssetOrThrow(id);
}

export type TransferDTO = {
  id: string;
  assetId: string;
  code: string | null;
  assetName: string;
  fromLabel: string;
  toLabel: string;
  fromLocation: string;
  toLocation: string;
  byEmail: string;
  notes: string;
  createdAt: string;
};

function toTransferDTO(row: typeof transfers.$inferSelect): TransferDTO {
  return {
    id: row.id,
    assetId: row.assetId,
    code: row.code,
    assetName: row.assetName,
    fromLabel: row.fromLabel,
    toLabel: row.toLabel,
    fromLocation: row.fromLocation ?? "",
    toLocation: row.toLocation ?? "",
    byEmail: row.byEmail,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTransfersForAsset(assetId: string): Promise<TransferDTO[]> {
  const rows = await db.query.transfers.findMany({
    where: eq(transfers.assetId, assetId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return rows.map(toTransferDTO);
}

async function holderLabel(employeeId: string | null): Promise<string> {
  if (!employeeId) return "Office";
  const e = await db.query.employees.findFirst({ where: eq(employees.id, employeeId) });
  return e?.name ?? "Office";
}

export async function transferAsset(
  input: AssetTransferInput,
  actor: { userId: string; email: string },
): Promise<{ asset: AssetDTO; transfer: TransferDTO }> {
  const existing = await db.query.assets.findFirst({ where: eq(assets.id, input.id) });
  if (!existing) throw new NotFoundError("Asset not found.");

  const toEmployeeId = input.employeeId || null;
  const [fromLabel, toLabel] = await Promise.all([holderLabel(existing.employeeId), holderLabel(toEmployeeId)]);

  const now = new Date();
  const transferId = newId();
  const toLocation = input.toLocation || existing.location;

  await db.transaction(async (tx) => {
    await tx.insert(transfers).values({
      id: transferId,
      assetId: existing.id,
      code: existing.code,
      assetName: existing.name,
      fromEmployeeId: existing.employeeId,
      toEmployeeId,
      fromLabel,
      toLabel,
      fromLocation: existing.location,
      toLocation: toLocation || null,
      byUserId: actor.userId,
      byEmail: actor.email,
      notes: input.notes || null,
      createdAt: now,
    });
    await tx
      .update(assets)
      .set({ employeeId: toEmployeeId, location: toLocation || null, updatedBy: actor.userId, updatedAt: now })
      .where(eq(assets.id, existing.id));
  });

  const [asset, transfer] = await Promise.all([
    getAssetOrThrow(existing.id),
    db.query.transfers.findFirst({ where: eq(transfers.id, transferId) }).then((t) => toTransferDTO(t!)),
  ]);
  return { asset, transfer };
}
