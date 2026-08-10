import type { NextRequest } from "next/server";
import { setAssetRemoved } from "@/lib/assets/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { assetRemoveSchema } from "@/lib/validation/asset.schema";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/remove">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const { restore } = assetRemoveSchema.parse({ ...body, id });
  const asset = await setAssetRemoved(id, restore, session.userId);
  return ok({ asset });
});
