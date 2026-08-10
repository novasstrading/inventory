import type { NextRequest } from "next/server";
import { createEmployee, listEmployees } from "@/lib/employees/service";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { employeeCreateSchema } from "@/lib/validation/employee.schema";

export const runtime = "nodejs";

export const GET = withApiErrors(async () => {
  await requireSession();
  const employees = await listEmployees();
  return ok({ employees });
});

export const POST = withApiErrors(async (request: NextRequest) => {
  await requireAdmin();
  const input = employeeCreateSchema.parse(await request.json());
  const employee = await createEmployee(input);
  return ok({ employee }, { status: 201 });
});
