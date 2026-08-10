import type { NextRequest } from "next/server";
import { reinstateEmployee } from "@/lib/employees/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/employees/[id]/reinstate">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const employee = await reinstateEmployee(id);
  return ok({ employee });
});
