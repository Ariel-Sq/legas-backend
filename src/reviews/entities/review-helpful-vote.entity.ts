import { Entity, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity('review_helpful_votes')
export class ReviewHelpfulVote {
  @PrimaryColumn('uuid')
  reviewId: string;

  @PrimaryColumn('uuid')
  userId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
