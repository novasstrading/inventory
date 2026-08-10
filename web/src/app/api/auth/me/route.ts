import { requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async () => {
  const session = await requireSession();
  return ok({ email: session.email, role: session.role });
});
