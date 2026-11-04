import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Home page hero banner. Single-row table (the service always reads/updates
 * the first row), so marketing copy and the background image can change
 * without a deploy.
 */
@Entity('hero_banner')
export class HeroBanner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Storage key of the background image. The public URL is derived from it
   * (BACKEND_URL + /api/images/<path>), so the same row works on local disk
   * storage and on Vercel Blob.
   */
  @Column({ type: 'varchar', nullable: true })
  imagePath: string | null;

  @Column({ type: 'varchar', length: 120 })
  headline: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  subheadline: string;

  @Column({ type: 'varchar', length: 40, default: 'Ver Colección' })
  ctaLabel: string;

  @Column({ type: 'varchar', length: 300, default: '/shop' })
  ctaHref: string;

  /**
   * Whether the headline/subtitle/button are drawn on top of the image. A
   * banner designed with its own logo and text is shown as-is.
   */
  @Column({ type: 'boolean', default: true })
  showText: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
