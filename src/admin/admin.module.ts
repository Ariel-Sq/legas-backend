import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductTemplate } from '@app/products/entities/product-template.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';
import { ProductImage } from '@app/products/entities/product-image.entity';
import { Category } from '@app/categories/entities/category.entity';
import { User } from '@app/users/entities/user.entity';
import { UsersModule } from '@app/users/users.module';
import { StorageModule } from '@app/storage/storage.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductTemplate,
      ProductVariation,
      ProductImage,
      Category,
      User,
    ]),
    UsersModule,
    StorageModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService, AdminGuard],
})
export class AdminModule {}
