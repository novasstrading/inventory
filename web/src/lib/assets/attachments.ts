import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { assetDocuments, assetPhotos } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/auth/errors";

export type PhotoDTO = {
  id: string;
  storageKey: string;
  originalName: string;
  uploadedAt: string;
  deleted: boolean;
};

export type DocumentDTO = PhotoDTO & { docType: "pdf" | "image" };

function toPhotoDTO(row: typeof assetPhotos.$inferSelect): PhotoDTO {
  return {
    id: row.id,
    storageKey: row.storageKey,
    originalName: row.originalName ?? "",
    uploadedAt: row.uploadedAt.toISOString(),
    deleted: row.deleted,
  };
}

function toDocumentDTO(row: typeof assetDocuments.$inferSelect): DocumentDTO {
  return {
    id: row.id,
    storageKey: row.storageKey,
    originalName: row.originalName ?? "",
    uploadedAt: row.uploadedAt.toISOString(),
    deleted: row.deleted,
    docType: row.docType,
  };
}

export async function listPhotos(assetId: string): Promise<PhotoDTO[]> {
  const rows = await db.query.assetPhotos.findMany({
    where: eq(assetPhotos.assetId, assetId),
    orderBy: (p, { desc }) => [desc(p.uploadedAt)],
  });
  return rows.map(toPhotoDTO);
}

export async function addPhoto(
  assetId: string,
  meta: { storageKey: string; originalName: string; contentType: string; sizeBytes: number; uploadedBy: string },
): Promise<PhotoDTO> {
  const id = newId();
  await db.insert(assetPhotos).values({
    id,
    assetId,
    storageKey: meta.storageKey,
    originalName: meta.originalName,
    contentType: meta.contentType,
    sizeBytes: meta.sizeBytes,
    uploadedBy: meta.uploadedBy,
    uploadedAt: new Date(),
    deleted: false,
  });
  const row = await db.query.assetPhotos.findFirst({ where: eq(assetPhotos.id, id) });
  return toPhotoDTO(row!);
}

export async function getPhotoOrThrow(assetId: string, photoId: string) {
  const row = await db.query.assetPhotos.findFirst({
    where: and(eq(assetPhotos.id, photoId), eq(assetPhotos.assetId, assetId)),
  });
  if (!row) throw new NotFoundError("Photo not found.");
  return row;
}

export async function setPhotoDeleted(assetId: string, photoId: string, deleted: boolean): Promise<PhotoDTO> {
  await getPhotoOrThrow(assetId, photoId);
  await db
    .update(assetPhotos)
    .set({ deleted, deletedAt: deleted ? new Date() : null })
    .where(eq(assetPhotos.id, photoId));
  const row = await db.query.assetPhotos.findFirst({ where: eq(assetPhotos.id, photoId) });
  return toPhotoDTO(row!);
}

export async function listDocuments(assetId: string): Promise<DocumentDTO[]> {
  const rows = await db.query.assetDocuments.findMany({
    where: eq(assetDocuments.assetId, assetId),
    orderBy: (d, { desc }) => [desc(d.uploadedAt)],
  });
  return rows.map(toDocumentDTO);
}

export async function addDocument(
  assetId: string,
  meta: {
    storageKey: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    docType: "pdf" | "image";
    uploadedBy: string;
  },
): Promise<DocumentDTO> {
  const id = newId();
  await db.insert(assetDocuments).values({
    id,
    assetId,
    storageKey: meta.storageKey,
    originalName: meta.originalName,
    contentType: meta.contentType,
    sizeBytes: meta.sizeBytes,
    docType: meta.docType,
    uploadedBy: meta.uploadedBy,
    uploadedAt: new Date(),
    deleted: false,
  });
  const row = await db.query.assetDocuments.findFirst({ where: eq(assetDocuments.id, id) });
  return toDocumentDTO(row!);
}

export async function getDocumentOrThrow(assetId: string, docId: string) {
  const row = await db.query.assetDocuments.findFirst({
    where: and(eq(assetDocuments.id, docId), eq(assetDocuments.assetId, assetId)),
  });
  if (!row) throw new NotFoundError("Document not found.");
  return row;
}

export async function setDocumentDeleted(assetId: string, docId: string, deleted: boolean): Promise<DocumentDTO> {
  await getDocumentOrThrow(assetId, docId);
  await db
    .update(assetDocuments)
    .set({ deleted, deletedAt: deleted ? new Date() : null })
    .where(eq(assetDocuments.id, docId));
  const row = await db.query.assetDocuments.findFirst({ where: eq(assetDocuments.id, docId) });
  return toDocumentDTO(row!);
}
