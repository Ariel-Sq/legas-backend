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
- [x] Add endpoints for cart management- [x] Basic product retrieval
- [x] Basic rating and reviewCount fields on product entity
- [x] Basic stock status field on product entity

## Next Steps

- [ ] Implement MercadoPago 👷🏻‍♂️ S
      . When preference is created, the order should be created and the payment should be created with it and status should be pending.
      . If user goes to the checkout page, try to get the order and payment by the external reference. If not found, create a new one.
- [ ] Implement certificate authentication between the backend and the frontend. Header signature with the certificate.
- [ ] Check AuthMiddleware, UserInfo and AuthenticatedGuard to ensure proper user authentication flow.

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

## Images review

- [ ] Add support to upload images in review endpoints

## Authentication & Authorization

- [ ] Implement JWT-based authentication

## Orders Module

- [ ] Create Order entity with relationships to products
- [ ] Implement checkout process
- [ ] Add order history and status tracking

## Product Reviews & Ratings

- [ ] Create a dedicated Review entity linked to products and users
- [ ] Add endpoints for submitting and fetching reviews
- [ ] Calculate average ratings automatically

## Search & Filtering

- [ ] Implement advanced search functionality for products
- [ ] Add filtering by multiple criteria
- [ ] Add pagination and sorting options

## Inventory Management

- [ ] Track product stock levels with dedicated inventory system
- [ ] Add automatic inventory updates on order placement

## Payment Integration

- [ ] Integrate with payment gateways like Stripe or PayPal
- [ ] Implement payment status tracking

## Cache Implementation

- [ ] Add Redis caching for frequently accessed data
- [ ] Cache product listings and other high-volume endpoints

## Webhooks & Notifications

- [ ] Implement webhooks for third-party integrations
- [ ] Add notification system (email, push) for order updates
