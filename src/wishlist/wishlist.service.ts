import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './entities/wishlist-item.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';
import { rewriteVariationImageUrls } from '@app/utils/image-url';

/**
 * Service for managing per-user wishlists.
 * Authenticated users only — anonymous wishlists are handled client-side.
 */
@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepository: Repository<WishlistItem>,
    @InjectRepository(ProductVariation)
    private readonly productVariationRepository: Repository<ProductVariation>,
  ) {}

  /**
   * List the user's wishlist items, newest first, with product variation
   * and images eagerly loaded so the frontend can render a card without a
   * second round-trip.
   */
  async list(userId: string): Promise<WishlistItem[]> {
    const items = await this.wishlistRepository.find({
      where: { userId },
      // productVariation is eager on the entity; images are eager on
      // ProductVariation itself, so we get both without extra relations.
      order: { createdAt: 'DESC' },
    });

    // Rewrite image URLs to the public /api/images path, same as cart/orders.
    for (const item of items) {
      rewriteVariationImageUrls(item.productVariation);
    }

    return items;
  }

  /**
   * Add a product variation to the user's wishlist. Idempotent: if the
   * (userId, productVariationId) row already exists we return the existing
   * row instead of throwing. Chose silent upsert over 409 so the frontend
   * (which may double-fire on optimistic UI) doesn't have to special-case
   * the duplicate response.
   */
  async add(userId: string, productVariationId: string): Promise<WishlistItem> {
    // Verify the product variation exists — otherwise the FK insert would
    // produce a less helpful 500-shaped error.
    const variation = await this.productVariationRepository.findOne({
      where: { id: productVariationId },
    });
    if (!variation) {
      throw new NotFoundException(
        `Product variation with ID ${productVariationId} not found`,
      );
    }

    const existing = await this.wishlistRepository.findOne({
      where: { userId, productVariationId },
    });
    if (existing) {
      rewriteVariationImageUrls(existing.productVariation);
      return existing;
    }

    const created = this.wishlistRepository.create({
      userId,
      productVariationId,
    });
    const saved = await this.wishlistRepository.save(created);

    // Re-load so the eager productVariation + images come along.
    const reloaded = await this.wishlistRepository.findOne({
      where: { id: saved.id },
    });
    // Defensive: should never be null since we just saved it.
    const result = reloaded ?? saved;
    rewriteVariationImageUrls(result.productVariation);
    return result;
  }

  /**
   * Remove a product variation from the user's wishlist.
   * Throws NotFoundException if the row doesn't exist so the controller can
   * surface a 404 — the controller itself returns 204 on success.
   */
  async remove(userId: string, productVariationId: string): Promise<void> {
    const result = await this.wishlistRepository.delete({
      userId,
      productVariationId,
    });
    if (!result.affected) {
      throw new NotFoundException(
        `Wishlist item for productVariation ${productVariationId} not found`,
      );
    }
  }
}
