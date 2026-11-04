import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Key/value store for the shop configuration the panel edits without a
 * deploy (marquee text, payment methods, shipping hints). Keys are fixed:
 * `marquee`, `payments`, `shipping`.
 */
@Entity('store_settings')
export class StoreSetting {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  key: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  value: Record<string, unknown>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
