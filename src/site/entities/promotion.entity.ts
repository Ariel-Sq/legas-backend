import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PromotionScope = 'all' | 'category' | 'product';
/** Which payment method the discount applies to. */
export type PromotionMethod = 'all' | 'mercadopago' | 'offline';

/**
 * Percentage discount. It is applied on top of the product price (and of the
 * quantity tier, when there is one), both in the shop and in the cart/order,
 * so the price the customer sees is the price that gets charged.
 */
@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** 1-90. */
  @Column({ type: 'int' })
  percent: number;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  scope: PromotionScope;

  /**
   * - all: lowers the catalogue (cash) price, so both methods get it
   * - offline: same as today (cash IS the transfer price), kept explicit
   * - mercadopago: only the card price (surcharge included) at checkout
   */
  @Column({ type: 'varchar', length: 20, default: 'all' })
  method: PromotionMethod;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  /** Product template id when scope = product. */
  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
