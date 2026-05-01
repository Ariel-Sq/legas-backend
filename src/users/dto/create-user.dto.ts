import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

/**
 * Public registration DTO. Does NOT accept `role` or `authProvider` —
 * both are forced server-side (role=customer, authProvider=local).
 * Role promotion is admin-only and lives in UpdateUserAdminDto.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'Password123!', required: false })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;
}
