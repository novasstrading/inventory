# Cutover runbook

This is the checklist for switching from the legacy PHP system
(`server-upload/` + `vercel-deploy/`) to this Next.js app. Everything here
needs real credentials and production access this repo/assistant doesn't
have — it's written so you (or whoever has cPanel/Vercel/DNS access) can
execute it directly.

## 1. Provision infrastructure (Exonhost cPanel)

- [ ] Create a dedicated MySQL database (e.g. `nova_assets`) and a dedicated
      DB user scoped only to it — do not reuse the legacy PHP app's DB user
      if it has one, and do not use the cPanel master account.
- [ ] In cPanel → **Remote MySQL**, either allow connections from any host
      (fine as long as the DB user has a strong random password and the
      connection enforces TLS — this is normal for managed DBs reached over
      the public internet) or add Vercel's egress ranges if your plan
      supports IP allowlisting and you want that extra layer.
- [ ] Create a dedicated FTP account scoped to a folder **outside**
      `public_html` (e.g. `/nova_secure_files`) — this is where encrypted
      photos/documents/stickers live. Confirm the account cannot browse
      above that folder.
- [ ] Confirm FTPS (FTP over TLS) is available — `FTP_SECURE=true` expects it.

## 2. Generate secrets

```bash
openssl rand -base64 32   # FIELD_ENCRYPTION_KEY
openssl rand -base64 32   # FILE_ENCRYPTION_KEY  (must differ from the above)
```

Store these somewhere durable (password manager) — losing them makes all
encrypted employee contact info, asset notes, and stored files permanently
unrecoverable.

## 3. Configure Vercel

- [ ] New Vercel project pointed at this repo, with **Root Directory set to
      `web`** — the app isn't at the repo root, and Vercel won't find it
      otherwise.
- [ ] Set every variable from `.env.example` in Vercel's Production
      environment: `DATABASE_URL`, `DATABASE_SSL`, `FIELD_ENCRYPTION_KEY`,
      `FILE_ENCRYPTION_KEY`, `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`,
      `NEXT_PUBLIC_EMAIL_DOMAIN`, `FTP_HOST`, `FTP_PORT`, `FTP_USER`,
      `FTP_PASSWORD`, `FTP_SECURE`, `FTP_BASE_PATH`.
- [ ] Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_BASE_PATH` per the mounting
      approach you're using — see §3a below. These two determine every link
      this app generates (emails, redirects, images) and are baked in at
      **build time**, so changing either needs a redeploy, not just an env
      var edit.
- [ ] Deploy once so the domain/build pipeline exists before running
      migrations against it.

### 3a. Mounting at novasstrading.com/admin/inventory (Next.js Multi-Zones)

Decided approach: this app stays its own separate Vercel project (its own
repo, build, deploy), and the **main novasstrading.com Next.js project**
proxies one path prefix to it. The browser only ever sees `novasstrading.com`
— this second Vercel URL is never exposed to users.

**In this repo** (`web/`), already wired to read these at build time:
- `NEXT_PUBLIC_BASE_PATH=/admin/inventory`
- `NEXT_PUBLIC_APP_URL=https://novasstrading.com/admin/inventory`
- `NEXT_PUBLIC_ADMIN_LOGIN_URL=/admin/login` — only when the shared `/admin`
  door (website-editor app) owns sign-in; hands login/sign-out off to it.
  Leave unset to keep this app's own `/login`. Requires migration
  `0003_add_user_modules` (adds `users.modules`; admins get `website,assets`).

**In the main novasstrading.com repo**, add to `next.config.js`:
```js
async rewrites() {
  return [
    { source: '/admin/inventory', destination: `${process.env.INVENTORY_URL}/admin/inventory` },
    { source: '/admin/inventory/:path*', destination: `${process.env.INVENTORY_URL}/admin/inventory/:path*` },
  ];
}
```
where `INVENTORY_URL` is set (in the main site's Vercel project env vars) to
this app's own production URL, e.g. `https://nova-inventory.vercel.app`
(find it on this app's Vercel project page — not a custom domain, just
whatever `*.vercel.app` URL Vercel assigned it).

If the main site's Server Actions are enabled, it also needs, per
[Next's Multi-Zones guide](https://nextjs.org/docs/app/guides/multi-zones):
```js
experimental: { serverActions: { allowedOrigins: ['novasstrading.com'] } }
```

**Verify after deploying both**: hit `https://novasstrading.com/admin/inventory`
directly — not the `*.vercel.app` URL — since that's the only path that
exercises the actual rewrite + basePath wiring together. Check the browser
network tab for any request still going to a bare `/api/...` or `/_next/...`
path instead of `/admin/inventory/api/...` — that indicates a spot in this
app's frontend that didn't get the basePath prefix (search for raw
`fetch(`/`<img src=`/`<a href=` in `web/src` not going through
`lib/api-client.ts`'s `apiFetch` or `lib/base-path.ts`'s `withBasePath`).

## 4. Initialize the database

Run these against the **production** `DATABASE_URL` (from your own machine
or a one-off script runner — not committed anywhere):

```bash
npm run db:migrate        # creates all 13 tables
npm run db:seed           # seeds the category/code-tag taxonomy
npm run db:seed-admin -- it-support@novasstrading.com   # first login
```

## 5. Migrate legacy data

1. Download the legacy `server-upload/data/` folder from cPanel File Manager
   to a local path.
2. `npm run migrate:legacy -- /path/to/that/data`
3. Read the summary output — it lists exact counts imported and any
   warnings (missing photo files, unresolved employee references, etc.).
   Re-run is safe (idempotent per legacy id) if you need to fix something
   and try again.
4. Spot-check in the new app: pick 5-10 assets you know well and confirm
   code, holder, photos, and transfer history match the legacy system.

## 6. Verify before switching

- [ ] Log in as the seeded admin, confirm OTP email arrives (real Brevo key
      now, not the dev console-log fallback).
- [ ] Create a viewer account, confirm role gating (no Access tab, no
      write actions).
- [ ] Add/edit/remove/transfer a test asset, generate a sticker, upload a
      photo — confirm files round-trip through FTP correctly (this is the
      one thing that genuinely could not be tested without real Exonhost
      FTP credentials, so verify it carefully here).
- [ ] Release a test employee holding an asset, confirm it auto-returns to
      Office and shows up in transfer history.

## 7. Cut over

- [ ] Deploy the main novasstrading.com project with the §3a rewrite live —
      `novasstrading.com/admin/inventory` now serves this app. No DNS change
      needed since it's a path on a domain already live, not a new subdomain.
- [ ] Leave the legacy PHP/cPanel system and its old `vercel-deploy/` URL
      running, untouched, for a grace period (a week or two) as a rollback
      safety net — per the build-verify-cutover plan you chose, don't
      decommission it yet.
- [ ] Tell staff the new URL (`novasstrading.com/admin/inventory`) and that
      it's the same login flow (email code, `@novasstrading.com` only).

## 8. Decommission (after the grace period, only once confident)

- [ ] Confirm nobody has hit the old system's access logs in the grace
      period.
- [ ] Remove the legacy Vercel deployment and cPanel PHP app.
- [ ] Rotate the old Brevo API key that was embedded in
      `server-upload/config.php` on the live server (it was redacted before
      this repo's first commit, but the real value is still live in cPanel
      until you replace it there).
