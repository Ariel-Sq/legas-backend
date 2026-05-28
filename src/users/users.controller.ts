import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { AuthenticatedGuard } from '@app/auth/guards/authenticated.guard';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import type { UserInfoType } from '@app/auth/decorators/user-info.decorator';

/**
 * Public registration + self-service profile. OAuth provisioning happens in
 * AuthController (POST /auth/google); reads/updates of other users live in
 * AdminUsersController under /api/admin/users.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new user (public)' })
  @ApiResponse({ status: 201, description: 'User registered.', type: User })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
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
