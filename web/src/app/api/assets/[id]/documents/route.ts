import type { NextRequest } from "next/server";
import { getAssetOrThrow } from "@/lib/assets/service";
import { addDocument, listDocuments } from "@/lib/assets/attachments";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/auth/errors";
import { encryptFile } from "@/lib/crypto";
import { uploadEncryptedFile } from "@/lib/storage/ftp-client";
import { ALLOWED_DOC_EXT, MAX_FILE_BYTES } from "@/lib/storage/constants";
import { extOf, randomFilename, safeSlug } from "@/lib/storage/file-utils";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/documents">) => {
  await requireSession();
  const { id } = await ctx.params;
  const documents = await listDocuments(id);
  return ok({ documents });
});

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/documents">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const asset = await getAssetOrThrow(id);

  const form = await request.formData();
  const file = form.get("doc");
  if (!(file instanceof File)) throw new ValidationError("No file received.");
  if (file.size === 0) throw new ValidationError("The selected file was empty.");
  if (file.size > MAX_FILE_BYTES) throw new ValidationError("File too large (max 10 MB).");
  const ext = extOf(file.name);
  if (!ALLOWED_DOC_EXT.includes(ext)) throw new ValidationError("Only PDF, JPG, PNG, WEBP files are allowed.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `assets/${safeSlug(asset.code ?? asset.id)}_docs/${randomFilename(ext)}`;
  await uploadEncryptedFile(key, encryptFile(bytes));

  const doc = await addDocument(id, {
    storageKey: key,
    originalName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    docType: ext === "pdf" ? "pdf" : "image",
    uploadedBy: session.userId,
  });
  return ok({ doc }, { status: 201 });
});
