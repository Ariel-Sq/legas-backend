import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from '../entities/review.entity';
import { ReviewsService } from './reviews.service';

export interface ModerationAction {
  reviewId: string;
  action: 'approve' | 'reject' | 'hide' | 'flag';
  reason?: string;
  moderatedBy: string;
}

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly reviewsService: ReviewsService,
  ) {}

  async approveReview(
    reviewId: string,
    adminId: string,
    reason?: string,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new ForbiddenException('Review is already approved');
    }

    review.status = ReviewStatus.APPROVED;
    review.moderationReason = reason || 'Approved by moderator';
    review.moderatedBy = adminId;

    const saved = await this.reviewRepository.save(review);
    // Approval changes the public rating — recompute summary now.
    await this.reviewsService.recomputeRatingSummary(review.productVariationId);
    return saved;
  }

  async rejectReview(
    reviewId: string,
    adminId: string,
    reason: string,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = ReviewStatus.REJECTED;
    review.moderationReason = reason;
    review.moderatedBy = adminId;

    const saved = await this.reviewRepository.save(review);
    await this.reviewsService.recomputeRatingSummary(review.productVariationId);
    return saved;
  }

  async hideReview(
    reviewId: string,
    adminId: string,
    reason: string,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = ReviewStatus.HIDDEN;
    review.moderationReason = reason;
    review.moderatedBy = adminId;

    const saved = await this.reviewRepository.save(review);
    await this.reviewsService.recomputeRatingSummary(review.productVariationId);
    return saved;
  }

  async getModerationStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    hidden: number;
    flagged: number;
  }> {
    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('review.status')
      .getRawMany();

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      hidden: 0,
      flagged: 0,
    };

    stats.forEach((stat) => {
      const status = stat.status as ReviewStatus;
      result[status] = parseInt(stat.count);
    });

    return result;
  }

  async getReviewsByModerator(moderatorId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { moderatedBy: moderatorId },
      relations: ['user', 'productVariation'],
      order: { updatedAt: 'DESC' },
    });
  }
}
