/**
 * One-time migration: reads the legacy PHP system's data/ folder (JSON + photo/
 * document/sticker files, exported from cPanel File Manager) and imports it into
 * the new MySQL schema + encrypted FTP storage. Idempotent per legacy id — safe
 * to re-run; already-migrated rows (matched by legacyId) are skipped, not duplicated.
 *
 * Usage:
 *   npm run migrate:legacy -- /path/to/exported/data
 *
 * Expects that directory to look like the legacy server-upload/data/ folder:
 *   inventory.json, employees.json, transfers.json, codes.json
 *   photos/<code>/*, photos/<code>_docs/*, stickers/<code>/*, emp_photos/<id>/*
 *
 * Run `npm run db:seed` (categories) and `npm run db:seed-admin -- <email>`
 * BEFORE this — assets need categories to already exist, and someone needs a
 * way to log in. users.json / users.php are NOT imported here on purpose:
 * re-grant access explicitly through the Access UI once the new system is live,
 * rather than carrying forward legacy accounts nobody's re-confirmed.
 */
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { newId } from "../src/lib/db/ids";
import { encryptField, encryptFile } from "../src/lib/crypto";
import { uploadEncryptedFile } from "../src/lib/storage/ftp-client";
import { assetDocuments, assetPhotos, assets, categories, codeCounters, employees, stickers, transfers } from "../src/lib/db/schema";

type LegacyAsset = {
  id: string;
  code: string | null;
  type: "hardware" | "software";
  category: string;
  name: string;
  brand_model?: string;
  serial?: string;
  specs?: string;
  vendor?: string;
  purchase_date?: string;
  value_amount?: string;
  value_currency?: "BDT" | "USD";
  value_type?: "one_time" | "monthly" | "yearly";
  assigned_to?: string;
  employee_id?: string;
  location?: string;
  status: "active" | "removed";
  notes?: string;
  photos?: Array<{ file: string; original_name?: string; deleted?: boolean }>;
  documents?: Array<{ file: string; original_name?: string; deleted?: boolean; type?: "pdf" | "image" }>;
  stickers?: Array<{ label: string; file: string }>;
  created_at: string;
  updated_at: string;
};

type LegacyEmployee = {
  id: string;
  name: string;
  designation?: string;
  contact?: string;
  email?: string;
  photo?: string | null;
  created_at: string;
  updated_at: string;
};

type LegacyTransfer = {
  code?: string;
  asset_id: string;
  asset_name: string;
  from: string;
  to: string;
  from_location?: string;
  to_location?: string;
  by?: string;
  notes?: string;
  date: string;
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (!existsSync(file)) return fallback;
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  return parsed as T;
}

async function readFileIfExists(file: string): Promise<Buffer | null> {
  if (!existsSync(file)) return null;
  return readFile(file);
}

function extOf(filename: string): string {
  return (filename.split(".").pop() || "bin").toLowerCase();
}

async function main() {
  const dataDir = process.argv[2];
  if (!dataDir) {
    console.error("Usage: npm run migrate:legacy -- /path/to/legacy/data");
    process.exit(1);
  }

  const stats = { employees: 0, employeesSkipped: 0, assets: 0, assetsSkipped: 0, photos: 0, documents: 0, stickersN: 0, transfers: 0, transfersSkipped: 0, warnings: [] as string[] };

  // ── categories: build name -> id lookup, fail fast if not seeded ──────────
  const categoryRows = await db.select().from(categories);
  const categoryByName = new Map(categoryRows.map((c) => [c.name, c]));
  if (categoryRows.length === 0) {
    console.error("No categories found — run `npm run db:seed` first.");
    process.exit(1);
  }

  // ── employees ───────────────────────────────────────────────────────────
  const legacyEmployees = await readJson<{ employees: LegacyEmployee[] }>(
    path.join(dataDir, "employees.json"),
    { employees: [] },
  );
  const employeeIdMap = new Map<string, string>(); // legacy id -> new id

  for (const le of legacyEmployees.employees) {
    const existing = await db.query.employees.findFirst({ where: eq(employees.legacyId, le.id) });
    if (existing) {
      employeeIdMap.set(le.id, existing.id);
      stats.employeesSkipped++;
      continue;
    }

    const newEmpId = newId();
    let photoKey: string | null = null;
    if (le.photo) {
      const photoPath = path.join(dataDir, "emp_photos", le.id, le.photo);
      const bytes = await readFileIfExists(photoPath);
      if (bytes) {
        photoKey = `employees/${newEmpId}/${Date.now().toString(36)}.${extOf(le.photo)}`;
        await uploadEncryptedFile(photoKey, encryptFile(bytes));
      } else {
        stats.warnings.push(`Employee ${le.name}: photo file missing at ${photoPath}`);
      }
    }

    await db.insert(employees).values({
      id: newEmpId,
      legacyId: le.id,
      name: le.name,
      designation: le.designation || null,
      contactEnc: le.contact ? encryptField(le.contact) : null,
      emailEnc: le.email ? encryptField(le.email) : null,
      photoKey,
      status: "active",
      createdAt: new Date(le.created_at),
      updatedAt: new Date(le.updated_at),
    });
    employeeIdMap.set(le.id, newEmpId);
    stats.employees++;
  }

  // ── assets (+ photos, documents, stickers) ─────────────────────────────
  const legacyInventory = await readJson<{ assets: LegacyAsset[] }>(path.join(dataDir, "inventory.json"), { assets: [] });
  const assetIdMap = new Map<string, string>(); // legacy id -> new id
  const codeMaxByTag = new Map<string, number>();

  for (const la of legacyInventory.assets) {
    const existing = await db.query.assets.findFirst({ where: eq(assets.legacyId, la.id) });
    if (existing) {
      assetIdMap.set(la.id, existing.id);
      stats.assetsSkipped++;
      continue;
    }

    const category = categoryByName.get(la.category);
    if (!category) {
      stats.warnings.push(`Asset ${la.code ?? la.id} (${la.name}): unknown category "${la.category}" — skipped.`);
      continue;
    }

    // Resolve holder: prefer employee_id; free-text assigned_to (legacy dual-field) has
    // no equivalent column in the new schema, so fold it into notes instead of losing it.
    let employeeId: string | null = null;
    let notes = la.notes ?? "";
    if (la.employee_id) {
      employeeId = employeeIdMap.get(la.employee_id) ?? null;
      if (!employeeId) stats.warnings.push(`Asset ${la.code ?? la.id}: employee_id ${la.employee_id} not found — left as Office.`);
    } else if (la.assigned_to) {
      notes = notes ? `${notes}\n(legacy holder: ${la.assigned_to})` : `(legacy holder: ${la.assigned_to})`;
    }

    const newAssetId = newId();
    await db.insert(assets).values({
      id: newAssetId,
      legacyId: la.id,
      code: la.code,
      type: la.type,
      categoryId: category.id,
      name: la.name,
      brandModel: la.brand_model || null,
      serial: la.serial || null,
      specs: la.specs || null,
      vendor: la.vendor || null,
      purchaseDate: la.purchase_date || null,
      valueAmount: la.value_amount || null,
      valueCurrency: la.value_currency ?? "BDT",
      valueType: la.value_type ?? "one_time",
      employeeId,
      location: la.location || null,
      status: la.status,
      notesEnc: notes ? encryptField(notes) : null,
      createdAt: new Date(la.created_at),
      updatedAt: new Date(la.updated_at),
    });
    assetIdMap.set(la.id, newAssetId);
    stats.assets++;

    if (la.code) {
      const m = la.code.match(/-([A-Z]{2})-(\d+)$/);
      if (m) {
        const [, tag, num] = m;
        codeMaxByTag.set(tag, Math.max(codeMaxByTag.get(tag) ?? 0, Number(num)));
      }
    }

    const assetKey = la.code ?? la.id;

    for (const p of la.photos ?? []) {
      const filePath = path.join(dataDir, "photos", assetKey, p.file);
      const bytes = await readFileIfExists(filePath);
      if (!bytes) {
        stats.warnings.push(`Asset ${assetKey}: photo file missing at ${filePath}`);
        continue;
      }
      const key = `assets/${assetKey}/${p.file}`;
      await uploadEncryptedFile(key, encryptFile(bytes));
      await db.insert(assetPhotos).values({
        id: newId(),
        assetId: newAssetId,
        storageKey: key,
        originalName: p.original_name ?? p.file,
        contentType: null,
        sizeBytes: bytes.length,
        uploadedAt: new Date(la.updated_at),
        deleted: p.deleted ?? false,
        deletedAt: p.deleted ? new Date() : null,
      });
      stats.photos++;
    }

    for (const d of la.documents ?? []) {
      const filePath = path.join(dataDir, "photos", `${assetKey}_docs`, d.file);
      const bytes = await readFileIfExists(filePath);
      if (!bytes) {
        stats.warnings.push(`Asset ${assetKey}: document file missing at ${filePath}`);
        continue;
      }
      const key = `assets/${assetKey}_docs/${d.file}`;
      await uploadEncryptedFile(key, encryptFile(bytes));
      await db.insert(assetDocuments).values({
        id: newId(),
        assetId: newAssetId,
        storageKey: key,
        originalName: d.original_name ?? d.file,
        contentType: null,
        sizeBytes: bytes.length,
        docType: d.type === "pdf" ? "pdf" : "image",
        uploadedAt: new Date(la.updated_at),
        deleted: d.deleted ?? false,
        deletedAt: d.deleted ? new Date() : null,
      });
      stats.documents++;
    }

    for (const s of la.stickers ?? []) {
      const filePath = path.join(dataDir, "stickers", assetKey, s.file);
      const bytes = await readFileIfExists(filePath);
      if (!bytes) {
        stats.warnings.push(`Asset ${assetKey}: sticker file missing at ${filePath}`);
        continue;
      }
      const key = `stickers/${assetKey}/${s.file}`;
      await uploadEncryptedFile(key, encryptFile(bytes));
      const slug = s.label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "label";
      await db.insert(stickers).values({
        id: newId(),
        assetId: newAssetId,
        label: s.label,
        labelSlug: slug,
        storageKey: key,
        createdAt: new Date(la.updated_at),
      });
      stats.stickersN++;
    }
  }

  // Seed code_counters so future generation continues past the highest migrated number per tag.
  for (const [tag, max] of codeMaxByTag) {
    await db
      .insert(codeCounters)
      .values({ tag, counter: max })
      .onDuplicateKeyUpdate({ set: { counter: sql`greatest(${codeCounters.counter}, ${max})` } });
  }

  // ── transfers ───────────────────────────────────────────────────────────
  const legacyTransfers = await readJson<{ transfers: LegacyTransfer[] }>(
    path.join(dataDir, "transfers.json"),
    { transfers: [] },
  );
  for (const lt of legacyTransfers.transfers) {
    const newAssetId = assetIdMap.get(lt.asset_id);
    if (!newAssetId) {
      stats.transfersSkipped++;
      stats.warnings.push(`Transfer for asset ${lt.asset_id} skipped — asset not migrated.`);
      continue;
    }
    await db.insert(transfers).values({
      id: newId(),
      assetId: newAssetId,
      code: lt.code ?? null,
      assetName: lt.asset_name,
      fromEmployeeId: null, // legacy log stores labels only, not ids — not reconstructable reliably
      toEmployeeId: null,
      fromLabel: lt.from || "Office",
      toLabel: lt.to || "Office",
      fromLocation: lt.from_location || null,
      toLocation: lt.to_location || null,
      byEmail: lt.by || "unknown",
      notes: lt.notes || null,
      createdAt: new Date(lt.date),
    });
    stats.transfers++;
  }

  console.log("\nMigration complete:");
  console.log(`  Employees: ${stats.employees} imported, ${stats.employeesSkipped} already present`);
  console.log(`  Assets:    ${stats.assets} imported, ${stats.assetsSkipped} already present`);
  console.log(`  Photos:    ${stats.photos}`);
  console.log(`  Documents: ${stats.documents}`);
  console.log(`  Stickers:  ${stats.stickersN}`);
  console.log(`  Transfers: ${stats.transfers} imported, ${stats.transfersSkipped} skipped`);
  if (stats.warnings.length) {
    console.log(`\n${stats.warnings.length} warning(s):`);
    for (const w of stats.warnings) console.log(`  - ${w}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
