import type { NextRequest } from "next/server";
import { setUserModules } from "@/lib/users/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { userModulesSchema } from "@/lib/validation/user.schema";

export const runtime = "nodejs";

export const PATCH = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/admin/users/[id]/modules">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const input = userModulesSchema.parse(await request.json());
  const user = await setUserModules(id, input.modules, session.email);
  return ok({ user });
});
