/**
 * Checkout payment modes.
 *
 * Catalogue prices are the cash / transfer price ("precio de contado").
 * The shopper chooses how to pay in OUR checkout:
 *  - `mercadopago`: pay online now (card, debit or account money — all the
 *    same to us). Gets a 15% surcharge (list price), split into up to
 *    MERCADOPAGO_MAX_INSTALLMENTS installments financed by MP.
 *    Goes through Checkout Pro.
 *  - `offline`: transfer or cash, coordinated by WhatsApp after placing the
 *    order. Pays the catalogue price (no surcharge, no discount).
 *
 * Keep these constants in sync with the frontend (lib/pricing.ts and
 * components/checkout-client.tsx).
 */

export const CHECKOUT_PAYMENT_METHODS = ['mercadopago', 'offline'] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/**
 * Surcharge for any MercadoPago payment over the cash price.
 * 0.15 = 15% → list price.
 */
export const MERCADOPAGO_SURCHARGE_RATE = 0.15;

/**
 * Installments offered on the MercadoPago screen.
 */
export const MERCADOPAGO_MAX_INSTALLMENTS = 6;

/**
 * Deposit for cash/transfer orders picked up at the shop: 50% by transfer to
 * reserve the piece, balance on pickup. Exact half — no rounding. Shipments
 * never use a deposit, and MercadoPago always pays the full amount up front.
 */
export const PICKUP_DEPOSIT_RATE = 0.5;

/**
 * Transfer / cash discount: 0 = catalogue price is already the cash price.
 */
export const TRANSFER_DISCOUNT_RATE = 0;

export const DEFAULT_PAYMENT_METHOD: CheckoutPaymentMethod = 'mercadopago';
