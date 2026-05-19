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
      status: OrderStatus.PROCESSING_PAYMENT,
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
   * List the orders for the current shopper. Auth users get them by userId;
   * anon shoppers get them by the sessionId cookie. Returns [] when neither
   * is present.
   */
  /**
   * Admin-only listing — returns every order with the same relations as
   * the per-customer view so the panel can render images and items.
   */
  async findForAdmin(): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.productVariation', 'variation')
      .leftJoinAndSelect('variation.images', 'image')
      .leftJoinAndSelect('order.paymentDetails', 'paymentDetail')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async findForCustomer(
    userId?: string,
    sessionId?: string,
  ): Promise<Order[]> {
    if (!userId && !sessionId) return [];
    // Use the query builder instead of `find({ where })` because the where
    // shorthand was tripping Postgres' `uuid = character varying` check when
    // filtering by sessionId (a varchar column) alongside the userId uuid
    // relation. Parameterising the comparison directly keeps both branches
    // explicit and type-safe.
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.productVariation', 'variation')
      .leftJoinAndSelect('variation.images', 'image')
      .leftJoinAndSelect('order.paymentDetails', 'paymentDetail')
      .orderBy('order.createdAt', 'DESC');
    if (userId) {
      qb.where('order.userId = :userId', { userId });
    } else {
      qb.where('order.sessionId = :sessionId', { sessionId });
    }
    return qb.getMany();
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

      // Don't downgrade an order that already moved through the manual
      // post-payment cycle (ready_to_ship / shipped / delivered). A late
      // MP webhook telling us the payment is "pending" shouldn't reset
      // the order. Refunds are the only signal we always honor.
      const protectedStatuses: OrderStatus[] = [
        OrderStatus.PAID_READY_TO_SHIP,
        OrderStatus.PAID_SHIPPED,
        OrderStatus.PAID_DELIVERED,
      ];
      const canUpdate =
        !protectedStatuses.includes(order.status) ||
        orderStatus === OrderStatus.REFUNDED;
      if (canUpdate) {
        await orderRepo.update(order.id, { status: orderStatus });
      }
    });
  }

  /**
   * Maps a MercadoPago payment status to our order status. Only handles the
   * automatic transitions driven by MP — the manual post-payment lifecycle
   * (preparing → ready_to_ship → shipped → delivered) is driven by the
   * admin endpoint.
   *
   * `approved` lands on PAID_PREPARING (start of the seller-driven cycle).
   * Anything that puts the order into PAID_* should not be downgraded by a
   * later out-of-order webhook, so the caller checks the current status
   * before applying this mapping.
   */
  private mapPaymentStatusToOrderStatus(paymentStatus: string): OrderStatus {
    switch (paymentStatus.toLowerCase()) {
      case 'approved':
        return OrderStatus.PAID_PREPARING;
      case 'pending':
      case 'in_process':
        return OrderStatus.PROCESSING_PAYMENT;
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return OrderStatus.CANCELLED;
      case 'refunded':
        return OrderStatus.REFUNDED;
      default:
        return OrderStatus.PROCESSING_PAYMENT;
    }
  }

  /**
   * Admin-driven status transition. Validates the move follows the
   * permitted post-payment graph so the seller can't, e.g., jump from
   * preparing straight to delivered without going through shipped, or
   * cancel an order that was already delivered.
   */
  async transitionStatus(
    orderId: string,
    next: OrderStatus,
  ): Promise<Order> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PROCESSING_PAYMENT]: [OrderStatus.CANCELLED],
      [OrderStatus.PAID_PREPARING]: [
        OrderStatus.PAID_READY_TO_SHIP,
        OrderStatus.REFUNDED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PAID_READY_TO_SHIP]: [
        OrderStatus.PAID_PREPARING,
        OrderStatus.PAID_SHIPPED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.PAID_SHIPPED]: [
        OrderStatus.PAID_DELIVERED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.PAID_DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!allowed[order.status]?.includes(next)) {
      throw new Error(
        `Invalid transition: ${order.status} → ${next}`,
      );
    }

    await this.orderRepository.update(order.id, { status: next });
    return this.findById(order.id) as Promise<Order>;
  }
}
