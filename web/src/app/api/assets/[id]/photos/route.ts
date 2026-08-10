import type { NextRequest } from "next/server";
import { getAssetOrThrow } from "@/lib/assets/service";
import { addPhoto, listPhotos } from "@/lib/assets/attachments";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/auth/errors";
import { encryptFile } from "@/lib/crypto";
import { uploadEncryptedFile } from "@/lib/storage/ftp-client";
import { ALLOWED_PHOTO_EXT, MAX_FILE_BYTES } from "@/lib/storage/constants";
import { extOf, randomFilename, safeSlug } from "@/lib/storage/file-utils";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/photos">) => {
  await requireSession();
  const { id } = await ctx.params;
  const photos = await listPhotos(id);
  return ok({ photos });
});

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/photos">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const asset = await getAssetOrThrow(id);

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) throw new ValidationError("No photo received.");
  if (file.size === 0) throw new ValidationError("The selected file was empty.");
  if (file.size > MAX_FILE_BYTES) throw new ValidationError("Photo is too large (max 10 MB).");
  const ext = extOf(file.name);
  if (!ALLOWED_PHOTO_EXT.includes(ext)) throw new ValidationError("Only image files are allowed.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `assets/${safeSlug(asset.code ?? asset.id)}/${randomFilename(ext)}`;
  await uploadEncryptedFile(key, encryptFile(bytes));

  const photo = await addPhoto(id, {
    storageKey: key,
    originalName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    uploadedBy: session.userId,
  });
  return ok({ photo }, { status: 201 });
});
