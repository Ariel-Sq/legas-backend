# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **npm only** (do not use yarn/pnpm). Node version is pinned via `.nvmrc` (Node 22).

```bash
npm run start:dev          # dev server with watch
npm run start:prod         # run compiled dist/main.js
npm run build              # nest build
npm run lint               # eslint --fix on src/, apps/, libs/, test/
npm run format             # prettier on src/ and test/

npm test                   # jest (unit + spec files in src/)
npm run test:watch
npm run test:cov
npm run test:e2e           # uses test/jest-e2e.json
npx jest path/to/file.spec.ts             # single test file
npx jest -t "test name pattern"           # filter by test name
```

### Database / migrations

The TypeORM CLI is wired to `src/typeorm.config.ts` (separate from the runtime NestJS DataSource in `app.module.ts`).

```bash
npm run migration:generate -- src/database/migrations/MyMigrationName
npm run migration:run
npm run migration:revert
```

Notes on migrations:
- Runtime config has `migrationsRun: true` and reads from `dist/database/migrations/*.js`, so migrations run automatically on app boot. **You must `npm run build` before they will pick up.**
- The CLI config (`typeorm.config.ts`) reads `src/database/migrations/*.ts` — keep both pointing at the same set.
- `synchronize: false` everywhere — never enable schema sync; always write a migration.

### Docker

```bash
docker-compose up -d postgres   # just the DB
docker-compose up               # full stack (app on :3001, db on :5432)
```

The app container's `CMD` runs migrations then `start:prod`.

## Architecture

NestJS 11 modular monolith. `AppModule` (`src/app.module.ts`) wires every feature module plus a global `ThrottlerGuard` and async TypeORM root. `main.ts` applies four cross-cutting concerns to **every** route:

1. `app.setGlobalPrefix('api')` — all routes are mounted under `/api`.
2. Global `AuthMiddleware` (applied via `app.use`, not `MiddlewareConsumer`) — see below.
3. Global `ValidationPipe` with `whitelist + forbidNonWhitelisted + transform` — DTOs strip and reject unknown properties; controller params are auto-transformed to declared types.
4. Global `GlobalExceptionFilter` — normalizes all errors to `{ statusCode, message, error, timestamp, path }` and logs with request context.

Swagger is at `/api/docs` (JSON at `/api/docs-json`), with `x-user-id` registered as the API key security scheme.

### Auth model (important — read before touching cart/payments/users)

`AuthMiddleware` (`src/auth/middleware/auth.middleware.ts`) is the single source of truth for user identity and runs **globally** before any controller. It sets `req.user` to one of:

- **Authenticated**: valid `Authorization: Bearer <JWT>` header → `{ id: <jwt sub>, type: 'authenticated', isAuthenticated: true }`. The JWT is issued by this service (`src/auth/jwt.util.ts`, signed with `JWT_SECRET`) after `POST /api/auth/google` verified a Google `id_token`. A present-but-invalid token degrades to anonymous; route guards decide whether auth is required. There is no trusted `x-user-id` header.
- **Anonymous**: no/invalid Bearer → reads `sessionId` from cookie (`sessionId`) or `x-session-id` header; if missing, mints a UUID and sets the cookie (`httpOnly`, 30-day `maxAge`). `req.user.id` becomes the session ID.

Controllers consume this through the `@UserInfo()` param decorator (`src/auth/decorators/user-info.decorator.ts`), which returns `{ userId?, sessionId?, isAuthenticated, isAnonymous }`. **Never read auth headers or session cookies directly in controllers** — use the decorator so the abstraction holds.

`AdminGuard` (`src/auth/guards/admin.guard.ts`) enforces `isAuthenticated` and then loads the user from the DB to check `role === OWNER || ADMIN` (403 otherwise). `AuthenticatedGuard` is the lighter "must be logged in" check.

### Cart / session continuity

`CartService.getOrCreateCart(userId?, sessionId?)` is the canonical lookup — it finds-or-creates a cart keyed on whichever identifier the caller has. This is why anonymous users keep their cart across requests (sessionId cookie) and why every cart-touching controller calls `getOrCreateCart` before doing item mutations. When mutating quantities, the service recomputes `totalItems`/`totalPrice` and persists; volume-based pricing is resolved via `ProductVariationsService.getPriceForQuantity` → `ProductPriceTiersService`.

### Products domain

`ProductsModule` exposes four entity types as one cohesive feature:
- `ProductTemplate` — the SKU-less parent (name, slug, categories, specifications JSON).
- `ProductVariation` — the actual buy-able unit (SKU, stock, base price, images).
- `ProductImage` — many-per-variation.
- `ProductPriceTier` — quantity-bracketed pricing per variation (volume discounts).

Templates have `eager: true` on `variations`, and variations cascade from templates. Categories are joined many-to-many via `product_templates_categories`. Path: `controllers/` and `services/` subfolders contain the templates + price-tier code; the legacy `products.controller.ts` / `products.service.ts` at the module root handle variations.

### Payments (MercadoPago)

`PaymentsModule` registers `WebhookValidatorMiddleware` only for `payments/mercadopago/webhook` via `MiddlewareConsumer` (the only module-scoped middleware in the app). Checkout is built **from the current cart** — `POST /api/payments/mercadopago/checkout` looks up the user/session cart, validates stock, then creates the MP preference. `OrderService` is exported so other modules can compose order creation.

### Storage abstraction

`StorageModule` provides a `'StorageService'` token bound at module-construction time to either `StorageServiceSupabase` or `StorageServiceLocal` based on `STORAGE_TYPE` env (`SUPABASE` | `LOCAL`). Always inject via `@Inject('StorageService') storage: IStorageService` — don't import the concrete classes.

### Development module

`DevelopmentModule` exposes `POST /api/development/clear-database` which truncates all tables in FK-dependency order and wipes storage. It self-disables when `NODE_ENV === 'production'` — but the check is the only guard, so do not expose this controller in any prod-like environment.

### Path aliases

Defined in both `tsconfig.json` and Jest's `moduleNameMapper` (in `package.json`). Keep these in sync if you add new ones.

```
@app/*      → src/*
@common/*   → src/common/*
@config/*   → src/config/*
@core/*     → src/core/*
@modules/*  → src/modules/*
@health/*   → src/health/*
```

Always import via `@app/...` rather than relative paths across module boundaries.

## Conventions

- **All code, comments, and docstrings are written in English**, even when the conversation with the developer is in Spanish.
- TypeScript is strict (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`) — `strictPropertyInitialization` is the only one disabled, which is why TypeORM entity columns can be declared without `!`.
- Throw NestJS exceptions (`NotFoundException`, `BadRequestException`, `UnauthorizedException`, …) with descriptive messages; the global filter handles formatting.
- Decorate every endpoint with `@ApiOperation` / `@ApiResponse` so Swagger stays usable.
- Migration filenames follow `<timestamp>-<PascalCaseDescription>.ts`; the timestamp must be unique and chronological (TypeORM orders by it).
