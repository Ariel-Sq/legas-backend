import {
  Body,
  Controller,
  Post,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { WebhookNotificationDto } from './dto/webhook.dto';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import type { UserInfoType } from '@app/auth/decorators/user-info.decorator';
import { CartService } from '@app/cart/cart.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly cartService: CartService,
  ) {}

  // ===== POST METHODS (Create Operations) =====

  @Post('/mercadopago/checkout')
  @ApiOperation({
    summary: 'Create a Mercado Pago checkout preference from cart',
    description:
      'Creates a checkout preference using items from the current cart. Requires authentication and a non-empty cart with sufficient stock.',
  })
  @ApiResponse({
    status: 201,
    description: 'The checkout preference has been successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Cart is empty or insufficient stock for one or more items',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'INSUFFICIENT_STOCK' },
        problems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              productName: { type: 'string' },
              requestedQuantity: { type: 'number' },
              availableQuantity: { type: 'number' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User must be authenticated to create checkout',
  })
  async createCheckout(@UserInfo() userInfo: UserInfoType) {
    const cart = await this.cartService.getOrCreateCart(
      userInfo.userId,
      userInfo.sessionId,
    );

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return this.paymentsService.createCheckoutPreferenceFromCart(
      cart,
      userInfo.userId,
      userInfo.sessionId,
    );
  }

  @Post('/mercadopago/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Mercado Pago webhook notifications' })
  @ApiResponse({
    status: 200,
    description: 'The webhook notification has been successfully processed',
  })
  async handleWebhook(@Body() webhookData: WebhookNotificationDto) {
    return this.paymentsService.handleWebhookNotification(webhookData);
  }
}
