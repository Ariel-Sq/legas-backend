import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Review, ReviewStatus } from '../entities/review.entity';
import { ProductRatingSummary } from '../entities/product-rating-summary.entity';
import { ReviewImage } from '../entities/review-image.entity';
import { ReviewHelpfulVote } from '../entities/review-helpful-vote.entity';
import { ReviewReport } from '../entities/review-report.entity';
import { User } from '../../users/entities/user.entity';
import { ProductVariation } from '../../products/entities/product-variation.entity';
import { Order } from '../../payments/entities/order.entity';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ReviewQueryDto } from '../dto/review-query.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ProductRatingSummary)
    private readonly ratingSummaryRepository: Repository<ProductRatingSummary>,
    @InjectRepository(ReviewImage)
    private readonly reviewImageRepository: Repository<ReviewImage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProductVariation)
    private readonly productVariationRepository: Repository<ProductVariation>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ReviewHelpfulVote)
    private readonly helpfulVoteRepository: Repository<ReviewHelpfulVote>,
    @InjectRepository(ReviewReport)
    private readonly reportRepository: Repository<ReviewReport>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(
    createReviewDto: CreateReviewDto,
    userId: string,
  ): Promise<Review> {
    const productVariation = await this.productVariationRepository.findOne({
      where: { id: createReviewDto.productVariationId },
    });
    if (!productVariation) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: {
        userId,
        productVariationId: createReviewDto.productVariationId,
      },
    });
    if (existingReview) {
      throw new ConflictException('You have already reviewed this product');
    }

    let isVerifiedPurchase = false;
    let orderId = null;

    if (createReviewDto.productVariationId) {
      const order = await this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.items', 'item')
        .where('order.userId = :userId', { userId })
        .andWhere('item.productVariationId = :productVariationId', {
          productVariationId: createReviewDto.productVariationId,
        })
        .andWhere('order.status = :status', { status: 'paid_delivered' })
        .getOne();

      if (order) {
        isVerifiedPurchase = true;
        orderId = order.id;
      }
    }

    const reviewData: Partial<Review> = {
      userId,
      productVariationId: createReviewDto.productVariationId,
      title: createReviewDto.title,
      content: createReviewDto.content,
      rating: createReviewDto.rating,
      isVerifiedPurchase,
      status: ReviewStatus.PENDING,
    };

    if (orderId) {
      reviewData.orderId = orderId;
    }

    const review = this.reviewRepository.create(reviewData);
    const savedReview = await this.reviewRepository.save(review);

    if (createReviewDto.images && createReviewDto.images.length > 0) {
      const reviewImages = createReviewDto.images.map((imageUrl, index) =>
        this.reviewImageRepository.create({
          reviewId: savedReview.id,
          imageUrl,
          sortOrder: index,
        }),
      );
      await this.reviewImageRepository.save(reviewImages);
    }

    await this.invalidateRatingCache(createReviewDto.productVariationId);

    return this.findById(savedReview.id);
  }

  async findById(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'productVariation', 'images'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.stripReviewerPII(review);
  }

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Reviews are public, so the joined author must never carry PII. Replace
   * `review.user` with only the display name (what the storefront renders);
   * this can't be an entity-level @Exclude because /users/me needs the full
   * record for the profile/checkout prefill.
   */
  private stripReviewerPII<T extends { user?: User | null }>(review: T): T {
    if (review.user) {
      review.user = {
        firstName: review.user.firstName,
        lastName: review.user.lastName,
      } as User;
    }
    return review;
  }

  async findAll(viewerUserId?: string): Promise<Review[]> {
    const reviews = await this.reviewRepository.find({
      relations: ['user', 'productVariation', 'images'],
      order: { createdAt: 'DESC' },
    });
    reviews.forEach((r) => this.stripReviewerPII(r));
    if (viewerUserId && reviews.length > 0) {
      const votes = await this.helpfulVoteRepository.find({
        where: {
          userId: viewerUserId,
          reviewId: In(reviews.map((r) => r.id)),
        },
        select: ['reviewId'],
      });
      const votedSet = new Set(votes.map((v) => v.reviewId));
      reviews.forEach((r) => {
        (r as Review & { votedByMe: boolean }).votedByMe = votedSet.has(r.id);
      });
    }
    return reviews;
  }

  async findByProductVariationId(
    productVariationId: string,
    queryDto: ReviewQueryDto,
  ): Promise<{ reviews: Review[]; total: number }> {
    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.images', 'images')
      .where('review.productVariationId = :productVariationId', {
        productVariationId,
      });

    if (!queryDto.includeAll) {
      queryBuilder.andWhere('review.status = :status', {
        status: ReviewStatus.APPROVED,
      });
    }

    if (queryDto.verifiedOnly) {
      queryBuilder.andWhere('review.isVerifiedPurchase = :verified', {
        verified: true,
      });
    }

    if (queryDto.minRating) {
      queryBuilder.andWhere('review.rating >= :minRating', {
        minRating: queryDto.minRating,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(review.title ILIKE :search OR review.content ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortBy = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder || 'desc';
    queryBuilder.orderBy(
      `review.${sortBy}`,
      sortOrder.toUpperCase() as 'ASC' | 'DESC',
    );

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();
    reviews.forEach((r) => this.stripReviewerPII(r));

    return { reviews, total };
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
  ): Promise<Review> {
    const review = await this.findById(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You cannot edit this review');
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new BadRequestException('Cannot edit an already-approved review');
    }

    Object.assign(review, updateReviewDto);
    const savedReview = await this.reviewRepository.save(review);

    await this.invalidateRatingCache(review.productVariationId);

    return this.findById(savedReview.id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.findById(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You cannot delete this review');
    }

    await this.reviewRepository.remove(review);

    await this.invalidateRatingCache(review.productVariationId);
  }

  /**
   * Idempotent helpful vote. Inserting a duplicate (reviewId, userId) hits
   * the PK constraint — we map that to a 409. The on-disk count is then
   * derived from a COUNT() so it can never drift from the truth.
   */
  async markAsHelpful(reviewId: string, userId: string): Promise<void> {
    const review = await this.findById(reviewId);

    try {
      await this.helpfulVoteRepository.insert({
        reviewId: review.id,
        userId,
      });
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).code === '23505') {
        throw new ConflictException('You already marked this review helpful');
      }
      throw e;
    }

    const total = await this.helpfulVoteRepository.count({
      where: { reviewId: review.id },
    });
    await this.reviewRepository.update(review.id, { helpfulVotes: total });
  }

  /**
   * Removes a user's helpful vote. Idempotent — if the vote didn't exist,
   * the recount is still run so the row stays consistent.
   */
  async removeHelpfulVote(reviewId: string, userId: string): Promise<void> {
    const review = await this.findById(reviewId);
    await this.helpfulVoteRepository.delete({
      reviewId: review.id,
      userId,
    });
    const total = await this.helpfulVoteRepository.count({
      where: { reviewId: review.id },
    });
    await this.reviewRepository.update(review.id, { helpfulVotes: total });
  }

  /**
   * Idempotent report. First report flags the review; subsequent ones from
   * the same user are 409s. Total report count is also a derived COUNT().
   */
  async reportReview(
    reviewId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const review = await this.findById(reviewId);

    try {
      await this.reportRepository.insert({
        reviewId: review.id,
        userId,
        reason: reason ?? null,
      });
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).code === '23505') {
        throw new ConflictException('You already reported this review');
      }
      throw e;
    }

    const total = await this.reportRepository.count({
      where: { reviewId: review.id },
    });
    await this.reviewRepository.update(review.id, {
      reportCount: total,
      status: ReviewStatus.FLAGGED,
    });
  }

  private async invalidateRatingCache(
    productVariationId: string,
  ): Promise<void> {
    const cacheKeys = [
      `rating:product:${productVariationId}`,
      `reviews:product:${productVariationId}:*`,
    ];

    for (const key of cacheKeys) {
      await this.cacheManager.del(key);
    }
  }

  /**
   * Public hook so moderation can force a recompute after approve/reject/hide.
   */
  async recomputeRatingSummary(productVariationId: string): Promise<void> {
    await this.invalidateRatingCache(productVariationId);
    await this.calculateAndCacheRatingSummary(productVariationId);
  }

  async getCachedRatingSummary(
    productVariationId: string,
  ): Promise<ProductRatingSummary | null> {
    const cacheKey = `rating:product:${productVariationId}`;

    const cached = await this.cacheManager.get<ProductRatingSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    return this.calculateAndCacheRatingSummary(productVariationId);
  }

  private async calculateAndCacheRatingSummary(
    productVariationId: string,
  ): Promise<ProductRatingSummary | null> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select([
        'COUNT(*) as total',
        'AVG(review.rating) as average',
        'SUM(CASE WHEN review.isVerifiedPurchase = true THEN 1 ELSE 0 END) as verified_count',
        'AVG(CASE WHEN review.isVerifiedPurchase = true THEN review.rating END) as verified_average',
      ])
      .addSelect(
        `
        jsonb_build_object(
          '1', COUNT(CASE WHEN review.rating = 1 THEN 1 END),
          '2', COUNT(CASE WHEN review.rating = 2 THEN 1 END),
          '3', COUNT(CASE WHEN review.rating = 3 THEN 1 END),
          '4', COUNT(CASE WHEN review.rating = 4 THEN 1 END),
          '5', COUNT(CASE WHEN review.rating = 5 THEN 1 END)
        ) as distribution
      `,
      )
      .where('review.productVariationId = :productVariationId', {
        productVariationId,
      })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne();

    if (!result || parseInt(result.total) === 0) {
      return null;
    }

    const existingSummary = await this.ratingSummaryRepository.findOne({
      where: { productVariationId },
    });

    let summary: ProductRatingSummary;

    if (existingSummary) {
      Object.assign(existingSummary, {
        averageRating: parseFloat(result.average) || 0,
        totalReviews: parseInt(result.total),
        ratingDistribution: result.distribution,
        verifiedReviews: parseInt(result.verified_count) || 0,
        verifiedAverageRating: parseFloat(result.verified_average) || 0,
        lastCalculated: new Date(),
      });
      summary = await this.ratingSummaryRepository.save(existingSummary);
    } else {
      summary = this.ratingSummaryRepository.create({
        productVariationId,
        averageRating: parseFloat(result.average) || 0,
        totalReviews: parseInt(result.total),
        ratingDistribution: result.distribution,
        verifiedReviews: parseInt(result.verified_count) || 0,
        verifiedAverageRating: parseFloat(result.verified_average) || 0,
        lastCalculated: new Date(),
      });
      summary = await this.ratingSummaryRepository.save(summary);
    }

    const cacheKey = `rating:product:${productVariationId}`;
    await this.cacheManager.set(cacheKey, summary, 3600);

    return summary;
  }

  async getTopRatedProducts(limit: number = 10, minReviews: number = 1) {
    const summaries = await this.ratingSummaryRepository
      .createQueryBuilder('summary')
      .leftJoinAndSelect('summary.productVariation', 'productVariation')
      .leftJoinAndSelect('productVariation.template', 'template')
      .where('summary.totalReviews >= :minReviews', { minReviews })
      .andWhere('summary.averageRating > 0')
      .orderBy('summary.averageRating', 'DESC')
      .addOrderBy('summary.totalReviews', 'DESC')
      .limit(limit)
      .getMany();

    return summaries.map((summary) => ({
      productVariationId: summary.productVariationId,
      productVariation: summary.productVariation,
      averageRating: summary.averageRating,
      totalReviews: summary.totalReviews,
      verifiedReviews: summary.verifiedReviews,
      verifiedAverageRating: summary.verifiedAverageRating,
      ratingDistribution: summary.ratingDistribution,
    }));
  }
}
