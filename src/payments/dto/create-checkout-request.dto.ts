import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Optional body for POST /api/payments/mercadopago/checkout. The shopper
 * fills in their contact info on the frontend form; we snapshot it onto
 * the order so coordinating delivery later doesn't need a join (or, for
 * anon orders, doesn't need anything beyond the order itself).
 */
export class CreateCheckoutRequestDto {
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
