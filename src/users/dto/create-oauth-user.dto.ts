import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuthProvider } from '../entities/user.entity';

/**
 * Server-to-server (frontend → backend) registration for OAuth users.
 * The caller has already validated the OAuth provider's token before
 * hitting this endpoint, so we trust the email + provider it forwards.
 *
 * TODO: lock this down — share a secret between Next and Nest, or
 * accept the provider's id_token here and verify it server-side.
 */
export class CreateOAuthUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.GOOGLE })
  @IsEnum(AuthProvider)
  authProvider: AuthProvider;
}
