import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { stickers } from "@/lib/db/schema";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/auth/errors";
import { getAssetOrThrow } from "./service";

export type StickerDTO = {
  id: string;
  label: string;
  storageKey: string;
  createdAt: string;
};

function toDTO(row: typeof stickers.$inferSelect): StickerDTO {
  return { id: row.id, label: row.label, storageKey: row.storageKey, createdAt: row.createdAt.toISOString() };
}

export function labelSlug(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "label";
}

export async function listStickers(assetId: string): Promise<StickerDTO[]> {
  const rows = await db.query.stickers.findMany({
    where: eq(stickers.assetId, assetId),
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });
  return rows.map(toDTO);
}

export async function getStickerOrThrow(assetId: string, stickerId: string) {
  const row = await db.query.stickers.findFirst({
    where: and(eq(stickers.id, stickerId), eq(stickers.assetId, assetId)),
  });
  if (!row) throw new NotFoundError("Sticker not found.");
  return row;
}

/**
 * Registers a sticker as permanently generated for (asset, label). One physical label
 * per pair, ever — the unique index on (asset_id, label_slug) is the real enforcement;
 * this also does a friendly pre-check so the error message names the clashing label.
 */
export async function createSticker(
  assetId: string,
  label: string,
  storageKey: string,
  createdBy: string,
): Promise<StickerDTO> {
  const asset = await getAssetOrThrow(assetId);
  if (!asset.code) throw new ValidationError("This item has no sticker code (software items are not stickered).");

  const slug = labelSlug(label);
  const existing = await db.query.stickers.findFirst({
    where: and(eq(stickers.assetId, assetId), eq(stickers.labelSlug, slug)),
  });
  if (existing) {
    throw new ConflictError(
      `A sticker labeled "${existing.label}" already exists for this item. Downloaded stickers are never regenerated — pick a different label (e.g. Box, Charger) for another copy.`,
    );
  }

  const id = newId();
  await db.insert(stickers).values({
    id,
    assetId,
    label,
    labelSlug: slug,
    storageKey,
    createdBy,
    createdAt: new Date(),
  });
  const row = await db.query.stickers.findFirst({ where: eq(stickers.id, id) });
  return toDTO(row!);
}
