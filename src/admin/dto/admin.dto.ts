import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole } from '@app/users/entities/user.entity';

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

export class CreateVariationDto {
  /** Size as typed by the shop, e.g. "100x60" or "100x60x40". */
  @IsString()
  @MaxLength(40)
  medida: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}

export class UpdateVariationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateImageDto {
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;
}

export class UpdateUserRoleDto {
  @IsIn([UserRole.ADMIN, UserRole.EDITOR, UserRole.CUSTOMER])
  role: UserRole;
}

export class UpdateOrderStatusDto {
  @IsIn([
    'pending_transfer',
    'paid_preparing',
    'paid_ready_to_ship',
    'paid_shipped',
    'paid_delivered',
    'cancelled',
    'refunded',
  ])
  status: string;
}

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsIn([UserRole.ADMIN, UserRole.EDITOR, UserRole.CUSTOMER])
  role: UserRole;
}

export class UpdateHeroDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subheadline?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  ctaHref?: string;

  @IsOptional()
  @IsBoolean()
  showText?: boolean;
}
