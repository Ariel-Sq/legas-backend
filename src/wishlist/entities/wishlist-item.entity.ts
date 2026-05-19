import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '@app/users/entities/user.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';

/**
 * Per-user wishlist entry. A user "favorites" a specific product variation;
 * the (userId, productVariationId) pair is unique so a product cannot be
 * favorited twice by the same user.
 *
 * Authenticated-only: anonymous shoppers do not have wishlist rows — the
 * frontend prompts them to sign in instead.
 */
@Entity('wishlist_items')
@Unique('UQ_wishlist_items_user_variation', ['userId', 'productVariationId'])
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_wishlist_items_userId')
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  productVariationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ProductVariation, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'productVariationId' })
  productVariation: ProductVariation;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
