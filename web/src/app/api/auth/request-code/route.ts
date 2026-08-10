import type { NextRequest } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { ok, withApiErrors } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { requestCodeSchema } from "@/lib/validation/auth.schema";

export const runtime = "nodejs";

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = requestCodeSchema.parse(await request.json());
  await requestOtp(body.email, getClientIp(request));
  // Always the same message regardless of whether the email is authorized — no user enumeration.
  return ok({ message: "If that email is authorized, a login code is on its way." });
});
