import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './services/order.service';
import { Order } from './entities/order.entity';
import { UserInfo } from '@app/auth/decorators/user-info.decorator';
import { rewriteCartItemImageUrls } from '@app/utils/image-url';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

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
}
