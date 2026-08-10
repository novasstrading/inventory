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

- [ ] New Vercel project pointed at this repo's `web/` directory as root.
- [ ] Set every variable from `.env.example` in Vercel's Production
      environment: `DATABASE_URL`, `DATABASE_SSL`, `FIELD_ENCRYPTION_KEY`,
      `FILE_ENCRYPTION_KEY`, `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`,
      `NEXT_PUBLIC_EMAIL_DOMAIN`, `NEXT_PUBLIC_APP_URL` (the real domain
      you'll use, e.g. `https://assets.novasstrading.com`), `FTP_HOST`,
      `FTP_PORT`, `FTP_USER`, `FTP_PASSWORD`, `FTP_SECURE`, `FTP_BASE_PATH`.
- [ ] Deploy once so the domain/build pipeline exists before running
      migrations against it.

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

- [ ] Point the DNS/subdomain that currently serves `vercel-deploy/`
      (e.g. `novass-inventory.vercel.app` or a custom domain) at the new
      Vercel project instead — or update the link staff actually use.
- [ ] Leave the legacy PHP/cPanel system running, untouched, for a grace
      period (a week or two) as a rollback safety net — per the
      build-verify-cutover plan you chose, don't decommission it yet.
- [ ] Tell staff the new URL and that it's the same login flow (email code,
      `@novasstrading.com` only).

## 8. Decommission (after the grace period, only once confident)

- [ ] Confirm nobody has hit the old system's access logs in the grace
      period.
- [ ] Remove the legacy Vercel deployment and cPanel PHP app.
- [ ] Rotate the old Brevo API key that was embedded in
      `server-upload/config.php` on the live server (it was redacted before
      this repo's first commit, but the real value is still live in cPanel
      until you replace it there).
