import type { NextRequest } from "next/server";
import { getAssetOrThrow, updateAsset } from "@/lib/assets/service";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { assetUpdateSchema } from "@/lib/validation/asset.schema";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]">) => {
  await requireSession();
  const { id } = await ctx.params;
  const asset = await getAssetOrThrow(id);
  return ok({ asset });
});

export const PATCH = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = assetUpdateSchema.parse({ ...body, id });
  const asset = await updateAsset(input, session.userId);
  return ok({ asset });
});
