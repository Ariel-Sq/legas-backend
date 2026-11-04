import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Extra hero banner for the home carousel. When at least one active slide
 * exists the storefront shows a carousel; otherwise it falls back to the
 * single hero configured in `hero_banner`.
 */
@Entity('hero_slides')
export class HeroSlide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  imagePath: string;

  @Column({ type: 'varchar', length: 120, default: '' })
  headline: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  subheadline: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  ctaLabel: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  ctaHref: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
