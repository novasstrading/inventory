import type { NextRequest } from "next/server";
import { createSticker, listStickers } from "@/lib/assets/stickers";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/auth/errors";
import { encryptFile } from "@/lib/crypto";
import { uploadEncryptedFile } from "@/lib/storage/ftp-client";
import { MAX_FILE_BYTES } from "@/lib/storage/constants";
import { randomFilename, safeSlug } from "@/lib/storage/file-utils";
import { getAssetOrThrow } from "@/lib/assets/service";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/stickers">) => {
  await requireSession();
  const { id } = await ctx.params;
  const stickers = await listStickers(id);
  return ok({ stickers });
});

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/stickers">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const asset = await getAssetOrThrow(id);

  const form = await request.formData();
  const label = String(form.get("label") ?? "").trim();
  const file = form.get("png");
  if (!label) throw new ValidationError("Enter a label for this sticker (e.g. Laptop, Box, Charger).");
  if (!(file instanceof File)) throw new ValidationError("No sticker image received.");
  if (file.size === 0) throw new ValidationError("The generated image was empty — please try again.");
  if (file.size > MAX_FILE_BYTES) throw new ValidationError("Sticker image too large.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `stickers/${safeSlug(asset.code ?? asset.id)}/${randomFilename("png")}`;
  await uploadEncryptedFile(key, encryptFile(bytes));

  const sticker = await createSticker(id, label, key, session.userId);
  return ok({ sticker }, { status: 201 });
});
