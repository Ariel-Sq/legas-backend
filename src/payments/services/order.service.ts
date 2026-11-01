import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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
      customerEmail?: string;
      customerPhone?: string;
      customerDni?: string;
      deliveryMethod?: 'delivery' | 'pickup';
      deliveryAddress?: string;
      status?: OrderStatus;
      checkoutKey?: string;
      depositAmount?: number;
      balanceAmount?: number;
    },
  ): Promise<Order> {
    const orderRepo = manager.getRepository(Order);
    const orderItemRepo = manager.getRepository(OrderItem);
    const productRepo = manager.getRepository(ProductVariation);

    const order = orderRepo.create({
      userId: data.userId || undefined,
      sessionId: data.sessionId || undefined,
      status: data.status ?? OrderStatus.PROCESSING_PAYMENT,
      totalAmount: data.totalAmount,
      customerEmail: data.customerEmail ?? null,
      customerPhone: data.customerPhone ?? null,
      customerDni: data.customerDni ?? null,
      deliveryMethod: data.deliveryMethod ?? 'delivery',
      deliveryAddress: data.deliveryAddress ?? null,
      checkoutKey: data.checkoutKey ?? null,
      depositAmount: data.depositAmount ?? null,
      balanceAmount: data.balanceAmount ?? null,
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

  /**
   * Orders still awaiting payment older than `maxAgeMinutes` — their
   * reserved stock is considered an expired hold (buyer abandoned the MP
   * checkout). The age is computed against the DATABASE clock: `createdAt`
   * is a naive timestamp and passing a JS Date would serialize it in the
   * app's local timezone, skewing the cutoff.
   */
  async findExpiredProcessingPayment(maxAgeMinutes: number): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .select(['order.id'])
      .where('order.status = :status', {
        status: OrderStatus.PROCESSING_PAYMENT,
      })
      .andWhere('order.createdAt < now() - make_interval(mins => :mins)', {
        mins: maxAgeMinutes,
      })
      .getMany();
  }

  /**
   * Abandoned offline (transfer/cash) orders older than `maxAgeDays`: nobody
   * confirmed the payment. Released on a long window (they legitimately take
   * days to coordinate by WhatsApp), unlike the 90-min MP hold.
   */
  async findExpiredPendingTransfer(maxAgeDays: number): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .select(['order.id'])
      .where('order.status = :status', {
        status: OrderStatus.PENDING_TRANSFER,
      })
      .andWhere('order.createdAt < now() - make_interval(days => :days)', {
        days: maxAgeDays,
      })
      .getMany();
  }

  /**
   * The shopper's own in-flight checkouts. A shopper has at most one live
   * checkout: starting a new one supersedes these (stock back, cancelled,
   * MP preference expired).
   */
  async findPendingForOwner(
    userId?: string,
    sessionId?: string,
  ): Promise<Order[]> {
    if (!userId && !sessionId) return [];
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select(['order.id', 'order.preferenceId'])
      // Both live pre-payment states: an MP checkout and an offline transfer
      // are superseded when the shopper places a new order.
      // Only unpaid MercadoPago holds are superseded. A `pending_transfer`
      // order is a REAL order the shopper confirmed (awaiting transfer/cash),
      // so a later checkout must not cancel it — those are cleaned up by the
      // long (14-day) transfer sweep, not by starting a new checkout.
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PROCESSING_PAYMENT],
      });
    if (userId) {
      qb.andWhere('order.userId = :userId', { userId });
    } else {
      qb.andWhere('order.sessionId = :sessionId', { sessionId });
    }
    return qb.getMany();
  }

  async setPreferenceId(orderId: string, preferenceId: string): Promise<void> {
    await this.orderRepository.update(orderId, { preferenceId });
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

  async findForCustomer(userId?: string, sessionId?: string): Promise<Order[]> {
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
    // `processing_payment` orders are just a stock hold created when the
    // shopper reaches the MercadoPago step — they must not show up in the
    // order history (abandoned checkouts would look like real orders). Same
    // for `expired` holds (superseded/abandoned). The cron sweep cancels
    // them after the hold window.
    if (userId) {
      qb.where('order.userId = :userId', { userId });
    } else {
      qb.where('order.sessionId = :sessionId', { sessionId });
    }
    qb.andWhere('order.status NOT IN (:...hidden)', {
      hidden: [OrderStatus.PROCESSING_PAYMENT, OrderStatus.EXPIRED],
    });
    return qb.getMany();
  }

  /** Find one order owned by the shopper (or session), any status. */
  async findForCustomerById(
    orderId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<Order | null> {
    if (!userId && !sessionId) return null;
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.productVariation', 'variation')
      .leftJoinAndSelect('variation.images', 'image')
      .leftJoinAndSelect('order.paymentDetails', 'paymentDetail')
      .where('order.id = :orderId', { orderId });
    if (userId) {
      qb.andWhere('order.userId = :userId', { userId });
    } else {
      qb.andWhere('order.sessionId = :sessionId', { sessionId });
    }
    return qb.getOne();
  }

  /**
   * Find a still-live MP checkout hold for the owner + idempotency key, so a
   * repeated attempt (re-click / retry) can reuse its existing preference
   * instead of creating another order.
   */
  async findLiveByCheckoutKey(
    userId: string | undefined,
    sessionId: string | undefined,
    checkoutKey: string,
  ): Promise<Order | null> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .where('order.checkoutKey = :checkoutKey', { checkoutKey })
      .andWhere('order.status = :status', {
        status: OrderStatus.PROCESSING_PAYMENT,
      })
      .andWhere('order.preferenceId IS NOT NULL');
    if (userId) {
      qb.andWhere('order.userId = :userId', { userId });
    } else {
      qb.andWhere('order.sessionId = :sessionId', { sessionId });
    }
    return qb.getOne();
  }

  /**
   * Whether the order already has an approved/pending payment. Used to avoid
   * cancelling an order that was actually paid (e.g. webhook still in flight)
   * during a supersede/expiry sweep.
   */
  async hasLivePayment(orderId: string): Promise<boolean> {
    const count = await this.orderRepository.manager
      .getRepository(OrderPaymentDetail)
      .count({
        where: { orderId, status: In(['approved', 'pending', 'in_process']) },
      });
    return count > 0;
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
        OrderStatus.PAID_PREPARING,
        OrderStatus.PAID_READY_TO_SHIP,
        OrderStatus.PAID_SHIPPED,
        OrderStatus.PAID_DELIVERED,
      ];
      // Unknown MP statuses (orderStatus === null) must never change the
      // order state — just record the payment detail above.
      const canUpdate =
        orderStatus !== null &&
        (!protectedStatuses.includes(order.status) ||
          orderStatus === OrderStatus.REFUNDED);

      // A payment landing on a CANCELLED order means the shopper paid a
      // preference we already superseded/expired (its stock went back).
      // Never resurrect it silently — record the payment detail (above)
      // and scream so it gets manual review + refund via the MP panel.
      if (
        order.status === OrderStatus.CANCELLED &&
        orderStatus === OrderStatus.PAID_PREPARING
      ) {
        this.logger.error(
          `Payment ${paymentData.id} APPROVED on cancelled order ${order.id} — ` +
            `stock was already restored. Manual review needed: refund via the MP panel ` +
            `or re-confirm the order and adjust stock.`,
        );
        return;
      }

      if (canUpdate && orderStatus) {
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
  private mapPaymentStatusToOrderStatus(
    paymentStatus: string,
  ): OrderStatus | null {
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
        // Unknown/unsupported status: don't guess — a wrong guess could
        // downgrade a paid order. Record the payment detail only.
        return null;
    }
  }

  /**
   * Admin-driven status transition. Validates the move follows the
   * permitted post-payment graph so the seller can't, e.g., jump from
   * preparing straight to delivered without going through shipped, or
   * cancel an order that was already delivered.
   */
  async transitionStatus(orderId: string, next: OrderStatus): Promise<Order> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PROCESSING_PAYMENT]: [OrderStatus.CANCELLED],
      [OrderStatus.PENDING_TRANSFER]: [
        OrderStatus.PAID_PREPARING,
        OrderStatus.CANCELLED,
      ],
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
      [OrderStatus.EXPIRED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!allowed[order.status]?.includes(next)) {
      throw new Error(`Invalid transition: ${order.status} → ${next}`);
    }

    await this.orderRepository.update(order.id, { status: next });
    return this.findById(order.id) as Promise<Order>;
  }
}
