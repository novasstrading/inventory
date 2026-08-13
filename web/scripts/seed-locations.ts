/**
 * One-off seed of the initial location suggestion list.
 * Usage: npx tsx --tsconfig scripts/tsconfig.json --env-file=.env.prod-migrate.local scripts/seed-locations.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { newId } from "../src/lib/db/ids";
import { locations } from "../src/lib/db/schema";

const NAMES = ["Head Office, Baridhara DOHS"];

async function main() {
  let created = 0;
  for (const name of NAMES) {
    const existing = await db.query.locations.findFirst({ where: eq(locations.name, name) });
    if (existing) continue;
    const now = new Date();
    await db.insert(locations).values({ id: newId(), name, createdAt: now, updatedAt: now });
    created++;
  }
  console.log(`Locations seeded: ${created} created.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
