import type { NextRequest } from "next/server";
import { releaseEmployee } from "@/lib/employees/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { employeeReleaseSchema } from "@/lib/validation/employee.schema";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request: NextRequest, ctx: RouteContext<"/api/employees/[id]/release">) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const input = employeeReleaseSchema.parse({ ...body, id });
  const { employee, reassignedCount } = await releaseEmployee(
    id,
    { note: input.note, reassignments: input.reassignments },
    { userId: session.userId, email: session.email },
  );
  return ok({ employee, reassignedCount });
});
