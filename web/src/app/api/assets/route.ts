import type { NextRequest } from "next/server";
import { createAsset, listAssets } from "@/lib/assets/service";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { ok, withApiErrors } from "@/lib/http";
import { assetCreateSchema } from "@/lib/validation/asset.schema";

export const runtime = "nodejs";

export const GET = withApiErrors(async () => {
  await requireSession();
  const assets = await listAssets();
  return ok({ assets });
});

export const POST = withApiErrors(async (request: NextRequest) => {
  const session = await requireAdmin();
  const input = assetCreateSchema.parse(await request.json());
  const asset = await createAsset(input, session.userId);
  return ok({ asset }, { status: 201 });
});
