import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from '../services/reviews.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { Review } from '../entities/review.entity';
import { AuthenticatedGuard } from '../../auth/guards/authenticated.guard';
import { UserInfo } from '../../auth/decorators/user-info.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all reviews',
    description:
      'Returns all reviews in the system. When the request is authenticated (Bearer token), each review includes votedByMe.',
  })
  @ApiResponse({ status: 200, type: [Review] })
  async findAll(@UserInfo() userInfo: any): Promise<Review[]> {
    return this.reviewsService.findAll(userInfo.userId);
  }

  @Get('mine')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List the current user’s reviews',
    description:
      'Used by the frontend to mark already-reviewed products in /orders.',
  })
  @ApiResponse({ status: 200, type: [Review] })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async findMine(@UserInfo() userInfo: any): Promise<Review[]> {
    return this.reviewsService.findByUser(userInfo.userId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Create a review',
    description: 'Create a review for a product. Requires authentication.',
  })
  @ApiResponse({ status: 201, type: Review })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or user already reviewed this product',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @UserInfo() userInfo: any,
  ): Promise<Review> {
    return this.reviewsService.create(createReviewDto, userInfo.userId);
  }

  @Post(':id/helpful')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a review as helpful',
    description:
      'One vote per user — duplicate votes by the same user return 409.',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 409, description: 'Already voted' })
  async markAsHelpful(
    @Param('id') id: string,
    @UserInfo() userInfo: any,
  ): Promise<void> {
    await this.reviewsService.markAsHelpful(id, userInfo.userId);
  }

  @Delete(':id/helpful')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove the current user vote on a review',
    description:
      'Idempotent — if the user had not voted, the response is still 204 and the stored count is recomputed.',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 204, description: 'Vote removed' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async removeHelpfulVote(
    @Param('id') id: string,
    @UserInfo() userInfo: any,
  ): Promise<void> {
    await this.reviewsService.removeHelpfulVote(id, userInfo.userId);
  }

  @Post(':id/report')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report a review',
    description:
      'Report a review as inappropriate. One report per user — duplicates return 409.',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Report recorded' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 409, description: 'Already reported' })
  async reportReview(
    @Param('id') id: string,
    @Body() body: { reason?: string } | undefined,
    @UserInfo() userInfo: any,
  ): Promise<void> {
    await this.reviewsService.reportReview(id, userInfo.userId, body?.reason);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Update a review',
    description: 'Owner-only update of a pending review.',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, type: Review })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Not the owner of the review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @UserInfo() userInfo: any,
  ): Promise<Review> {
    return this.reviewsService.update(id, updateReviewDto, userInfo.userId);
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a review',
    description: 'Owner-only review deletion.',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async remove(
    @Param('id') id: string,
    @UserInfo() userInfo: any,
  ): Promise<void> {
    await this.reviewsService.remove(id, userInfo.userId);
  }
}
