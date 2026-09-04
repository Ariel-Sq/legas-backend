/**
 * Checkout payment modes.
 *
 * Catalogue prices are the cash/transfer prices. The shopper chooses how to
 * pay in OUR checkout:
 *  - `mercadopago`: pay online now (card, debit or account money — all the
 *    same to us). List price, no surcharge; the shopper chooses installments
 *    financed by MP. Goes through Checkout Pro.
 *  - `offline`: transfer or cash, coordinated by WhatsApp after placing the
 *    order. Same list price, no MercadoPago preference.
 *
 * Keep MERCADOPAGO_SURCHARGE_RATE in sync with the frontend constant in
 * components/checkout-client.tsx.
 */

export const CHECKOUT_PAYMENT_METHODS = ['mercadopago', 'offline'] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/**
 * Flat surcharge for any MercadoPago payment (card, debit, account money).
 * 0 = list price for every method; the shopper pays MP's own financing cost
 * when they pick installments.
 */
export const MERCADOPAGO_SURCHARGE_RATE = 0;

/**
 * Installments cap offered on the MercadoPago screen. High so the shopper
 * freely chooses how many installments to finance through MercadoPago.
 */
export const MERCADOPAGO_MAX_INSTALLMENTS = 12;

export const DEFAULT_PAYMENT_METHOD: CheckoutPaymentMethod = 'mercadopago';
