import {
  IsString,
  IsNumber,
  IsBoolean,
  IsObject,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * MercadoPago does not commit to consistent types in webhook payloads:
 * - `id` is a numeric string in test events but documented as either
 *   string or number depending on event type.
 * - `application_id` is omitted in some test events.
 * - `user_id` can be a number (live) or a numeric string (some tests).
 * Validations below were loosened to match what the upstream actually
 * sends, instead of what the docs claim.
 */
export class WebhookNotificationDto {
  @ApiProperty({
    description: 'The ID of the notification',
    example: '1234567890',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Whether the notification is from live mode or test mode',
    example: true,
  })
  @IsBoolean()
  live_mode: boolean;

  @ApiProperty({
    description: 'The type of notification (e.g., payment, subscription, etc.)',
    example: 'payment',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'When the notification was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  date_created: string;

  @ApiPropertyOptional({
    description: 'The application ID (omitted by MP test events)',
    example: 123456789012345,
  })
  @IsOptional()
  @IsNumber()
  application_id?: number;

  @ApiProperty({
    description: 'The user ID',
    example: 123456789,
  })
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'The version of the API',
    example: 'v1',
  })
  @IsString()
  api_version: string;

  @ApiProperty({
    description: 'The action that triggered the notification',
    example: 'payment.created',
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'The data object containing the resource ID',
    example: { id: '1234567890' },
  })
  @IsObject()
  data: {
    id: string | number;
  };
}
