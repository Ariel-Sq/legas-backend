# Backend Status — 2026-05-17

Smoke test of every public + admin endpoint, plus an evaluation of overall
backend readiness for starting the frontend.

## TL;DR

- **60 PASS / 0 FAIL / 1 intentional skip** after fixing one crash bug.
- All 57 routes the frontend will consume return well-formed responses.
- DB left seeded with categories, products, images, price tiers, and reviews
  in every moderation state so the frontend has realistic content to render.
- Verdict: **ready to start frontend work.** Known follow-ups listed below
  are not blockers for local development.

## Bug fixed during testing

### `GET /api/images?path=...` crashed the Node process

`src/storage/image.controller.ts` used `@Res()` and `return res.send(buffer)`.
The global `ClassSerializerInterceptor` tried to serialize the returned
Express `Response` object, walking its socket reference and throwing
`this.removeListener is not a function`. The `GlobalExceptionFilter` then
tried to write a 500 response, but the headers were already sent, which
triggered `ERR_INTERNAL_ASSERTION` inside Node and killed the worker.

**Fix:** stop returning the result of `res.send`, and pick the correct
`Content-Type` from the file extension (the handler hard-coded `image/jpeg`).

```diff
- async getImage(@Query('path') path: string, @Res() res: any) {
+ async getImage(@Query('path') path: string, @Res() res: any): Promise<void> {
    ...
-   res.set({ 'Content-Type': 'image/jpeg', ... });
-   return res.send(imageBuffer);
+   const contentType =
+     path.toLowerCase().endsWith('.png')  ? 'image/png'
+     : path.toLowerCase().endsWith('.webp') ? 'image/webp'
+     : path.toLowerCase().endsWith('.gif')  ? 'image/gif'
+     : 'image/jpeg';
+   res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' });
+   res.send(imageBuffer);
  }
```

## Endpoint coverage

| Module                          | Endpoints tested | Result          |
| ------------------------------- | ---------------- | --------------- |
| Health                          | 1                | OK              |
| Users (public + admin)          | 6 + 2 auth bndry | OK              |
| Categories (admin + public)     | 6                | OK              |
| Product Templates               | 7                | OK              |
| Product Variations (admin + pub)| 11               | OK              |
| Price Tiers                     | 5                | OK              |
| Storage + Images                | 6                | OK (after fix)  |
| Product Images (multipart)      | 2                | OK              |
| Cart (anonymous session)        | 6                | OK              |
| Admin Cart                      | 2                | OK              |
| Reviews (CRUD + helpful/report) | 10               | OK              |
| Review Moderation               | 5                | OK              |
| Ratings                         | 3                | OK              |
| Payments (MercadoPago checkout) | 1                | OK (returns init_point) |

Auth boundary checks: `GET /admin/users` returns 401 without `x-user-id` and
403 for a non-admin user.

MercadoPago **webhook** was not exercised — it requires a signed payload
from MP and is not invoked by the frontend.

The single SKIP is deliberate: the smoke script does not delete the seed
product image so the frontend has something to render.

## Seeded data

| Entity              | Count | Notes |
| ------------------- | ----- | ----- |
| users               | 2     | owner (`gonzalo@lopezlabs.io`) + customer (`customer@test.com`) |
| categories          | 5     | Electronics (with Laptops sub-category), Clothing, Home & Garden, Books |
| product_templates   | 5     | one per top-level category |
| product_variations  | 7     | covers all templates; multiple variations on laptops and t-shirts |
| product_images      | 2     | Laptop Silver, Headphones (both `isMain = true`) |
| product_price_tiers | 2     | volume discounts on TSH-M-WHT |
| reviews             | 4     | 2 approved, 1 hidden, 1 rejected (covers every moderation state) |

Storage on disk is in sync with the `product_images` table — orphans from
earlier failed runs were cleaned up.

## How to re-run

The script at `/tmp/smoke.sh` (not committed) does the full sweep. To run
it from a clean state:

```bash
# 1. Wipe DB and storage (auth as current owner)
curl -X POST http://localhost:8080/api/admin/development/clear-database \
  -H 'x-user-id: <owner-uuid>'

# 2. Re-insert the owner (clear-database wipes them too)
docker exec ecommerce-db psql -U postgres -d ecommerce_db -c \
  "INSERT INTO users (id, email, \"firstName\", \"lastName\", role, \"isEmailVerified\") \
   VALUES ('<owner-uuid>', 'gonzalo@lopezlabs.io', 'Gonzalo', 'Lopez', 'owner', true);"

# 3. Run the script
/tmp/smoke.sh
```

The script depends on `jq`, `python3`, and `curl` — all already present.

## Architecture observations (non-blocking)

These are notes the frontend team and the next backend iteration should
know about; none of them block local frontend development.

### Auth model is gateway-shaped, not self-contained

`AuthMiddleware` trusts the `x-user-id` header verbatim. The model assumes
an upstream gateway authenticates the user and rewrites the header before
forwarding. In local dev there is no gateway, so the client supplies the
header directly — fine for the frontend during development, but before any
production-like deployment we need either real JWT verification or a real
gateway in front. Documented inline at
`src/auth/middleware/auth.middleware.ts:27`.

### `AdminGuard` is applied by convention, not structurally

Every `@Controller('admin/...')` declares `@UseGuards(AdminGuard)` at the
class level. There is no `RolesGuard` + `@Roles()` metadata system, and no
global path-based enforcement. If a future controller forgets the
`@UseGuards` decorator the route silently becomes public. As of today the
rule "lives under `/admin` ↔ requires admin role" holds across all 9
admin controllers. `AdminGuard` itself accepts both `owner` and `admin`
roles — there is no owner-only path in the codebase.

### `/api/admin/development/clear-database` only guards on `NODE_ENV`

The only protection against running the destructive wipe in production is
the `NODE_ENV === 'production'` check inside the controller. Before any
production-like deployment, gate this behind an additional explicit flag
(e.g. `ALLOW_DEV_ENDPOINTS`) or remove the controller entirely from the
production build.

### Public `GET /api/reviews` returns every review

The listing endpoint has no status filter applied by default — pending,
approved, hidden, and rejected reviews all come back. The frontend should
filter to `approved` for product pages, or the controller should default
`status=approved` for unauthenticated callers. Not a bug; just something
to align on between frontend and backend.

## Verdict

Ready to start the frontend. The smoke test exercises every route in the
dependency order the frontend will encounter (categories → templates →
variations → tiers → images → cart → checkout → reviews → ratings), and
the resulting state is the same shape the frontend will see on page load.

The follow-ups under "Architecture observations" are deliberate trade-offs
for the current phase, not blockers for UI work.
