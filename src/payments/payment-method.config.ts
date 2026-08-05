/**
 * Payment-method dependent checkout configuration.
 *
 * Catalogue prices are cash/transfer prices; paying online through
 * MercadoPago carries a surcharge that depends on how the shopper pays.
 * The shopper picks the method in OUR checkout (Checkout Pro cannot price
 * per method inside one preference), and the preference both applies the
 * matching surcharge and restricts the MP screen to the matching methods —
 * so nobody can pick the cheap surcharge and still pay with credit.
 *
 * Keep the rates in sync with the frontend constant in
 * components/checkout-client.tsx.
 */

export const CHECKOUT_PAYMENT_METHODS = [
  'account_money',
  'credit_card',
] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

interface PaymentMethodConfig {
  /** Surcharge over catalogue (cash/transfer) prices. */
  surchargeRate: number;
  /** MP payment types to EXCLUDE for this choice. */
  excludedPaymentTypes: { id: string }[];
  /** Max installments offered (credit only — irrelevant otherwise). */
  maxInstallments: number;
}

export const PAYMENT_METHOD_CONFIG: Record<
  CheckoutPaymentMethod,
  PaymentMethodConfig
> = {
  // Own money (MP balance or debit): cheap for the seller → +10%.
  // Credit and cash-ticket channels are blocked so the discount can't leak.
  account_money: {
    surchargeRate: 0.1,
    excludedPaymentTypes: [
      { id: 'credit_card' },
      { id: 'ticket' },
      { id: 'atm' },
    ],
    maxInstallments: 1,
  },
  // Credit card: +20%, capped at 3 installments ("hasta 3 cuotas sin
  // interés" — the interest-free part is enabled in the seller's MP panel).
  // Debit is blocked so nobody overpays by mistake (it belongs to the +10%
  // option). account_money CANNOT be excluded (MP API rejects it) — paying
  // with balance under the +20% option just overpays; the +10% option is
  // right next to it.
  credit_card: {
    surchargeRate: 0.2,
    excludedPaymentTypes: [
      { id: 'debit_card' },
      { id: 'ticket' },
      { id: 'atm' },
      { id: 'prepaid_card' },
    ],
    maxInstallments: 3,
  },
};

export const DEFAULT_PAYMENT_METHOD: CheckoutPaymentMethod = 'credit_card';
