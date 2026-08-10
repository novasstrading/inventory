import type { NextRequest } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { verifyCodeSchema } from "@/lib/validation/auth.schema";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = verifyCodeSchema.parse(await request.json());
  const user = await verifyOtp(body.email, body.code);
  await createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip: getClientIp(request),
  });
  return ok({ email: user.email, role: user.role });
});
