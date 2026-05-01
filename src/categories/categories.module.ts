import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesController } from './controllers/categories.controller';
import { AdminCategoriesController } from './controllers/admin-categories.controller';
import { CategoriesService } from './services/categories.service';
import { UsersModule } from '@app/users/users.module';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), UsersModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, AdminGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
