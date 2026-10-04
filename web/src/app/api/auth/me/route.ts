import { requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

// Identity-only: the shared /admin door calls this for ANY signed-in user, so no module gate.
export const GET = withApiErrors(async () => {
  const session = await requireSession(null);
  return ok({ email: session.email, role: session.role, modules: session.modules });
});
