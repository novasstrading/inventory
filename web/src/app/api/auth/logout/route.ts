import { destroySession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withApiErrors(async () => {
  await destroySession();
  return ok({ loggedOut: true });
});
