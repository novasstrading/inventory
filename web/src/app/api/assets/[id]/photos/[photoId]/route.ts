import type { NextRequest } from "next/server";
import { getPhotoOrThrow } from "@/lib/assets/attachments";
import { requireSession } from "@/lib/auth/session";
import { decryptFile } from "@/lib/crypto";
import { downloadEncryptedFile } from "@/lib/storage/ftp-client";
import { MIME_BY_EXT } from "@/lib/storage/constants";
import { extOf } from "@/lib/storage/file-utils";
import { withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

// Authenticated proxy — never a public URL.
export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/photos/[photoId]">) => {
  await requireSession();
  const { id, photoId } = await ctx.params;
  const photo = await getPhotoOrThrow(id, photoId);
  const encrypted = await downloadEncryptedFile(photo.storageKey);
  const bytes = decryptFile(encrypted);
  const ext = extOf(photo.storageKey);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(photo.originalName ?? "photo").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
});
