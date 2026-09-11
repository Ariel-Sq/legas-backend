/**
 * Checkout payment modes.
 *
 * Catalogue prices are the list price. The shopper chooses how to pay in OUR
 * checkout:
 *  - `mercadopago`: pay online now (card, debit or account money — all the
 *    same to us). List price, split into up to MERCADOPAGO_MAX_INSTALLMENTS
 *    installments financed by MP. Goes through Checkout Pro.
 *  - `offline`: transfer or cash, coordinated by WhatsApp after placing the
 *    order. Gets TRANSFER_DISCOUNT_RATE off the list price.
 *
 * Keep these constants in sync with the frontend (lib/pricing.ts and
 * components/checkout-client.tsx).
 */

export const CHECKOUT_PAYMENT_METHODS = ['mercadopago', 'offline'] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/**
 * Flat surcharge for any MercadoPago payment (card, debit, account money).
 * 0 = list price; the shopper pays MP's own financing cost when they pick
 * installments.
 */
export const MERCADOPAGO_SURCHARGE_RATE = 0;

/**
 * Installments offered on the MercadoPago screen. 6 to match the advertised
 * "6 cuotas sin interés" (the interest-free part itself is configured on the
 * MercadoPago seller account, not here).
 */
export const MERCADOPAGO_MAX_INSTALLMENTS = 6;

/**
 * Discount off the list price for transfer / cash payments. 0.3 = 30% off.
 */
export const TRANSFER_DISCOUNT_RATE = 0.3;

export const DEFAULT_PAYMENT_METHOD: CheckoutPaymentMethod = 'mercadopago';
