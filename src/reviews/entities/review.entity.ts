import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { ProductVariation } from '../../products/entities/product-variation.entity';
import { Order } from '../../payments/entities/order.entity';
import { ReviewImage } from './review-image.entity';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
  FLAGGED = 'flagged',
}

@Entity('reviews')
@Index(['productVariationId'])
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['isVerifiedPurchase'])
export class Review {
  @ApiProperty({
    description: 'Unique identifier for the review',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID of the user who wrote the review',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ApiPropertyOptional({
    description: 'User who wrote the review',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ApiPropertyOptional({
    description:
      'Snapshot of the author display name, kept after the account is deleted',
    example: 'Juan Pérez',
    maxLength: 200,
  })
  @Column({ type: 'varchar', length: 200, nullable: true })
  authorName: string | null;

  @ApiProperty({
    description: 'ID of the product variation being reviewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  productVariationId: string;

  @ApiPropertyOptional({
    description: 'Product variation being reviewed',
    type: () => ProductVariation,
  })
  @ManyToOne(() => ProductVariation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productVariationId' })
  productVariation: ProductVariation;

  @ApiPropertyOptional({
    description: 'ID of the order associated with this review',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @ApiPropertyOptional({
    description: 'Order associated with this review',
    type: () => Order,
  })
  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ApiProperty({
    description: 'Title of the review',
    example: 'Great product!',
    maxLength: 200,
  })
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiProperty({
    description: 'Content of the review',
    example: 'This product exceeded my expectations...',
  })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    description: 'Rating given by the user (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @Column({ type: 'smallint' })
  rating: number;

  @ApiProperty({
    description: 'Whether this review is from a verified purchase',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  isVerifiedPurchase: boolean;

  @ApiProperty({
    description: 'Current status of the review',
    enum: ReviewStatus,
    example: ReviewStatus.APPROVED,
  })
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @ApiProperty({
    description: 'Number of helpful votes this review has received',
    example: 15,
  })
  @Column({ type: 'integer', default: 0 })
  helpfulVotes: number;

  @ApiProperty({
    description: 'Number of times this review has been reported',
    example: 2,
  })
  @Column({ type: 'integer', default: 0 })
  reportCount: number;

  @ApiPropertyOptional({
    description: 'Reason for moderation action',
    example: 'Contains inappropriate content',
  })
  @Column({ type: 'text', nullable: true })
  moderationReason: string;

  @ApiPropertyOptional({
    description: 'ID of the moderator who took action',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  moderatedBy: string;

  @ApiPropertyOptional({
    description: 'Images attached to this review',
    type: () => [ReviewImage],
  })
  @OneToMany(() => ReviewImage, (image) => image.review, {
    cascade: true,
    eager: true,
  })
  images: ReviewImage[];

  @ApiProperty({
    description: 'Date when the review was created',
    example: '2023-10-01T12:00:00.000Z',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the review was last updated',
    example: '2023-10-01T12:00:00.000Z',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
