export interface PaymentData {
  id: string;
  status: string;
  status_detail: string;
  payment_method_id: string;
  external_reference?: string;
}

/**
 * 3-D Secure challenge data returned by MercadoPago when a card payment
 * needs the shopper to authenticate with their bank. The frontend renders
 * the Status Screen Brick with these values to show the challenge inline.
 */
export interface MpThreeDsInfo {
  external_resource_url?: string;
  creq?: string;
}

/** Result of charging a tokenized card on our own checkout. */
export interface CardPaymentResult {
  orderId: string;
  paymentId: string;
  /** MercadoPago status: approved | pending | in_process | rejected | ... */
  status: string;
  /** MercadoPago status_detail, e.g. `pending_challenge`. */
  statusDetail: string;
  /** Shopper-facing message for that status. */
  statusMessage: string;
  /** Present when the bank requires a 3DS challenge. */
  threeDs?: {
    externalResourceUrl: string;
    creq: string;
  };
}
