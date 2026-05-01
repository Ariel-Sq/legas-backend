import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { CheckoutItemDto } from '../dto/checkout.dto';
import { ProductVariation } from '@app/products/entities/product-variation.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderPaymentDetail } from '../entities/order-payment-detail.entity';
import { PaymentData } from '../types/payment.types';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(data: {
    userId?: string;
    sessionId?: string;
    items: CheckoutItemDto[];
    totalAmount: number;
  }): Promise<Order> {
    return this.dataSource.transaction((manager) =>
      this.createOrderInTx(manager, data),
    );
  }

  /**
   * Create the Order + OrderItems within an existing transaction.
   * Uses the passed manager for ALL queries (including the product lookup)
   * to avoid pool deadlocks: a fresh-connection lookup while N transactions
   * each hold a connection waiting on a row lock would exhaust the pool.
   */
  async createOrderInTx(
    manager: EntityManager,
    data: {
      userId?: string;
      sessionId?: string;
      items: CheckoutItemDto[];
      totalAmount: number;
    },
  ): Promise<Order> {
    const orderRepo = manager.getRepository(Order);
    const orderItemRepo = manager.getRepository(OrderItem);
    const productRepo = manager.getRepository(ProductVariation);

    const order = orderRepo.create({
      userId: data.userId || undefined,
      sessionId: data.sessionId || undefined,
      status: OrderStatus.PENDING,
      totalAmount: data.totalAmount,
    });
    const savedOrder = await orderRepo.save(order);

    const orderItems: OrderItem[] = [];
    for (const item of data.items) {
      const product = await productRepo.findOne({ where: { id: item.id } });
      if (!product) {
        throw new Error(`Product with id ${item.id} not found`);
      }
      const orderItem = orderItemRepo.create({
        order: savedOrder,
        productVariationId: item.id,
        title: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      orderItems.push(await orderItemRepo.save(orderItem));
    }
    savedOrder.items = orderItems;
    return savedOrder;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'paymentDetails'],
    });
  }

  /**
   * Idempotent payment update. The unique index on (orderId, transactionId)
   * means the upsert is a no-op when MercadoPago retries the same webhook,
   * so the order status and payment-detail rows can never be doubly inserted.
   */
  async updateOrderPayment(
    order: Order,
    paymentData: PaymentData,
  ): Promise<void> {
    const orderStatus = this.mapPaymentStatusToOrderStatus(paymentData.status);

    await this.dataSource.transaction(async (manager) => {
      const detailRepo = manager.getRepository(OrderPaymentDetail);
      const orderRepo = manager.getRepository(Order);

      // Idempotent insert keyed on (orderId, transactionId).
      const existing = await detailRepo.findOne({
        where: { orderId: order.id, transactionId: paymentData.id },
      });
      if (existing) {
        this.logger.log(
          `Webhook for tx ${paymentData.id} already processed — skipping`,
        );
        return;
      }
      await detailRepo.insert({
        orderId: order.id,
        method: paymentData.payment_method_id,
        status: paymentData.status,
        statusDetail: paymentData.status_detail,
        transactionId: paymentData.id,
      });

      await orderRepo.update(order.id, { status: orderStatus });
    });
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
