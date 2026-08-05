import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { AuthenticatedGuard } from '@app/auth/guards/authenticated.guard';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import type { UserInfoType } from '@app/auth/decorators/user-info.decorator';

/**
 * Self-service profile. There is intentionally NO public registration
 * endpoint: users are provisioned exclusively through Google sign-in
 * (POST /auth/google verifies the id_token and creates the user).
 * Reads/updates of other users live in AdminUsersController under
 * /api/admin/users.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get the current user’s profile',
    description:
      'Authoritative read of the logged-in user. The frontend session ' +
      'refresh (NextAuth update trigger) uses this to pick up profile ' +
      'changes without re-login.',
  })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async getMe(@UserInfo() userInfo: UserInfoType): Promise<User> {
    return this.usersService.findById(userInfo.userId!);
  }

  @Patch('me')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Update the current user’s profile',
    description:
      'Self-service update for contact and shipping fields. Email and role are not editable here.',
  })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async updateMe(
    @UserInfo() userInfo: UserInfoType,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.update(userInfo.userId!, dto);
  }
}
