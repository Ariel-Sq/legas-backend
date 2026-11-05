import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductsModule } from '@app/products/products.module';
import { UsersModule } from '@app/users/users.module';
import { SiteModule } from '@app/site/site.module';

/**
 * Cart module for shopping cart functionality
 * Supports both authenticated users and anonymous sessions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    ProductsModule,
    UsersModule,
    SiteModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
