import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@app/auth/guards/admin.guard';
import { OrderService } from './services/order.service';
import { Order } from './entities/order.entity';
import { TransitionOrderStatusDto } from './dto/transition-order-status.dto';
import { rewriteCartItemImageUrls } from '@app/utils/image-url';

@ApiTags('Admin / Orders')
@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'List every order in the system' })
  @ApiResponse({ status: 200, type: [Order] })
  async findAll(): Promise<Order[]> {
    const orders = await this.orderService.findForAdmin();
    orders.forEach((o) => rewriteCartItemImageUrls(o.items as any));
    return orders;
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Manually transition an order through the post-payment cycle',
    description:
      'Allowed transitions: paid_preparing → paid_ready_to_ship → paid_shipped → paid_delivered. Refunds and cancellations have their own rules; see OrderService.transitionStatus.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, type: Order })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionOrderStatusDto,
  ): Promise<Order> {
    try {
      return await this.orderService.transitionStatus(id, dto.status);
    } catch (e: any) {
      if (/not found/i.test(e.message)) throw new NotFoundException(e.message);
      throw new BadRequestException(e.message);
    }
  }
}
