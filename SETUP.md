# Setup — Legas (backend + frontend)

How to get this project running on a fresh machine, and where every credential
lives. No secret values belong in this file or in git.

## 1. Accounts you need

| Service | Why | Notes |
|---|---|---|
| GitHub (`Ariel-Sq`) | source of both repos | SSH key or token |
| Vercel (`ariel-sq-s-projects`) | hosting + **all production env vars** | the single source of truth for secrets |
| Neon | production Postgres (`legas-db`) | connection string available from Vercel env |
| Google Cloud | login (OAuth client) + Gmail API for mail | project `legas-mail` |
| Vercel Blob | product images (`legas-images`) | managed from the Vercel dashboard |
| Domain registrant | `legasmuebles.com` | DNS points to Vercel |

## 2. Tooling

```bash
node 22 (nvm)   npm   pnpm   git   postgres 17+ (local DB)
npm i -g vercel
```

## 3. Repos

```bash
git clone git@github.com:Ariel-Sq/legas-backend.git
git clone git@github.com:Ariel-Sq/legas-frontend.git
```

## 4. Environment variables

Never commit them. Pull them from Vercel (`vercel env pull` inside each repo
after `vercel link`), or copy from the password manager.

**Backend** (`legas-backend/.env`) — names only:

```
NODE_ENV BACKEND_URL FRONTEND_URL CORS_ORIGINS
DB_TYPE DB_SSL DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME LOG_SQL
DATABASE_URL DATABASE_URL_UNPOOLED
JWT_SECRET JWT_EXPIRES_IN FRONTEND_SHARED_SECRET CRON_SECRET
GOOGLE_CLIENT_ID                     # login (verifies the Google id_token)
GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_REFRESH_TOKEN SMTP_USER SMTP_FROM
MERCADO_PAGO_ACCESS_TOKEN MERCADO_PAGO_SUCCESS_URL MERCADO_PAGO_FAILURE_URL
MERCADO_PAGO_PENDING_URL MERCADO_PAGO_WEBHOOK_URL
STORAGE_TYPE BLOB_READ_WRITE_TOKEN BLOB_BASE_URL
```

**Frontend** (`legas-frontend/.env.local`):

```
BACKEND_URL                      # http://localhost:8080 locally
NEXTAUTH_URL NEXTAUTH_SECRET
GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
FRONTEND_SHARED_SECRET           # must match the backend
NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_WHATSAPP_PHONE NEXT_PUBLIC_WHATSAPP_MESSAGE
REVALIDATE_SECRET
```

## 5. Local database

```bash
createdb ecommerce_db          # user postgres / password postgres
# then, if you have a dump:
/opt/homebrew/opt/postgresql@18/bin/pg_dump --version   # must be >= server
pg_restore -d ecommerce_db backups/<file>.dump
```

Migrations run on boot (`migrationsRun: true`) but are read from `dist/`, so
**`npm run build` before the first start**.

## 6. Run

```bash
source ~/.nvm/nvm.sh && nvm use 22

# backend → http://localhost:8080/api (Swagger at /api/docs)
cd legas-backend && npm install && npm run start:dev

# frontend → http://localhost:3000
cd legas-frontend && pnpm install && pnpm dev
```

Backend must be on **8080**: the frontend only whitelists images from there.

## 7. Images

- Local: `legas-backend/.storage/products/legas/` (gitignored).
- Production: Vercel Blob, served through `${BLOB_BASE_URL}/products/legas/<file>`.
- All products use **one image per variation** (white background, 1200×1200).

## 8. Deploy

- Push to `main` → Vercel builds both projects automatically.
- Frontend fonts are self-hosted (`app/fonts`) — no Google Fonts fetch at build.
- Backend migrations are applied on boot from `dist/`.

## 9. Mail

Sending goes through the **Gmail API over HTTPS** (SMTP to Gmail was dropped in
some networks). It needs `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
`GMAIL_REFRESH_TOKEN` and `SMTP_USER`.

To regenerate the refresh token:

```bash
cd legas-backend
GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-oauth-token.mjs
```

It prints a URL, you approve it with `legasmuebles@gmail.com`, and the token is
printed. The OAuth client must stay **published** (production) or tokens expire
after 7 days.

## 10. Operational rules

- **Pickup deposit**: cash/transfer + pickup = 50% by transfer within 48 hs,
  balance on pickup. Cancellation after 48 hs is **manual** (no automation).
  Mark the deposit with `orders."depositPaidAt"` and move the status to
  `paid_preparing`; to cancel + restore stock use the compensation path.
- **Admin**: there is no admin panel. Orders, products and reviews are handled
  with SQL (this is intentional, see TODO.md).
- **Backups**: `pg_dump` before every data change; prod dumps live in
  `~/projects/legas-backups/` (and should be copied off-machine).

## 11. Gotchas

- The backend runs on 8080 (not 3001); the frontend only allows images from it.
- `vercel env pull` masks secrets as `[SENSITIVE]`; use the dashboard or the
  password manager for the real values.
- Two `node` processes can end up fighting for the port: check
  `lsof -nP -iTCP:8080 -sTCP:LISTEN` if requests fail oddly.
- Do not run `next build` while `next dev` is running: it replaces `.next` and
  the dev server starts serving 404 for its assets.
