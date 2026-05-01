import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { User } from './entities/user.entity';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, AdminGuard],
  exports: [UsersService],
})
export class UsersModule {}
