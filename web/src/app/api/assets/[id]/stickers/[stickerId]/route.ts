import type { NextRequest } from "next/server";
import { getStickerOrThrow } from "@/lib/assets/stickers";
import { requireSession } from "@/lib/auth/session";
import { decryptFile } from "@/lib/crypto";
import { downloadEncryptedFile } from "@/lib/storage/ftp-client";
import { withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/stickers/[stickerId]">) => {
  await requireSession();
  const { id, stickerId } = await ctx.params;
  const sticker = await getStickerOrThrow(id, stickerId);
  const encrypted = await downloadEncryptedFile(sticker.storageKey);
  const bytes = decryptFile(encrypted);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${sticker.label.replace(/[^A-Za-z0-9_-]/g, "_")}.png"`,
      "Cache-Control": "private, max-age=60",
    },
  });
});
