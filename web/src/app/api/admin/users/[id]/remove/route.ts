import type { NextRequest } from "next/server";
import { removeUser } from "@/lib/users/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]/remove">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  await removeUser(id, session.email);
  return ok({ removed: id });
});
