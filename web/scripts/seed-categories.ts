/**
 * One-time (idempotent) seed: populates the categories table from the legacy
 * config.php taxonomy. Safe to re-run — existing rows (matched by name) are left
 * alone. Run with: npm run db:seed
 */
import { eq } from "drizzle-orm";
import { CATEGORY_SEED } from "../src/lib/assets/categories-seed";
import { db } from "../src/lib/db/client";
import { newId } from "../src/lib/db/ids";
import { categories } from "../src/lib/db/schema";

async function main() {
  let created = 0;
  let skipped = 0;
  for (const cat of CATEGORY_SEED) {
    const existing = await db.query.categories.findFirst({ where: eq(categories.name, cat.name) });
    if (existing) {
      skipped++;
      continue;
    }
    const now = new Date();
    await db.insert(categories).values({
      id: newId(),
      name: cat.name,
      kind: cat.kind,
      codeTag: cat.codeTag,
      sortOrder: cat.sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }
  console.log(`Categories seeded: ${created} created, ${skipped} already existed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
