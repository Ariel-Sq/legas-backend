/**
 * Checkout payment modes.
 *
 * Catalogue prices are the cash / transfer price (the "real" price stored in
 * the DB). The shopper chooses how to pay in OUR checkout:
 *  - `mercadopago`: pay online now (card, debit or account money — all the
 *    same to us). Gets a LIST_PRICE_MARKUP surcharge on the catalogue price,
 *    split into up to MERCADOPAGO_MAX_INSTALLMENTS installments financed by MP.
 *    Goes through Checkout Pro.
 *  - `offline`: transfer or cash, coordinated by WhatsApp after placing the
 *    order. Pays the catalogue price with no markup.
 *
 * Keep these constants in sync with the frontend (lib/pricing.ts and
 * components/checkout-client.tsx).
 */

export const CHECKOUT_PAYMENT_METHODS = ['mercadopago', 'offline'] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/**
 * Surcharge over the cash/transfer price for any MercadoPago payment (card,
 * debit, account money). 0.20 = 20% markup → list price.
 */
export const MERCADOPAGO_SURCHARGE_RATE = 0.20;

/**
 * Installments offered on the MercadoPago screen. 6 to match the advertised
 * "6 cuotas sin interés" (the interest-free part itself is configured on the
 * MercadoPago seller account, not here).
 */
export const MERCADOPAGO_MAX_INSTALLMENTS = 6;

/**
 * Discount for transfer / cash payments. 0 = no discount — the catalogue
 * price is already the cash price.
 */
export const TRANSFER_DISCOUNT_RATE = 0;

export const DEFAULT_PAYMENT_METHOD: CheckoutPaymentMethod = 'mercadopago';
