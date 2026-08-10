import type { NextRequest } from "next/server";
import { transferAsset } from "@/lib/assets/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { assetTransferSchema } from "@/lib/validation/asset.schema";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/transfer">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = assetTransferSchema.parse({ ...body, id });
  const { asset, transfer } = await transferAsset(input, { userId: session.userId, email: session.email });
  return ok({ asset, transfer });
});
