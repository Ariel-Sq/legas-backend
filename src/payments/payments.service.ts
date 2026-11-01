import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { ProductVariationsService } from '@app/products/products.service';
import { UsersService } from '@app/users/users.service';
import { CheckoutItemDto } from './dto/checkout.dto';
import { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';
import { PaymentData } from './types/payment.types';
import { WebhookNotificationDto } from './dto/webhook.dto';
import { OrderService } from './services/order.service';
import { CartService } from '@app/cart/cart.service';
import { Cart } from '@app/cart/entities/cart.entity';
import { Order, OrderStatus } from './entities/order.entity';
import {
  MERCADOPAGO_SURCHARGE_RATE,
  MERCADOPAGO_MAX_INSTALLMENTS,
  PICKUP_DEPOSIT_RATE,
  TRANSFER_DISCOUNT_RATE,
} from './payment-method.config';
import { EmailService } from '@app/notifications/email.service';
import {
  orderEmailFor,
  shopNotificationEmail,
  shopOrderEmailFor,
} from '@app/notifications/order-emails';

interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

// Surcharge rates and per-method MP restrictions live in
// payment-method.config.ts (account_money +10%, credit_card +15%).

/**
 * Stock-hold lifecycle. Checkout reserves stock BEFORE payment, so an
 * abandoned MP checkout holds stock hostage. The MP preference expires at
 * CHECKOUT_EXPIRATION_MINUTES (MP stops accepting the payment), and the
 * hold is released after STOCK_HOLD_RELEASE_MINUTES (> expiration, so a
 * payment can never land on an already-released order).
 */
export const CHECKOUT_EXPIRATION_MINUTES = 60;
export const STOCK_HOLD_RELEASE_MINUTES = 90;
// Offline (transfer/cash) orders legitimately take days to coordinate by
// WhatsApp, so their stock hold is released on a much longer window.
export const TRANSFER_RELEASE_DAYS = 14;

@Injectable()
export class PaymentsService {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    private productsService: ProductVariationsService,
    private usersService: UsersService,
    private orderService: OrderService,
    private cartService: CartService,
    private emailService: EmailService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.getOrThrow<string>(
        'MERCADO_PAGO_ACCESS_TOKEN',
      ),
    });
  }

  /**
   * Reserve stock and create the Order in a single transaction with a
   * pessimistic_write lock on the involved variations. Stock is decremented
   * BEFORE the MercadoPago call so concurrent checkouts can never oversell.
   * If the MP API call fails, compensateFailedCheckout restores the stock
   * and marks the order CANCELLED.
   */
  async createCheckoutPreferenceFromCart(
    cart: Cart,
    userId?: string,
    sessionId?: string,
    contact: {
      customerEmail?: string;
      customerPhone?: string;
      customerDni?: string;
      deliveryMethod?: 'delivery' | 'pickup';
      deliveryAddress?: string;
    } = {},
    idempotencyKey?: string,
  ) {
    if (userId) {
      await this.usersService.findById(userId);
    }
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Idempotent replay: if this exact attempt already created a live order,
    // return its existing MP preference instead of creating another order.
    if (idempotencyKey) {
      const existing = await this.orderService.findLiveByCheckoutKey(
        userId,
        sessionId,
        idempotencyKey,
      );
      if (existing?.preferenceId) {
        const preference = new Preference(this.client);
        const pref = await preference.get({
          preferenceId: existing.preferenceId,
        });
        return { ...pref, checkoutUrl: this.resolveCheckoutUrl(pref) };
      }
    }

    // A shopper has at most one live checkout: starting a new one (e.g.
    // switching payment method) supersedes their previous pending orders —
    // stock back, order cancelled, old MP preference expired so it can't
    // be paid afterwards. Without this, toggling methods kept stacking
    // stock holds for 90 minutes each.
    await this.supersedePendingCheckouts(userId, sessionId).catch((err) =>
      this.logger.warn(`supersedePendingCheckouts failed: ${err.message}`),
    );

    // Lazy hold release: before reserving new stock, return the stock of
    // abandoned checkouts. Serverless has no background workers, so this —
    // plus the daily cron (GET /api/cron/release-stock) — keeps expired
    // holds from starving the catalogue. Never blocks the checkout.
    await this.releaseExpiredCheckouts().catch((err) =>
      this.logger.warn(`releaseExpiredCheckouts failed: ${err.message}`),
    );

    const checkoutItems: CheckoutItemDto[] = cart.items.map((item) => ({
      id: item.productVariationId,
      quantity: item.quantity,
    }));
    // Catalogue prices are cash/transfer prices. MercadoPago carries a flat
    // surcharge (any method) — applied to the order total and to every MP
    // preference item so the charge matches the frontend summary.
    const totalAmount =
      Math.round(
        Number(cart.totalPrice) * (1 + MERCADOPAGO_SURCHARGE_RATE) * 100,
      ) / 100;

    // Phase 1 — atomic reserve + order create (no network calls inside).
    const order = await this.dataSource.transaction(async (manager) => {
      const ids = checkoutItems.map((i) => i.id);
      await this.productsService.lockVariationsForUpdate(manager, ids);

      // Atomic decrement; throws BadRequestException if any item is short.
      for (const item of checkoutItems) {
        await this.productsService.updateStockWithManager(
          manager,
          item.id,
          -item.quantity,
        );
      }

      return this.orderService.createOrderInTx(manager, {
        userId,
        sessionId,
        items: checkoutItems,
        totalAmount,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        customerDni: contact.customerDni,
        deliveryMethod: contact.deliveryMethod,
        deliveryAddress: contact.deliveryAddress,
        checkoutKey: idempotencyKey,
      });
    });

    // Phase 2 — call MercadoPago after COMMIT. If it fails, compensate.
    try {
      const items = await Promise.all(
        cart.items.map((item) =>
          this.mapCartItemToPreferenceItem(item, MERCADOPAGO_SURCHARGE_RATE),
        ),
      );

      const expiresAt = new Date(
        Date.now() + CHECKOUT_EXPIRATION_MINUTES * 60_000,
      );
      const preferenceData: PreferenceRequest = {
        items,
        // No surcharge: list price for every method. The shopper freely
        // chooses how many installments to finance through MercadoPago.
        payment_methods: {
          installments: MERCADOPAGO_MAX_INSTALLMENTS,
          default_installments: 1,
        },
        // MP stops accepting this payment after the stock hold window, so
        // a released hold can never be paid afterwards.
        expires: true,
        expiration_date_to: expiresAt.toISOString().replace('Z', '+00:00'),
        back_urls: {
          success: this.configService.getOrThrow<string>(
            'MERCADO_PAGO_SUCCESS_URL',
          ),
          failure: this.configService.getOrThrow<string>(
            'MERCADO_PAGO_FAILURE_URL',
          ),
          pending: this.configService.getOrThrow<string>(
            'MERCADO_PAGO_PENDING_URL',
          ),
        },
        auto_return: 'approved',
        statement_descriptor: 'Ecommerce',
        external_reference: order.id,
        notification_url: this.configService.getOrThrow<string>(
          'MERCADO_PAGO_WEBHOOK_URL',
        ),
      };

      const preference = new Preference(this.client);
      const response = await preference.create({ body: preferenceData });
      // Remember the preference so a later supersede can expire it in MP.
      if (response.id) {
        await this.orderService
          .setPreferenceId(order.id, response.id)
          .catch((err) =>
            this.logger.warn(
              `could not store preferenceId for order ${order.id}: ${err.message}`,
            ),
          );
      }
      return { ...response, checkoutUrl: this.resolveCheckoutUrl(response) };
    } catch (error: any) {
      this.logger.error(
        `MercadoPago preference failed for order ${order.id}: ${error.message}`,
      );
      await this.compensateFailedCheckout(order.id);
      throw new Error(
        `Failed to create Mercado Pago preference: ${error.message}`,
      );
    }
  }

  /**
   * Checkout URL the shopper should be sent to. Uses the sandbox URL when
   * MERCADOPAGO_SANDBOX=true (test credentials), the production one otherwise.
   */
  private resolveCheckoutUrl(pref: {
    init_point?: string;
    sandbox_init_point?: string;
  }): string {
    const sandbox =
      this.configService.get<string>('MERCADOPAGO_SANDBOX') === 'true';
    const url = sandbox ? pref.sandbox_init_point : pref.init_point;
    return url ?? pref.init_point ?? pref.sandbox_init_point ?? '';
  }

  /**
   * Offline checkout (transfer/cash): reserve stock and create the order at
   * the discounted transfer price, status PENDING_TRANSFER. No MercadoPago
   * preference — payment is coordinated by WhatsApp afterwards. Sends the
   * "order received" email. Returns the created order.
   */
  async createOfflineOrder(
    cart: Cart,
    userId?: string,
    sessionId?: string,
    contact: {
      customerEmail?: string;
      customerPhone?: string;
      customerDni?: string;
      deliveryMethod?: 'delivery' | 'pickup';
      deliveryAddress?: string;
    } = {},
  ): Promise<Order> {
    if (userId) {
      await this.usersService.findById(userId);
    }
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    await this.supersedePendingCheckouts(userId, sessionId).catch((err) =>
      this.logger.warn(`supersedePendingCheckouts failed: ${err.message}`),
    );
    await this.releaseExpiredCheckouts().catch((err) =>
      this.logger.warn(`releaseExpiredCheckouts failed: ${err.message}`),
    );

    const checkoutItems: CheckoutItemDto[] = cart.items.map((item) => ({
      id: item.productVariationId,
      quantity: item.quantity,
    }));
    // Transfer/cash pays the discounted price (MP keeps the list price).
    const totalAmount =
      Math.round(Number(cart.totalPrice) * (1 - TRANSFER_DISCOUNT_RATE) * 100) /
      100;

    // Pickup + cash/transfer requires a 50% deposit by transfer; the balance is
    // collected on pickup. Shipments and MercadoPago never use a deposit.
    const isPickup = contact.deliveryMethod === 'pickup';
    const depositAmount = isPickup
      ? Math.round(totalAmount * PICKUP_DEPOSIT_RATE * 100) / 100
      : undefined;
    const balanceAmount = isPickup
      ? Math.round((totalAmount - depositAmount!) * 100) / 100
      : undefined;

    const order = await this.dataSource.transaction(async (manager) => {
      const ids = checkoutItems.map((i) => i.id);
      await this.productsService.lockVariationsForUpdate(manager, ids);
      for (const item of checkoutItems) {
        await this.productsService.updateStockWithManager(
          manager,
          item.id,
          -item.quantity,
        );
      }
      return this.orderService.createOrderInTx(manager, {
        userId,
        sessionId,
        items: checkoutItems,
        totalAmount,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        customerDni: contact.customerDni,
        deliveryMethod: contact.deliveryMethod,
        deliveryAddress: contact.deliveryAddress,
        status: OrderStatus.PENDING_TRANSFER,
        depositAmount,
        balanceAmount,
      });
    });

    // Clear the cart now (offline orders have no webhook to do it later).
    await this.clearCartAfterPayment(userId, sessionId).catch(() => undefined);

    if (order.customerEmail) {
      const email = orderEmailFor(OrderStatus.PENDING_TRANSFER, order.id);
      if (email) {
        void this.emailService.send(
          order.customerEmail,
          email.subject,
          email.text,
        );
      }
    }
    await this.notifyShop(order, 'new_order');
    return order;
  }

  /**
   * Supersede the shopper's own pending checkouts: expire their MP
   * preferences (best effort — the payment link stops working) and
   * compensate the orders (stock back, CANCELLED).
   */
  private async supersedePendingCheckouts(
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    const pending = await this.orderService.findPendingForOwner(
      userId,
      sessionId,
    );
    for (const order of pending) {
      if (order.preferenceId) {
        await this.expirePreference(order.preferenceId);
      }
      await this.compensateFailedCheckout(order.id, 'expired');
    }
    if (pending.length > 0) {
      this.logger.log(
        `Superseded ${pending.length} pending checkout(s) for ${userId ?? sessionId}`,
      );
    }
  }

  /** Best-effort: make an MP preference unpayable right now. */
  private async expirePreference(preferenceId: string): Promise<void> {
    try {
      const preference = new Preference(this.client);
      await preference.update({
        id: preferenceId,
        // Partial update: MP only touches the fields sent, but the SDK type
        // demands the full PreferenceRequest (items included) — cast around it.
        updatePreferenceRequest: {
          expires: true,
          expiration_date_to: new Date(Date.now() + 1000)
            .toISOString()
            .replace('Z', '+00:00'),
        } as unknown as PreferenceRequest,
      });
    } catch (error: any) {
      this.logger.warn(
        `could not expire preference ${preferenceId}: ${error.message}`,
      );
    }
  }

  /**
   * Release the stock held by abandoned checkouts: orders still in
   * PROCESSING_PAYMENT older than STOCK_HOLD_RELEASE_MINUTES get their
   * stock restored and are cancelled. Returns how many were released.
   * Idempotent and safe to run concurrently (compensation locks rows and
   * re-checks status inside the transaction).
   */
  async releaseExpiredCheckouts(): Promise<number> {
    const expired = await this.orderService.findExpiredProcessingPayment(
      STOCK_HOLD_RELEASE_MINUTES,
    );
    for (const order of expired) {
      await this.compensateFailedCheckout(order.id, 'expired');
    }
    if (expired.length > 0) {
      this.logger.log(`Released ${expired.length} expired stock hold(s)`);
    }
    return expired.length;
  }

  /**
   * Cancel abandoned offline (transfer/cash) orders older than
   * TRANSFER_RELEASE_DAYS and restore their stock. Idempotent.
   */
  async releaseExpiredTransfers(): Promise<number> {
    const expired = await this.orderService.findExpiredPendingTransfer(
      TRANSFER_RELEASE_DAYS,
    );
    for (const order of expired) {
      await this.compensateFailedCheckout(order.id, 'expired');
    }
    if (expired.length > 0) {
      this.logger.log(`Released ${expired.length} expired transfer(s)`);
    }
    return expired.length;
  }

  /**
   * Restore stock and mark the order `expired` (abandoned hold) or `cancelled`
   * (rejected payment). Idempotent — repeated calls after the order has
   * already been compensated are no-ops. Never cancels an order that has an
   * approved/pending payment (the webhook may still be in flight).
   */
  /**
   * Internal notification to the shop. Fire-and-forget: a mail hiccup must
   * never break checkout or a webhook.
   */
  private async notifyShop(
    order: Order,
    event: 'new_order' | 'payment_approved' | 'payment_rejected',
  ): Promise<void> {
    try {
      const email = shopOrderEmailFor(order, event);
      await this.emailService.send(
        shopNotificationEmail(),
        email.subject,
        email.text,
      );
    } catch (error: any) {
      this.logger.warn(`shop notification failed: ${error.message}`);
    }
  }

  private async compensateFailedCheckout(
    orderId: string,
    reason: 'expired' | 'cancelled' = 'cancelled',
  ): Promise<void> {
    const order = await this.orderService.findById(orderId);
    if (!order) {
      this.logger.warn(`compensate: order ${orderId} not found`);
      return;
    }
    const releasable: OrderStatus[] = [
      OrderStatus.PROCESSING_PAYMENT,
      OrderStatus.PENDING_TRANSFER,
    ];
    if (!releasable.includes(order.status)) {
      return;
    }

    // Never cancel an order that was actually paid: a webhook may still be in
    // flight and already recorded an approved/pending payment.
    if (await this.orderService.hasLivePayment(orderId)) {
      this.logger.warn(
        `compensate: order ${orderId} has an approved/pending payment — not cancelling`,
      );
      return;
    }

    const target =
      reason === 'expired' ? OrderStatus.EXPIRED : OrderStatus.CANCELLED;

    const compensated = await this.dataSource.transaction(async (manager) => {
      const ids = order.items.map((i) => i.productVariationId);
      await this.productsService.lockVariationsForUpdate(manager, ids);

      // Claim the compensation atomically: only the caller that flips the
      // order out of its pre-payment state restores the stock. Protects
      // against concurrent release (lazy + cron) double-restoring, and
      // against cancelling an order a webhook just marked as paid.
      const claimed = await manager
        .getRepository(Order)
        .createQueryBuilder()
        .update(Order)
        .set({ status: target })
        .where('id = :id AND status IN (:...releasable)', {
          id: orderId,
          releasable,
        })
        .execute();
      if (!claimed.affected) return false;

      for (const item of order.items) {
        await this.productsService.updateStockWithManager(
          manager,
          item.productVariationId,
          item.quantity,
        );
      }
      return true;
    });
    if (compensated) {
      this.logger.log(`Compensated stock + ${target} order ${orderId}`);
    }
  }

  private async mapCartItemToPreferenceItem(
    cartItem: any,
    surchargeRate: number,
  ): Promise<PreferenceItem> {
    const product = await this.productsService.findByIdWithDetails(
      cartItem.productVariationId,
    );

    if (!product) {
      throw new Error(
        `Product with id ${cartItem.productVariationId} not found`,
      );
    }

    return {
      id: cartItem.productVariationId.toString(),
      quantity: cartItem.quantity,
      title: product.name,
      // Method-dependent surcharge — see createCheckoutPreferenceFromCart.
      unit_price:
        Math.round(
          (Number(cartItem.price) / cartItem.quantity) *
            (1 + surchargeRate) *
            100,
        ) / 100,
      currency_id: 'ARS',
    };
  }

  async handleWebhookNotification(webhookData: WebhookNotificationDto) {
    this.logger.log(
      `Received webhook notification: ${JSON.stringify(webhookData)}`,
    );

    try {
      switch (webhookData.type) {
        case 'payment':
          await this.handlePaymentNotification(webhookData.data.id);
          break;
        default:
          this.logger.warn(
            `Unhandled webhook notification type: ${webhookData.type}`,
          );
      }

      return { status: 'success' };
    } catch (error: any) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to process webhook: ${error.message}`);
    }
  }

  private async handlePaymentNotification(paymentId: string | number) {
    try {
      const payment = new Payment(this.client);
      let response;
      try {
        response = await payment.get({ id: paymentId.toString() });
      } catch (e: any) {
        // MercadoPago answers 404 for two practical cases: the dashboard
        // "Simulate notification" sends payment_id=123456 which never exists,
        // and any stale id we get re-notified about after the payment was
        // wiped on MP's side. Neither is a retriable error — ack with success
        // so MP marks the webhook healthy and stops retrying.
        const status = e?.status ?? e?.response?.status;
        const message = String(e?.message ?? '');
        if (status === 404 || /not found/i.test(message)) {
          this.logger.warn(
            `Payment ${paymentId} not found in MercadoPago — acknowledging webhook without processing.`,
          );
          return;
        }
        throw e;
      }

      if (
        !response.id ||
        !response.status ||
        !response.status_detail ||
        !response.payment_method_id
      ) {
        throw new Error(`Invalid payment response for payment ${paymentId}`);
      }

      const paymentData: PaymentData = {
        id: response.id.toString(),
        status: response.status,
        status_detail: response.status_detail,
        payment_method_id: response.payment_method_id,
        external_reference: response.external_reference,
      };

      const order = await this.orderService.findById(
        paymentData.external_reference || '',
      );
      if (!order) {
        throw new Error(`Order not found for payment ${paymentId}`);
      }

      // A rejected/failed payment releases the stock hold. Do it BEFORE
      // recording the payment detail (which flips the order to CANCELLED),
      // because compensation only acts on pre-payment states.
      const rejected = ['rejected', 'failed', 'cancelled'].includes(
        paymentData.status.toLowerCase(),
      );
      if (rejected) {
        this.logger.log(
          `Payment ${paymentId} ${paymentData.status} — restoring stock.`,
        );
        await this.compensateFailedCheckout(order.id, 'cancelled');
      }

      // Idempotent: same transactionId is a no-op.
      await this.orderService.updateOrderPayment(order, paymentData);

      switch (paymentData.status) {
        case 'approved': {
          this.logger.log(`Payment ${paymentId} approved.`);
          await this.clearCartAfterPayment(order.userId, order.sessionId);
          // Stock was already decremented at checkout — nothing to do.
          // Fire-and-forget confirmation email; never blocks the webhook.
          if (order.customerEmail && order.status !== OrderStatus.CANCELLED) {
            const email = orderEmailFor(OrderStatus.PAID_PREPARING, order.id);
            if (email) {
              void this.emailService.send(
                order.customerEmail,
                email.subject,
                email.text,
              );
            }
          }
          const approved = await this.orderService.findById(order.id);
          if (approved) await this.notifyShop(approved, 'payment_approved');
          break;
        }
        case 'pending':
        case 'in_process':
          this.logger.log(`Payment ${paymentId} is pending.`);
          break;
        case 'rejected':
        case 'failed':
        case 'cancelled': {
          // Stock already restored above (before updateOrderPayment).
          const rejectedOrder = await this.orderService.findById(order.id);
          if (rejectedOrder) {
            await this.notifyShop(rejectedOrder, 'payment_rejected');
          }
          break;
        }
        case 'refunded':
          this.logger.log(`Payment ${paymentId} refunded.`);
          break;
        default:
          this.logger.warn(`Unhandled payment status: ${paymentData.status}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error fetching payment ${paymentId}: ${error.message}`,
      );
      throw error;
    }
  }

  private async clearCartAfterPayment(
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const cart = await this.cartService.getOrCreateCart(userId, sessionId);

      if (cart && cart.items && cart.items.length > 0) {
        await this.cartService.clearCart(cart.id);
        this.logger.log(
          `Cart cleared for ${userId ? `user ${userId}` : `session ${sessionId}`} after successful payment`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to clear cart: ${error.message}`, error.stack);
    }
  }
}
