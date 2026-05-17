import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { Cart } from './entities/cart.entity';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import type { UserInfoType } from '@app/auth/decorators/user-info.decorator';
// Express types for request handling

/**
 * Controller for cart operations
 * Handles both authenticated and anonymous shopping carts
 */

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ===== GET METHODS (Read Operations) =====

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  @ApiResponse({ status: 200, description: 'Cart found', type: Cart })
  @ApiSecurity('x-user-id')
  async getCart(@UserInfo() userInfo: UserInfoType) {
    const { userId, sessionId } = userInfo;
    return this.cartService.getOrCreateCart(userId, sessionId);
  }

  // ===== POST METHODS (Create Operations) =====

  @Post('items')
  @ApiOperation({ summary: 'Add product to cart' })
  @ApiResponse({
    status: 201,
    description: 'Product added successfully',
    type: Cart,
  })
  @ApiBody({ type: AddToCartDto })
  async addToCart(
    @Body() addToCartDto: AddToCartDto,
    @UserInfo() userInfo: UserInfoType,
  ) {
    const { userId, sessionId } = userInfo;
    return this.cartService.addToCart(userId, sessionId, addToCartDto);
  }

  // ===== PATCH METHODS (Update Operations) =====

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update product quantity in cart' })
  @ApiResponse({ status: 200, description: 'Cart updated', type: Cart })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiBody({ type: UpdateCartItemDto })
  async updateCartItem(
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @UserInfo() userInfo: UserInfoType,
  ) {
    const { userId, sessionId } = userInfo;
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.updateCartItem(cart.id, id, updateCartItemDto);
  }

  // ===== DELETE METHODS (Delete Operations) =====

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove product from cart' })
  @ApiResponse({
    status: 200,
    description: 'Product removed from cart',
    type: Cart,
  })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  async removeFromCart(
    @Param('id') id: string,
    @UserInfo() userInfo: UserInfoType,
  ) {
    const { userId, sessionId } = userInfo;
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.removeFromCart(cart.id, id);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared', type: Cart })
  async clearCart(@UserInfo() userInfo: UserInfoType) {
    const { userId, sessionId } = userInfo;
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.clearCart(cart.id);
  }
}
