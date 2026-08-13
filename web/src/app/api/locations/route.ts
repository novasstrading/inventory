import type { NextRequest } from "next/server";
import { createLocation, listLocations } from "@/lib/locations/service";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { locationCreateSchema } from "@/lib/validation/location.schema";
import { ok, withApiErrors } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withApiErrors(async () => {
  await requireSession();
  const locations = await listLocations();
  return ok({ locations });
});

export const POST = withApiErrors(async (request: NextRequest) => {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const input = locationCreateSchema.parse(body);
  const location = await createLocation(input.name);
  return ok({ location }, { status: 201 });
});
