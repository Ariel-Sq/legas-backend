import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity('review_reports')
export class ReviewReport {
  @PrimaryColumn('uuid')
  reviewId: string;

  @PrimaryColumn('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
