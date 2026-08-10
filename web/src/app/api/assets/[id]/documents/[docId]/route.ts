import type { NextRequest } from "next/server";
import { getDocumentOrThrow } from "@/lib/assets/attachments";
import { requireSession } from "@/lib/auth/session";
import { decryptFile } from "@/lib/crypto";
import { downloadEncryptedFile } from "@/lib/storage/ftp-client";
import { MIME_BY_EXT } from "@/lib/storage/constants";
import { extOf } from "@/lib/storage/file-utils";
import { withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/documents/[docId]">) => {
  await requireSession();
  const { id, docId } = await ctx.params;
  const doc = await getDocumentOrThrow(id, docId);
  const encrypted = await downloadEncryptedFile(doc.storageKey);
  const bytes = decryptFile(encrypted);
  const ext = extOf(doc.storageKey);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(doc.originalName ?? "document").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
});
