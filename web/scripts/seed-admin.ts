/**
 * One-time bootstrap: creates the first protected admin so someone can actually
 * log in (replaces hand-editing users.php on cPanel). Protected admins can't be
 * removed via the Access UI — only by editing the DB directly, same safety
 * property the legacy bootstrap file had. Idempotent — re-running just confirms.
 *
 * Usage: npm run db:seed-admin -- it-support@novasstrading.com
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { newId } from "../src/lib/db/ids";
import { users } from "../src/lib/db/schema";
import { defaultModulesForRole, formatModules } from "../src/lib/auth/modules";

// Protected admins always get every module (website editor + assets).
const ADMIN_MODULES = formatModules(defaultModulesForRole("admin"));

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run db:seed-admin -- someone@novasstrading.com");
    process.exit(1);
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    if (!existing.protected) {
      await db
        .update(users)
        .set({ protected: true, role: "admin", status: "active", modules: ADMIN_MODULES })
        .where(eq(users.id, existing.id));
      console.log(`${email} already existed — promoted to protected admin.`);
    } else {
      console.log(`${email} is already a protected admin. Nothing to do.`);
    }
    process.exit(0);
  }

  const now = new Date();
  await db.insert(users).values({
    id: newId(),
    email,
    role: "admin",
    modules: ADMIN_MODULES,
    protected: true,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created protected admin: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
