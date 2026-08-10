import type { NextRequest } from "next/server";
import { addUser, listUsers } from "@/lib/users/service";
import { requireAdmin } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { userAddSchema } from "@/lib/validation/user.schema";

export const runtime = "nodejs";

export const GET = withApiErrors(async () => {
  await requireAdmin();
  const users = await listUsers();
  return ok({ users });
});

export const POST = withApiErrors(async (request: NextRequest) => {
  const session = await requireAdmin();
  const input = userAddSchema.parse(await request.json());
  const user = await addUser(input.email, input.role, { email: session.email, userId: session.userId });
  return ok({ user }, { status: 201 });
});
