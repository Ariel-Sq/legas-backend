import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
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
}
