import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { WishlistItem } from './entities/wishlist-item.entity';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { AuthenticatedGuard } from '@app/auth/guards/authenticated.guard';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import type { UserInfoType } from '@app/auth/decorators/user-info.decorator';

/**
 * Controller for the authenticated user's wishlist (favorites).
 * Every endpoint requires authentication via AuthenticatedGuard.
 */
@ApiTags('Wishlist')
@ApiSecurity('x-user-id')
@UseGuards(AuthenticatedGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({
    summary: 'List the authenticated user wishlist items',
    description:
      'Returns the current user wishlist with eager-loaded product variation and images.',
  })
  @ApiResponse({ status: 200, type: [WishlistItem] })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async list(@UserInfo() userInfo: UserInfoType): Promise<WishlistItem[]> {
    // AuthenticatedGuard guarantees userId is defined.
    return this.wishlistService.list(userInfo.userId as string);
  }

  @Post()
  @ApiOperation({
    summary: 'Add a product variation to the wishlist',
    description:
      'Idempotent: if the item is already in the wishlist the existing row is returned.',
  })
  @ApiBody({ type: AddWishlistItemDto })
  @ApiResponse({ status: 201, type: WishlistItem })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Product variation not found' })
  async add(
    @Body() body: AddWishlistItemDto,
    @UserInfo() userInfo: UserInfoType,
  ): Promise<WishlistItem> {
    return this.wishlistService.add(
      userInfo.userId as string,
      body.productVariationId,
    );
  }

  @Delete(':productVariationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a product variation from the wishlist',
  })
  @ApiParam({
    name: 'productVariationId',
    description: 'Product variation ID to remove',
    type: String,
  })
  @ApiResponse({ status: 204, description: 'Removed' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Item not in wishlist' })
  async remove(
    @Param('productVariationId', new ParseUUIDPipe())
    productVariationId: string,
    @UserInfo() userInfo: UserInfoType,
  ): Promise<void> {
    await this.wishlistService.remove(
      userInfo.userId as string,
      productVariationId,
    );
  }
}
