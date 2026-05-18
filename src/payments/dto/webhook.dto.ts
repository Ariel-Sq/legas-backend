import {
  IsString,
  IsBoolean,
  IsObject,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * MercadoPago doesn't commit to consistent types in webhook payloads:
 * - top-level `id`, `application_id`, `user_id` can each arrive as a number
 *   or as a numeric string depending on the event type and origin.
 * - `application_id` is missing on some test events.
 *
 * The fields below are coerced to strings via @Transform so a single
 * validator suffices and downstream code reads a stable type.
 */
const toStringIfPresent = ({ value }: { value: unknown }) =>
  value == null ? value : String(value);

export class WebhookNotificationDto {
  @ApiProperty({
    description: 'The ID of the notification',
    example: '1234567890',
  })
  @Transform(toStringIfPresent)
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Whether the notification is from live mode or test mode',
    example: true,
  })
  @IsBoolean()
  live_mode: boolean;

  @ApiProperty({
    description: 'The type of notification (payment, test, subscription, ...)',
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
    description: 'The application ID (omitted by some MP test events)',
    example: '123456789012345',
  })
  @IsOptional()
  @Transform(toStringIfPresent)
  @IsString()
  application_id?: string;

  @ApiProperty({
    description: 'The user ID',
    example: '123456789',
  })
  @Transform(toStringIfPresent)
  @IsString()
  user_id: string;

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
