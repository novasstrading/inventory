import type { NextRequest } from "next/server";
import { listTransfersForAsset } from "@/lib/assets/service";
import { requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/assets/[id]/transfers">) => {
  await requireSession();
  const { id } = await ctx.params;
  const transfers = await listTransfersForAsset(id);
  return ok({ transfers });
});
