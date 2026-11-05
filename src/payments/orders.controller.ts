import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './services/order.service';
import { PaymentsService } from './payments.service';
import { Order } from './entities/order.entity';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import { rewriteCartItemImageUrls } from '@app/utils/image-url';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the current shopper orders',
    description:
      'Returns orders scoped to the authenticated user (Bearer token) when present, otherwise to the anonymous sessionId cookie. Empty array when neither is available.',
  })
  @ApiResponse({ status: 200, type: [Order] })
  async findMine(@UserInfo() userInfo: any): Promise<Order[]> {
    const orders = await this.orderService.findForCustomer(
      userInfo.userId,
      userInfo.sessionId,
    );
    // Reuse the cart helper — same productVariation.images shape applies.
    orders.forEach((order) => rewriteCartItemImageUrls(order.items as any));
    return orders;
  }

  @Post(':id/verify-payment')
  @ApiOperation({
    summary: 'Reconcile a payment right after the MercadoPago redirect',
    description:
      'Re-reads the payment from MercadoPago and updates the order. Used by ' +
      'the checkout success page so a payment that already went through is ' +
      'not shown as pending while the webhook arrives.',
  })
  @ApiResponse({ status: 200, description: 'Order with the refreshed status' })
  async verifyPayment(
    @Param('id') id: string,
    @Body() body: { paymentId?: string },
    @UserInfo() userInfo: any,
  ): Promise<Order> {
    // Ownership check first: only the shopper's own order can be synced.
    const order = await this.orderService.findForCustomerById(
      id,
      userInfo.userId,
      userInfo.sessionId,
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.paymentsService
      .verifyPaymentForOrder(id, body?.paymentId)
      .catch(() => undefined);

    const updated = await this.orderService.findForCustomerById(
      id,
      userInfo.userId,
      userInfo.sessionId,
    );
    if (!updated) {
      throw new NotFoundException('Order not found');
    }
    rewriteCartItemImageUrls(updated.items as any);
    return updated;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one of the current shopper orders',
    description:
      'Returns a single order owned by the authenticated user / session, any ' +
      'status (including processing_payment) — used by the checkout success ' +
      'page to show the real state.',
  })
  @ApiResponse({ status: 200, type: Order })
  async findOne(
    @Param('id') id: string,
    @UserInfo() userInfo: any,
  ): Promise<Order> {
    const order = await this.orderService.findForCustomerById(
      id,
      userInfo.userId,
      userInfo.sessionId,
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    rewriteCartItemImageUrls(order.items as any);
    return order;
  }
}
