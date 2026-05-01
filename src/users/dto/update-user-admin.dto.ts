import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { AuthProvider, UserRole } from '../entities/user.entity';

/**
 * Admin-only DTO. Adds role/authProvider mutation on top of the public fields.
 * Used exclusively under /api/admin/users/:id (PATCH).
 */
export class UpdateUserAdminDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: AuthProvider })
  @IsEnum(AuthProvider)
  @IsOptional()
  authProvider?: AuthProvider;
}
