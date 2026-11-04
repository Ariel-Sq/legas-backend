import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeroBanner } from './entities/hero-banner.entity';
import { HeroSlide } from './entities/hero-slide.entity';
import { Promotion } from './entities/promotion.entity';
import { StoreSetting } from './entities/store-setting.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';
import { PromotionsService } from './promotions.service';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HeroBanner,
      HeroSlide,
      Promotion,
      StoreSetting,
      ProductVariation,
    ]),
  ],
  controllers: [SiteController],
  providers: [SiteService, PromotionsService],
  exports: [SiteService, PromotionsService],
})
export class SiteModule {}
