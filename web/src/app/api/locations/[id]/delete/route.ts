import type { NextRequest } from "next/server";
import { deleteLocationOrThrow } from "@/lib/locations/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/locations/[id]/delete">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  await deleteLocationOrThrow(id);
  return ok({ deleted: id });
});
