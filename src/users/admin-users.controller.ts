import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { User } from './entities/user.entity';
import { AdminGuard } from '@app/auth/guards/admin.guard';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

@ApiTags('Admin / Users')
@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated user list.' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAllPaginated(query.page, query.limit);
  }

  @Get(':email')
  @ApiOperation({ summary: 'Get a user by email' })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('email') email: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user (admin)' })
  @ApiResponse({ status: 200, type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateUserAdminDto: UpdateUserAdminDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserAdminDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.usersService.remove(id);
    return { success: true, message: 'User deleted successfully' };
  }
}
