# Nova SS Asset Manager — Instructions

This repo contains **two systems**:

- **`server-upload/` + `vercel-deploy/`** — the original production system (PHP
  backend on cPanel/Exonhost, static HTML/JS frontend on Vercel). Kept for
  reference during migration only. The live Brevo API key that was in
  `server-upload/config.php` has been redacted in this repo — the real key
  only exists on the live cPanel server.
- **`web/`** — the full-stack Next.js rebuild. **This is the active project.**
  Everything below is about `web/`.

If you only remember one thing: **run every command from inside `web/`**, not
the repo root — the Next.js app is not at the repo root.

## What this is

An internal inventory/asset management system for Nova SS Trading (a
garments buying house). Tracks hardware/software assets, who's holding them
(employees or "Office"), transfer history, and generates printable QR
stickers for physical items. Login is email-OTP, restricted to
`@novasstrading.com` addresses, with `admin`/`viewer` roles.

## Tech stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4
- MySQL via Drizzle ORM, hosted on Exonhost cPanel (not a managed cloud DB —
  see [`web/CUTOVER.md`](web/CUTOVER.md) for why and how that's provisioned)
- Auth: custom email-OTP, httpOnly session cookies, no third-party auth library
- File storage: FTPS to a cPanel folder outside `public_html`, with every
  file AES-256-GCM encrypted before it's ever written there
- Sensitive DB fields (employee contact/email, asset notes) are also
  AES-256-GCM encrypted at the application layer, not just relying on
  "it's a database, not a public folder"
- Deployment target: Vercel, mounted at `novasstrading.com/admin/inventory`
  via Next.js Multi-Zones (a path rewrite from the main site's own Vercel
  project — this app is never reached directly by users)

## Local development setup

```bash
cd web
npm install
cp .env.example .env.local
```

Then fill in `.env.local`. For a from-scratch local dev environment you need:

1. **A local MySQL instance.** Any 8.x works. Point `DATABASE_URL` at it,
   e.g. `mysql://user:pass@127.0.0.1:3306/nova_assets_dev`, and set
   `DATABASE_SSL=false` for a local instance without TLS.
2. **The two encryption keys** — generate with `openssl rand -base64 32`,
   run it twice for two different values (`FIELD_ENCRYPTION_KEY` and
   `FILE_ENCRYPTION_KEY` must differ). These can be throwaway values for
   local dev; just don't reuse them in production.
3. **`BREVO_API_KEY` can stay empty for local dev** — when unset, OTP codes
   are logged to the server console instead of emailed. Look for a line
   like `[email:dev] "Your login code: 123 456" -> someone@novasstrading.com`
   in the terminal running `npm run dev`.
4. **FTP vars can also stay empty/fake for local dev** unless you're
   specifically testing photo/document/sticker upload — those routes will
   just fail until real (or a local test) FTP target is configured. Nothing
   else in the app depends on FTP being reachable.
5. Leave `NEXT_PUBLIC_BASE_PATH` **empty** for local dev — that's what makes
   the app run at the plain `localhost:3000` root instead of under
   `/admin/inventory` (see "Deploying" below for when this matters).

Then:

```bash
npm run db:migrate                                    # creates all tables
npm run db:seed                                       # seeds categories (Laptop, Desktop, ...)
npm run db:seed-admin -- your-email@novasstrading.com  # so you can actually log in
npm run dev
```

Open `http://localhost:3000`, sign in with the email you just seeded, grab
the OTP from the terminal log.

## Scripts (all run from `web/`)

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm run start` | Production build / run it |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run db:generate` | Regenerate Drizzle migration SQL after a schema change |
| `npm run db:migrate` | Apply migrations to whatever `DATABASE_URL` points at |
| `npm run db:studio` | Drizzle Studio (visual DB browser) |
| `npm run db:seed` | Seed the category/code-tag taxonomy (idempotent) |
| `npm run db:seed-admin -- <email>` | Create/promote a protected bootstrap admin (idempotent) |
| `npm run db:seed-employees` | Seed the real Nova SS staff list (idempotent, see `web/scripts/seed-employees.ts` — 5 merchandiser slots are still placeholders pending real names) |
| `npm run migrate:legacy -- /path/to/legacy/data` | One-time import of the old system's JSON + files (idempotent, untested against real data — see `web/CUTOVER.md` §5) |

All the `db:*`/`migrate:legacy` scripts need `--tsconfig scripts/tsconfig.json`
under the hood (already wired into the npm scripts) — don't run them with
plain `tsx scripts/foo.ts`, it'll fail on the `server-only` import guard.

## Architecture notes worth knowing before changing things

- **API pattern**: Next.js Route Handlers under `src/app/api/**/route.ts`,
  business logic in `src/lib/*/service.ts`, thin client fetch wrapper in
  `src/lib/api-client.ts` (`apiFetch`). Auth check via `requireSession()` /
  `requireAdmin()` (throws → JSON 401/403) inside route handlers, or
  `requirePageSession()` / `requirePageAdmin()` (redirects) inside Server
  Components. `src/proxy.ts` (Next 16 renamed Middleware → Proxy) does a
  cookie-presence-only redirect for UX — it is **not** the security boundary,
  every route handler re-checks against the DB.
- **basePath**: this app can run at the root (local dev) or under
  `/admin/inventory` (production). Next's `basePath` config auto-prefixes
  `next/link` and `next/navigation`, but **not** raw `fetch()`/`<img src>`/
  `<a href>` strings. Always go through `apiFetch()` (from
  `lib/api-client.ts`) or `withBasePath()` (from `lib/base-path.ts`) for
  those — never a bare `fetch("/api/...")`.
- **Encrypted fields**: `lib/crypto.ts`'s `encryptField`/`decryptField`
  return/accept **base64 strings**, not Buffers — this project's Drizzle
  version's `varbinary()` column is string-typed with no Buffer mode, so
  encrypted DB columns are `varchar` storing base64 text. `encryptFile`/
  `decryptFile` (for FTP-stored files) do use real Buffers — different
  code path, don't mix them up.
- **IDs**: ULIDs (`lib/db/ids.ts`), not auto-increment integers.
- **Employees are soft-released, never hard-deleted** (`status: 'released'`)
  — releasing one auto-returns their held assets to Office by default and
  logs it as a transfer, fixing a real bug in the legacy PHP system where
  deleting an employee silently orphaned any asset still pointing at them.
- **Users (login accounts) are soft-revoked, never hard-deleted** — same
  reasoning, plus they're referenced by `createdBy`/`byUserId`/etc. foreign
  keys throughout the schema, so a hard delete would break referential
  integrity or destroy audit history.
- **Sticker labels are unique per asset at the DB level** (not just an
  app-level check) — generating a sticker with a label that already exists
  for that asset is rejected, matching the legacy "generate once, never
  regenerate" rule.

## Current status

All of M1–M6 from the original rebuild plan are done: auth, assets
(CRUD/codes/transfer/soft-delete), employees (CRUD/release), encrypted file
storage, stickers, admin user management, a legacy-data migration script,
and this basePath/Multi-Zones deployment wiring. Real Nova SS staff data
(14 employees — 5 merchandiser slots are placeholders, see the seed script)
is already seeded in the dev DB.

**What's genuinely unverified**: the FTP file-storage path and the
legacy-data migration script have never run against real Exonhost
credentials or real legacy data — there wasn't a live cPanel account
reachable from the environment this was built in. Everything else has been
built-and-tested end-to-end (including the basePath/subpath deployment
mechanics) against a real local MySQL instance and a real production build,
not just code review.

## Deploying

Full step-by-step runbook: [`web/CUTOVER.md`](web/CUTOVER.md) — provisioning
the Exonhost DB/FTP, generating secrets, configuring Vercel, initializing
the database, migrating legacy data, verifying, and the actual cutover
(including the Multi-Zones rewrite config needed in the *main*
novasstrading.com Next.js project, not this repo).
