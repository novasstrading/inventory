/**
 * One-off seed of real Nova SS Trading staff, provided directly by the user
 * (2026-08-12). Idempotent by name — re-running skips anyone already present
 * rather than creating duplicates. The 5 unnamed merchandisers are seeded as
 * clearly-labeled placeholders ("Merchandiser 1".."Merchandiser 5") — replace
 * with real names via the Employees UI (Edit) once known.
 *
 * Usage: npm run db:seed-employees
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { newId } from "../src/lib/db/ids";
import { employees } from "../src/lib/db/schema";

const STAFF: Array<{ name: string; designation: string }> = [
  { name: "Sakib Ahmed", designation: "Chairman" },
  { name: "Akif Rahman", designation: "Managing Director (MD)" },
  { name: "Majedul Bipu", designation: "Vice President (VP)" },
  { name: "Abdur Rahman", designation: "Office Manager" },
  { name: "Rakibul Hasan", designation: "Marketing Manager / Sales Manager" },
  { name: "Faiz Ornab", designation: "Senior Merchandiser / Product Manager" },
  { name: "Parashmoni", designation: "Head Designer" },
  { name: "Suzana", designation: "Assistant Designer" },
  { name: "Rumpa", designation: "Trainee Designer" },
  { name: "Merchandiser 1", designation: "Merchandiser" },
  { name: "Merchandiser 2", designation: "Merchandiser" },
  { name: "Merchandiser 3", designation: "Merchandiser" },
  { name: "Merchandiser 4", designation: "Merchandiser" },
  { name: "Merchandiser 5", designation: "Merchandiser" },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const s of STAFF) {
    const existing = await db.query.employees.findFirst({ where: eq(employees.name, s.name) });
    if (existing) {
      skipped++;
      continue;
    }
    const now = new Date();
    await db.insert(employees).values({
      id: newId(),
      name: s.name,
      designation: s.designation,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }
  console.log(`Employees seeded: ${created} created, ${skipped} already existed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
