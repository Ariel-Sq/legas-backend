import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';

/**
 * - `cash`: catalogue price → "all" and "offline" promos
 * - `offline`: only "offline" promos (used to keep them out of the card price)
 * - `mp`: only "mercadopago" promos ("all" is already inside the cash price)
 */
export type Channel = 'cash' | 'offline' | 'mp';

function channelMatches(method: string, channel: Channel): boolean {
  if (channel === 'cash') return method === 'all' || method === 'offline';
  if (channel === 'mp') return method === 'mercadopago';
  return method === 'offline';
}

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

  /**
   * Highest matching discount for a product (0 = none).
   *
   * `cash` = the catalogue price (transfer/cash, and the base the card price
   * is built from) → "all" and "offline" promos. `mp` = only "mercadopago"
   * promos, because an "all" promo is already inside the cash price and would
   * otherwise be charged twice.
   */
  bestPercent(
    promos: Promotion[],
    templateId: string | null,
    categoryIds: string[],
    channel: Channel = 'cash',
  ): number {
    let best = 0;
    for (const promo of promos) {
      const method = promo.method ?? 'all';
      if (!channelMatches(method, channel)) continue;

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
  async percentForVariation(
    variationId: string,
    channel: Channel = 'cash',
  ): Promise<number> {
    const variation = await this.variations.findOne({
      where: { id: variationId },
      relations: ['template', 'template.categories'],
    });
    if (!variation) return 0;

    const promos = await this.activePromotions();
    if (promos.length === 0) return 0;

    const categoryIds = (variation.template?.categories ?? []).map((c) => c.id);
    return this.bestPercent(
      promos,
      variation.template_id,
      categoryIds,
      channel,
    );
  }

  /** Apply a percentage to a price, rounded to cents. */
  apply(price: number, percent: number): number {
    if (!percent) return price;
    return Math.round(price * (100 - percent)) / 100;
  }
}
