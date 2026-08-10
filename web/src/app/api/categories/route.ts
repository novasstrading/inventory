import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { ok, withApiErrors } from "@/lib/http";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export const GET = withApiErrors(async () => {
  await requireSession();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));
  return ok({
    categories: rows.map((c) => ({ name: c.name, kind: c.kind, codeTag: c.codeTag })),
  });
});
