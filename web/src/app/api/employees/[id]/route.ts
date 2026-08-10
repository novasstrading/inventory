import type { NextRequest } from "next/server";
import { getEmployeeOrThrow, updateEmployee } from "@/lib/employees/service";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { employeeUpdateSchema } from "@/lib/validation/employee.schema";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/employees/[id]">) => {
  await requireSession();
  const { id } = await ctx.params;
  const employee = await getEmployeeOrThrow(id);
  return ok({ employee });
});

export const PATCH = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/employees/[id]">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = employeeUpdateSchema.parse({ ...body, id });
  const employee = await updateEmployee(input);
  return ok({ employee });
});
