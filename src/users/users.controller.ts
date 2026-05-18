import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateOAuthUserDto } from './dto/create-oauth-user.dto';
import { User } from './entities/user.entity';

/**
 * Public registration endpoint. Reads/updates of users live in
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

  @Post('oauth')
  @ApiOperation({
    summary: 'Find-or-create an OAuth user (server-to-server)',
    description:
      'Used by the NextAuth callback on the frontend to provision a user the first time they sign in with Google. Idempotent — returns the existing user if the email is already registered.',
  })
  @ApiResponse({ status: 201, type: User })
  async createOAuth(@Body() dto: CreateOAuthUserDto): Promise<User> {
    return this.usersService.createOrFindOAuthUser(dto);
  }

  @Get('by-email/:email')
  @ApiOperation({
    summary: 'Look up a user by email (public)',
    description:
      'Used by the OAuth post-login flow to find-or-create a user record.',
  })
  @ApiParam({ name: 'email' })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByEmail(@Param('email') email: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`No user with email ${email}`);
    }
    return user;
  }
}
