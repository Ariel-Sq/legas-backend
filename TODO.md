# Ecommerce Backend - TODO List

This document outlines planned enhancements and features for the Ecommerce backend application.

## Completed Features

- [x] Basic Swagger documentation setup
- [x] Basic Products CRUD operations
- [x] File storage with Supabase integration
- [x] API documentation with Swagger
- [x] Database migrations with TypeORM
- [x] Rate limiting protection
- [x] Health check endpoint
- [x] Docker setup for development
- [x] Support multiple images per product and zoom feature
- [x] Cart full implementation
- [x] Proxy images
- [x] Add user roles (owner, admin, customer)
- [x] Support for OAuth providers (Google, Facebook)
- [x] Improve database schema
- [x] Create Cart entity to store temporary orders
- [x] Add endpoints for cart management
- [x] MercadoPago checkout + webhook + order lifecycle (7 statuses)
- [x] Orders module (entity, history, status tracking, admin transitions)
- [x] Reviews module (entity, ratings, moderation, "my reviews")
- [x] Search / pagination on products (frontend does it in-process today;
      see "Native query support" below for the backend follow-up)
- [x] Wishlist module (per-user, AuthenticatedGuard, idempotent POST)
- [x] PATCH /api/users/me + GET /api/users/by-id/:id

## Ops checklist (admin runs via chat)

- [ ] **Al revisar órdenes, chequear pagos huérfanos**: un pago aprobado
      sobre una orden cancelada = plata cobrada con stock ya devuelto
      (checkout superseded/expirado que igual se pagó). El webhook lo
      registra y loguea error, pero los logs de Vercel Hobby duran ~1h —
      la señal durable es esta query:

      ```sql
      SELECT o.id, o."customerEmail", p."transactionId", p."createdAt"
      FROM orders o JOIN order_payment_details p ON p."orderId" = o.id
      WHERE o.status = 'cancelled' AND p.status = 'approved';
      ```

      Si devuelve filas: reembolsar desde el panel de MP o reconfirmar la
      orden ajustando stock a mano.

## Next Steps

- [ ] Native `q` / `page` / `limit` support on `/api/product-templates`.
      Today the frontend's `getShopProductsPage` fetches every template
      and filters + paginates in-process. Works fine for ~50 SKUs but
      each /shop render pulls the full catalogue (with variations and
      reviews) — on serverless + Neon this is the main perf cost.
- [ ] Implement certificate authentication between the backend and the
      frontend. Header signature with the certificate. (Optional
      hardening — per-user auth is already JWT-based.)
- [x] ~~Lock down `/api/users/oauth` and `/api/users/by-id/:id`~~ —
      resolved by the auth refactor: those endpoints no longer exist.
      OAuth provisioning goes through POST /api/auth/google (verifies the
      Google id_token) and user reads live under /api/admin/users.
- [x] ~~Check AuthMiddleware / UserInfo / AuthenticatedGuard~~ — identity
      now comes solely from a backend-signed Bearer JWT; the trusted
      x-user-id header is gone.

## Nice to have

### Housekeeping

- [ ] Scheduled job to delete orphan anonymous carts. When an anon user
      logs in, `getOrCreateCart` switches to looking up by `userId`, so
      the old `sessionId`-keyed cart and its items stay in the DB
      untouched. A periodic job (`@nestjs/schedule`, daily) should drop
      carts where `userId IS NULL AND updatedAt < now() - INTERVAL '30 days'`
      (or whatever the session cookie maxAge is) plus their cart_items.
      Optional: also clear the sessionId cookie on logout so a returning
      anon doesn't resurrect the abandoned cart.

### Reviews

- [ ] Add support to upload images in review endpoints.

### Authentication & Authorization

- [ ] Implement JWT-based authentication.

### Inventory Management

- [ ] Track product stock levels with dedicated inventory system.
- [ ] Add automatic inventory updates on order placement.

### Cache Implementation

- [ ] Add Redis caching for frequently accessed data.
- [ ] Cache product listings and other high-volume endpoints.

### Webhooks & Notifications

- [ ] Email / push notification system for order status changes
      (MercadoPago webhook is already wired; this is the outbound side).
