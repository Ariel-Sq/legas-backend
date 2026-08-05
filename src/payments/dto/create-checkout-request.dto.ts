import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CHECKOUT_PAYMENT_METHODS,
  type CheckoutPaymentMethod,
} from '../payment-method.config';

/**
 * Optional body for POST /api/payments/mercadopago/checkout. The shopper
 * fills in their contact info on the frontend form; we snapshot it onto
 * the order so coordinating delivery later doesn't need a join (or, for
 * anon orders, doesn't need anything beyond the order itself).
 */
export class CreateCheckoutRequestDto {
  @ApiPropertyOptional({
    description:
      'How the shopper will pay inside MercadoPago. Drives the surcharge ' +
      '(account_money/debit +10%, credit_card +20%) and which payment ' +
      'methods the MP screen offers. Defaults to credit_card.',
    enum: CHECKOUT_PAYMENT_METHODS,
  })
  @IsOptional()
  @IsIn(CHECKOUT_PAYMENT_METHODS)
  paymentMethod?: CheckoutPaymentMethod;
  @ApiPropertyOptional({ example: 'cliente@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional({ example: '+54 9 11 1234-5678' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;
}
