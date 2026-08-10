import type { NextRequest } from "next/server";
import { getEmployeeOrThrow, setEmployeePhotoKey } from "@/lib/employees/service";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/auth/errors";
import { decryptFile, encryptFile } from "@/lib/crypto";
import { deleteEncryptedFile, downloadEncryptedFile, uploadEncryptedFile } from "@/lib/storage/ftp-client";
import { ALLOWED_PHOTO_EXT, MAX_FILE_BYTES, MIME_BY_EXT } from "@/lib/storage/constants";
import { extOf, randomFilename, safeSlug } from "@/lib/storage/file-utils";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/employees/[id]/photo">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const existing = await getEmployeeOrThrow(id);

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) throw new ValidationError("No photo received.");
  if (file.size === 0) throw new ValidationError("The selected file was empty.");
  if (file.size > MAX_FILE_BYTES) throw new ValidationError("Photo is too large (max 10 MB).");
  const ext = extOf(file.name);
  if (!ALLOWED_PHOTO_EXT.includes(ext)) throw new ValidationError("Only image files are allowed.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `employees/${safeSlug(id)}/${randomFilename(ext)}`;
  await uploadEncryptedFile(key, encryptFile(bytes));

  if (existing.photoKey) await deleteEncryptedFile(existing.photoKey).catch(() => undefined);
  await setEmployeePhotoKey(id, key);
  return ok({ photoKey: key });
});

// Authenticated proxy — never a public URL, so a photo can't be scraped without a session.
export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/employees/[id]/photo">) => {
  await requireSession();
  const { id } = await ctx.params;
  const employee = await getEmployeeOrThrow(id);
  if (!employee.photoKey) throw new NotFoundError("No photo.");
  const encrypted = await downloadEncryptedFile(employee.photoKey);
  const bytes = decryptFile(encrypted);
  const ext = extOf(employee.photoKey);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=60" },
  });
});
