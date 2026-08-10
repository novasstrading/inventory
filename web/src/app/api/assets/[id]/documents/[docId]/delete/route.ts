import type { NextRequest } from "next/server";
import { setDocumentDeleted } from "@/lib/assets/attachments";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({ restore: z.boolean().optional().default(false) });

export const POST = withApiErrors(
  async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/documents/[docId]/delete">) => {
    await requireAdmin();
    const { id, docId } = await ctx.params;
    const { restore } = bodySchema.parse(await request.json().catch(() => ({})));
    const doc = await setDocumentDeleted(id, docId, !restore);
    return ok({ doc });
  },
);
