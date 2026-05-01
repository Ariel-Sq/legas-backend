import { Module } from '@nestjs/common';
import { DevelopmentController } from './development.controller';
import { DatabaseService } from '../database/database.service';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '@app/users/users.module';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@Module({
  imports: [StorageModule, UsersModule],
  controllers: [DevelopmentController],
  providers: [DatabaseService, AdminGuard],
  exports: [DatabaseService],
})
export class DevelopmentModule {}
