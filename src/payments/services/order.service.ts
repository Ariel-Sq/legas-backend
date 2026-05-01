import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { CheckoutItemDto } from '../dto/checkout.dto';
import { ProductVariationsService } from '@app/products/products.service';
import { OrderItem } from '../entities/order-item.entity';
import { OrderPaymentDetail } from '../entities/order-payment-detail.entity';
import { PaymentData } from '../types/payment.types';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderPaymentDetail)
    private readonly orderPaymentDetailRepository: Repository<OrderPaymentDetail>,
    private readonly productsService: ProductVariationsService,
  ) {}

  async createOrder(data: {
    userId?: string;
    sessionId?: string;
    items: CheckoutItemDto[];
    totalAmount: number;
  }): Promise<Order> {
    const order = this.orderRepository.create({
      userId: data.userId || undefined,
      sessionId: data.sessionId || undefined,
      status: OrderStatus.PENDING,
      totalAmount: data.totalAmount,
    });

    // Save the order to get its ID
    const savedOrder = await this.orderRepository.save(order);

    // Get product details and create order items
    const orderItems = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.productsService.findByIdWithDetails(item.id);
        if (!product) {
          throw new Error(`Product with id ${item.id} not found`);
        }

        const orderItem = this.orderItemRepository.create({
          order: savedOrder,
          productVariationId: item.id,
          title: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
        });

        return this.orderItemRepository.save(orderItem);
      }),
    );

    // Attach the items to the order
    savedOrder.items = orderItems;

    return savedOrder;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'paymentDetails'],
    });
  }

  async updateOrderPayment(
    order: Order,
    paymentData: PaymentData,
  ): Promise<void> {
    // Map Mercado Pago payment status to order status
    const orderStatus = this.mapPaymentStatusToOrderStatus(paymentData.status);

    // Create payment detail
    const paymentDetail = this.orderPaymentDetailRepository.create({
      order,
      method: paymentData.payment_method_id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      transactionId: paymentData.id,
    });

    // Save payment detail
    const savedPaymentDetail =
      await this.orderPaymentDetailRepository.save(paymentDetail);

    this.logger.log('savedPaymentDetail', savedPaymentDetail);

    const updatedOrder = await this.orderRepository.update(order.id, {
      status: orderStatus,
    });
    this.logger.log('updatedOrder', updatedOrder);
  }

  private mapPaymentStatusToOrderStatus(paymentStatus: string): OrderStatus {
    switch (paymentStatus.toLowerCase()) {
      case 'approved':
        return OrderStatus.COMPLETED;
      case 'pending':
        return OrderStatus.PENDING;
      case 'in_process':
        return OrderStatus.PROCESSING;
      case 'rejected':
      case 'failed':
        return OrderStatus.CANCELLED;
      case 'refunded':
        return OrderStatus.REFUNDED;
      case 'cancelled':
        return OrderStatus.CANCELLED;
      default:
        return OrderStatus.PENDING;
    }
  }
}
