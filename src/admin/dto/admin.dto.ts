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
  Max,
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

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

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
  /**
   * Free-form label: "100x60", "2 plazas", "Único", "King"… Anything the
   * product needs; it is not parsed as a measurement.
   */
  @IsString()
  @MaxLength(60)
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
  @IsIn([UserRole.ADMIN, UserRole.EDITOR, UserRole.SALES, UserRole.CUSTOMER])
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

  @IsIn([UserRole.ADMIN, UserRole.EDITOR, UserRole.SALES, UserRole.CUSTOMER])
  role: UserRole;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;
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

  /** 0 = photo untouched, 60 = heavy veil. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  overlayOpacity?: number;

  /** 0 = show the top of the photo, 100 = show the bottom. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePosition?: number;
}

export class UpdateReviewStatusDto {
  @IsIn(['approved', 'rejected', 'pending', 'hidden'])
  status: string;
}
