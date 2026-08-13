import { relations, sql } from "drizzle-orm";
import {
  AnyMySqlColumn,
  boolean,
  char,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  smallint,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Nova SS Asset Manager schema (plan §4). Primary keys are ULIDs (char(26))
 * generated in application code (lib/db/ids.ts) — never MySQL auto-increment,
 * so ids stay opaque/non-enumerable like the legacy a_xxx/e_xxx ids.
 * `*_enc` columns hold AES-256-GCM ciphertext produced by lib/crypto.ts —
 * see plan §4 "Encryption policy" for exactly what is and isn't encrypted.
 */

const id = (name = "id") => char(name, { length: 26 });
const ts = (name: string) =>
  datetime(name, { mode: "date", fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull();
// Drizzle's mysql-core datetime() builder doesn't support .onUpdateNow() (only timestamp()
// does, which has MySQL's narrower 1970-2038 range/timezone-conversion behavior — not worth
// it just for auto-touch). Every UPDATE query sets updatedAt: new Date() explicitly instead.
const updatedTs = ts;

// ─── users (login accounts + roles — replaces users.php + users.json) ──────
export const users = mysqlTable("users", {
  id: id().primaryKey(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "viewer"]).notNull().default("viewer"),
  // bootstrap admin — can't be removed via the Access UI, replaces hand-editing users.php
  protected: boolean("protected").notNull().default(false),
  status: mysqlEnum("status", ["active", "revoked"]).notNull().default("active"),
  createdBy: id("created_by").references((): AnyMySqlColumn => users.id),
  createdAt: ts("created_at"),
  updatedAt: updatedTs("updated_at"),
});

// ─── otp_codes ───────────────────────────────────────────────────────────
export const otpCodes = mysqlTable("otp_codes", {
  email: varchar("email", { length: 190 }).primaryKey(),
  codeHash: char("code_hash", { length: 64 }).notNull(), // sha256 hex
  attempts: tinyint("attempts").notNull().default(0),
  sentAt: datetime("sent_at", { mode: "date", fsp: 3 }).notNull(),
  expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
});

// ─── sessions ────────────────────────────────────────────────────────────
export const sessions = mysqlTable(
  "sessions",
  {
    id: id().primaryKey(),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(), // sha256 of cookie token
    userId: id("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at"),
    lastSeenAt: ts("last_seen_at"),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    userAgent: varchar("user_agent", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_expires_at_idx").on(t.expiresAt)],
);

// ─── rate_limits (OTP request throttling, no Redis needed at this scale) ──
export const rateLimits = mysqlTable("rate_limits", {
  rlKey: varchar("rl_key", { length: 190 }).primaryKey(), // 'otp:ip:1.2.3.4' | 'otp:email:x@y.com'
  windowStart: datetime("window_start", { mode: "date", fsp: 3 }).notNull(),
  count: smallint("count").notNull().default(1),
});

// ─── categories (seeded from legacy config.php, admin-editable) ──────────
export const categories = mysqlTable("categories", {
  id: id().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  kind: mysqlEnum("kind", ["hardware", "software"]).notNull(),
  // required + unique for hardware; immutable once its counter > 0
  codeTag: char("code_tag", { length: 2 }),
  sortOrder: smallint("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: ts("created_at"),
  updatedAt: updatedTs("updated_at"),
});

// ─── locations (curated suggestion list — assets.location stays free text so
// a one-off custom value never needs a row here) ──────────────────────────
export const locations = mysqlTable("locations", {
  id: id().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  createdAt: ts("created_at"),
  updatedAt: updatedTs("updated_at"),
});

// ─── code_counters (replaces codes.json) ──────────────────────────────────
export const codeCounters = mysqlTable("code_counters", {
  tag: char("tag", { length: 2 }).primaryKey(),
  counter: int("counter").notNull().default(0),
});

// ─── employees (soft-release — fixes the legacy hard-delete orphan bug) ──
export const employees = mysqlTable(
  "employees",
  {
    id: id().primaryKey(),
    legacyId: varchar("legacy_id", { length: 64 }).unique(), // old e_xxx id, migration traceability
    name: varchar("name", { length: 150 }).notNull(),
    designation: varchar("designation", { length: 150 }),
    // base64 ciphertext text, not raw bytes — see lib/crypto.ts encryptField() for why.
    contactEnc: varchar("contact_enc", { length: 700 }),
    emailEnc: varchar("email_enc", { length: 700 }),
    photoKey: varchar("photo_key", { length: 255 }), // remote path on cPanel
    status: mysqlEnum("status", ["active", "released"]).notNull().default("active"),
    releasedAt: datetime("released_at", { mode: "date", fsp: 3 }),
    releasedBy: id("released_by").references(() => users.id),
    releasedNote: varchar("released_note", { length: 500 }),
    createdAt: ts("created_at"),
    updatedAt: updatedTs("updated_at"),
  },
  (t) => [index("employees_name_idx").on(t.name), index("employees_status_idx").on(t.status)],
);

// ─── assets ────────────────────────────────────────────────────────────────
export const assets = mysqlTable(
  "assets",
  {
    id: id().primaryKey(),
    legacyId: varchar("legacy_id", { length: 64 }).unique(),
    // NULL for software; reserved forever once issued, even after removal
    code: varchar("code", { length: 20 }).unique(),
    type: mysqlEnum("type", ["hardware", "software"]).notNull(),
    categoryId: id("category_id")
      .notNull()
      .references(() => categories.id),
    name: varchar("name", { length: 200 }).notNull(),
    brandModel: varchar("brand_model", { length: 200 }),
    serial: varchar("serial", { length: 150 }),
    specs: varchar("specs", { length: 500 }),
    vendor: varchar("vendor", { length: 150 }),
    purchaseDate: date("purchase_date", { mode: "string" }),
    valueAmount: decimal("value_amount", { precision: 12, scale: 2 }),
    valueCurrency: mysqlEnum("value_currency", ["BDT", "USD"]).notNull().default("BDT"),
    valueType: mysqlEnum("value_type", ["one_time", "monthly", "yearly"]).notNull().default("one_time"),
    // NULL = held by Office
    employeeId: id("employee_id").references(() => employees.id),
    location: varchar("location", { length: 200 }),
    status: mysqlEnum("status", ["active", "removed"]).notNull().default("active"),
    // base64 ciphertext text, not raw bytes — see lib/crypto.ts encryptField() for why.
    notesEnc: varchar("notes_enc", { length: 2800 }),
    createdBy: id("created_by").references(() => users.id),
    updatedBy: id("updated_by").references(() => users.id),
    createdAt: ts("created_at"),
    updatedAt: updatedTs("updated_at"),
  },
  (t) => [
    index("assets_category_id_idx").on(t.categoryId),
    index("assets_employee_id_idx").on(t.employeeId),
    index("assets_status_idx").on(t.status),
  ],
);

// ─── asset_photos / asset_documents ────────────────────────────────────────
export const assetPhotos = mysqlTable(
  "asset_photos",
  {
    id: id().primaryKey(),
    assetId: id("asset_id")
      .notNull()
      .references(() => assets.id),
    storageKey: varchar("storage_key", { length: 255 }).notNull(), // encrypted-file remote path
    originalName: varchar("original_name", { length: 255 }),
    contentType: varchar("content_type", { length: 100 }),
    sizeBytes: int("size_bytes"),
    uploadedBy: id("uploaded_by").references(() => users.id),
    uploadedAt: ts("uploaded_at"),
    deleted: boolean("deleted").notNull().default(false),
    deletedAt: datetime("deleted_at", { mode: "date", fsp: 3 }),
  },
  (t) => [index("asset_photos_asset_id_idx").on(t.assetId)],
);

export const assetDocuments = mysqlTable(
  "asset_documents",
  {
    id: id().primaryKey(),
    assetId: id("asset_id")
      .notNull()
      .references(() => assets.id),
    storageKey: varchar("storage_key", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }),
    contentType: varchar("content_type", { length: 100 }),
    sizeBytes: int("size_bytes"),
    docType: mysqlEnum("doc_type", ["pdf", "image"]).notNull(),
    uploadedBy: id("uploaded_by").references(() => users.id),
    uploadedAt: ts("uploaded_at"),
    deleted: boolean("deleted").notNull().default(false),
    deletedAt: datetime("deleted_at", { mode: "date", fsp: 3 }),
  },
  (t) => [index("asset_documents_asset_id_idx").on(t.assetId)],
);

// ─── stickers ────────────────────────────────────────────────────────────
export const stickers = mysqlTable(
  "stickers",
  {
    id: id().primaryKey(),
    assetId: id("asset_id")
      .notNull()
      .references(() => assets.id),
    label: varchar("label", { length: 80 }).notNull(),
    labelSlug: varchar("label_slug", { length: 80 }).notNull(),
    storageKey: varchar("storage_key", { length: 255 }).notNull(),
    createdBy: id("created_by").references(() => users.id),
    createdAt: ts("created_at"),
  },
  (t) => [
    // Generate-once enforcement: the DB itself rejects a duplicate label,
    // fixing the legacy read-then-write race (plan §4).
    uniqueIndex("stickers_asset_label_idx").on(t.assetId, t.labelSlug),
  ],
);

// ─── transfers (append-only audit trail — no update/delete route exposed) ─
export const transfers = mysqlTable(
  "transfers",
  {
    id: id().primaryKey(),
    assetId: id("asset_id")
      .notNull()
      .references(() => assets.id),
    code: varchar("code", { length: 20 }), // snapshot
    assetName: varchar("asset_name", { length: 200 }).notNull(), // snapshot
    fromEmployeeId: id("from_employee_id").references(() => employees.id),
    toEmployeeId: id("to_employee_id").references(() => employees.id),
    fromLabel: varchar("from_label", { length: 150 }).notNull(),
    toLabel: varchar("to_label", { length: 150 }).notNull(),
    fromLocation: varchar("from_location", { length: 200 }),
    toLocation: varchar("to_location", { length: 200 }),
    byUserId: id("by_user_id").references(() => users.id),
    byEmail: varchar("by_email", { length: 190 }).notNull(),
    notes: varchar("notes", { length: 500 }),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("transfers_asset_id_idx").on(t.assetId),
    index("transfers_code_idx").on(t.code),
    index("transfers_created_at_idx").on(t.createdAt),
  ],
);

// ─── audit_log ─────────────────────────────────────────────────────────────
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: id().primaryKey(),
    actorUserId: id("actor_user_id").references(() => users.id),
    actorEmail: varchar("actor_email", { length: 190 }),
    action: varchar("action", { length: 60 }).notNull(), // 'asset.create', 'employee.release', ...
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    meta: json("meta"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: ts("created_at"),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId), index("audit_log_created_at_idx").on(t.createdAt)],
);

// ─── relations (for db.query.* ergonomics) ─────────────────────────────────
export const assetsRelations = relations(assets, ({ one, many }) => ({
  category: one(categories, { fields: [assets.categoryId], references: [categories.id] }),
  employee: one(employees, { fields: [assets.employeeId], references: [employees.id] }),
  photos: many(assetPhotos),
  documents: many(assetDocuments),
  stickers: many(stickers),
  transfers: many(transfers),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  assets: many(assets),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  assets: many(assets),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
