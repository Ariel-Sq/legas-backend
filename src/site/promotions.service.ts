import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';

/**
 * Resolves which percentage discount applies to a product. One place decides,
 * so the shop, the cart and the order always agree.
 */
@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promos: Repository<Promotion>,
    @InjectRepository(ProductVariation)
    private readonly variations: Repository<ProductVariation>,
  ) {}

  /** Promotions in force right now (active flag + date window). */
  async activePromotions(): Promise<Promotion[]> {
    const now = new Date();
    const rows = await this.promos.find({ where: { isActive: true } });
    return rows.filter(
      (promo) =>
        (!promo.startsAt || promo.startsAt <= now) &&
        (!promo.endsAt || promo.endsAt >= now),
    );
  }

  /** Highest matching discount for a product (0 = none). */
  bestPercent(
    promos: Promotion[],
    templateId: string | null,
    categoryIds: string[],
  ): number {
    let best = 0;
    for (const promo of promos) {
      const matches =
        promo.scope === 'all' ||
        (promo.scope === 'product' && promo.templateId === templateId) ||
        (promo.scope === 'category' &&
          (!promo.categoryId || categoryIds.includes(promo.categoryId)));
      if (!matches) continue;
      best = Math.max(best, promo.percent);
    }
    return Math.min(90, Math.max(0, best));
  }

  /** Discount for one variant (used by the cart and the checkout). */
  async percentForVariation(variationId: string): Promise<number> {
    const variation = await this.variations.findOne({
      where: { id: variationId },
      relations: ['template', 'template.categories'],
    });
    if (!variation) return 0;

    const promos = await this.activePromotions();
    if (promos.length === 0) return 0;

    const categoryIds = (variation.template?.categories ?? []).map((c) => c.id);
    return this.bestPercent(promos, variation.template_id, categoryIds);
  }

  /** Apply a percentage to a price, rounded to cents. */
  apply(price: number, percent: number): number {
    if (!percent) return price;
    return Math.round(price * (100 - percent)) / 100;
  }
}
