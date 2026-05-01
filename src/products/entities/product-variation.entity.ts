import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { ProductTemplate } from './product-template.entity';
import { ProductImage } from './product-image.entity';
import { ProductPriceTier } from './product-price-tier.entity';
import { Category } from '../../categories/entities/category.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('product_variations')
@Index(['template_id'])
@Index(['sku'])
@Index(['price'])
@Index(['attributes'])
@Index(['sort_order'])
export class ProductVariation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => ProductTemplate, (template) => template.variations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: ProductTemplate;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => ProductImage, (productImage) => productImage.variation, {
    cascade: true,
    eager: true,
  })
  images: ProductImage[];

  @OneToMany(() => ProductPriceTier, (priceTier) => priceTier.variation, {
    cascade: true,
    eager: true,
  })
  priceTiers: ProductPriceTier[];

  @ManyToMany(() => Category, (category) => category.productVariations)
  @JoinTable({
    name: 'product_variations_categories',
    joinColumn: { name: 'product_variation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @OneToMany(() => Review, (review) => review.productVariation, {
    cascade: true,
  })
  reviews: Review[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
