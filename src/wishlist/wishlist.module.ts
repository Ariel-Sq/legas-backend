import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistItem } from './entities/wishlist-item.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';

/**
 * Wishlist module — per-user favorites list. Authenticated-only.
 * ProductVariation repo is registered locally so the service can validate
 * the FK before insert without pulling in the whole ProductsModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, ProductVariation])],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
