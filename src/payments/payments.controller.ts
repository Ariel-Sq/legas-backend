import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateCheckoutRequestDto } from './dto/create-checkout-request.dto';
import { CardCheckoutIntentDto, CardPaymentDto } from './dto/card-payment.dto';
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
  async createCheckout(
    @UserInfo() userInfo: UserInfoType,
    @Body() body: CreateCheckoutRequestDto = {},
  ) {
    const cart = await this.cartService.getOrCreateCart(
      userInfo.userId,
      userInfo.sessionId,
    );

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const contact = {
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerDni: body.customerDni,
      deliveryMethod: body.deliveryMethod,
      deliveryAddress: body.deliveryAddress,
    };

    // Offline (transfer/cash): place the order, coordinate payment by
    // WhatsApp. No MercadoPago preference.
    if (body.paymentMethod === 'offline') {
      const order = await this.paymentsService.createOfflineOrder(
        cart,
        userInfo.userId,
        userInfo.sessionId,
        contact,
      );
      return { mode: 'offline', orderId: order.id };
    }

    // MercadoPago (card / debit / account money): +15%, Checkout Pro.
    const preference =
      await this.paymentsService.createCheckoutPreferenceFromCart(
        cart,
        userInfo.userId,
        userInfo.sessionId,
        contact,
        body.idempotencyKey,
      );
    return { mode: 'mercadopago', ...preference };
  }

  /**
   * On-site card payment, step 1: create the order hold and return the
   * amount to tokenize. No MercadoPago redirect — the shopper stays on our
   * checkout and fills the card form (Card Payment Brick).
   */
  @Post('/card/intent')
  @ApiOperation({
    summary: 'Create the order hold for the on-site card form',
    description:
      'Creates a processing_payment order at the MercadoPago price and returns the amount the card form must charge.',
  })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  async createCardIntent(
    @UserInfo() userInfo: UserInfoType,
    @Body() body: CardCheckoutIntentDto = {},
  ) {
    const cart = await this.cartService.getOrCreateCart(
      userInfo.userId,
      userInfo.sessionId,
    );
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    return this.paymentsService.createCardIntent(
      cart,
      userInfo.userId,
      userInfo.sessionId,
      {
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerDni: body.customerDni,
        deliveryMethod: body.deliveryMethod,
        deliveryAddress: body.deliveryAddress,
      },
      body.idempotencyKey,
    );
  }

  /**
   * On-site card payment, step 2: charge the tokenized card. The amount is
   * read from the stored order, never from the request.
   */
  @Post('/card/pay')
  @ApiOperation({ summary: 'Charge a tokenized card for an existing order' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 400, description: 'Order is not awaiting payment' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async payWithCard(
    @UserInfo() userInfo: UserInfoType,
    @Body() body: CardPaymentDto,
  ) {
    return this.paymentsService.createCardPayment(
      body,
      userInfo.userId,
      userInfo.sessionId,
    );
  }

  /** Order state for the shopper after the 3DS challenge (polling). */
  @Get('/card/order/:orderId')
  @ApiOperation({ summary: 'Current status of a card order' })
  @ApiResponse({ status: 200, description: 'Order status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cardOrderStatus(
    @UserInfo() userInfo: UserInfoType,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getCardOrderStatus(
      orderId,
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
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string>,
  ) {
    return this.paymentsService.handleWebhookNotification(body, query);
  }

  /**
   * Some legacy IPN deliveries arrive as GET with `?topic=payment&id=...`.
   * Same handler, no body.
   */
  @Get('/mercadopago/webhook')
  @ApiOperation({ summary: 'Handle Mercado Pago legacy IPN (GET)' })
  handleWebhookGet(@Query() query: Record<string, string>) {
    return this.paymentsService.handleWebhookNotification({}, query);
  }
}
