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
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHOD_CONFIG,
  type CheckoutPaymentMethod,
} from './payment-method.config';
import { EmailService } from '@app/notifications/email.service';
import { orderEmailFor } from '@app/notifications/order-emails';

interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

// Surcharge rates and per-method MP restrictions live in
// payment-method.config.ts (account_money +10%, credit_card +20%).

/**
 * Stock-hold lifecycle. Checkout reserves stock BEFORE payment, so an
 * abandoned MP checkout holds stock hostage. The MP preference expires at
 * CHECKOUT_EXPIRATION_MINUTES (MP stops accepting the payment), and the
 * hold is released after STOCK_HOLD_RELEASE_MINUTES (> expiration, so a
 * payment can never land on an already-released order).
 */
export const CHECKOUT_EXPIRATION_MINUTES = 60;
export const STOCK_HOLD_RELEASE_MINUTES = 90;

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
    contact: { customerEmail?: string; customerPhone?: string } = {},
    paymentMethod: CheckoutPaymentMethod = DEFAULT_PAYMENT_METHOD,
  ) {
    const methodConfig = PAYMENT_METHOD_CONFIG[paymentMethod];
    if (userId) {
      await this.usersService.findById(userId);
    }
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
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
    // Catalogue prices are cash/transfer prices. Online checkout goes through
    // MercadoPago, which carries a method-dependent surcharge — applied to
    // the order total and to every MP preference item so the charge matches
    // the summary shown in the frontend (see payment-method.config.ts).
    const totalAmount =
      Math.round(
        Number(cart.totalPrice) * (1 + methodConfig.surchargeRate) * 100,
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
      });
    });

    // Phase 2 — call MercadoPago after COMMIT. If it fails, compensate.
    try {
      const items = await Promise.all(
        cart.items.map((item) =>
          this.mapCartItemToPreferenceItem(item, methodConfig.surchargeRate),
        ),
      );

      const expiresAt = new Date(
        Date.now() + CHECKOUT_EXPIRATION_MINUTES * 60_000,
      );
      const preferenceData: PreferenceRequest = {
        items,
        // Restrict the MP screen to the methods matching the chosen
        // surcharge, and cap installments (3 for credit).
        payment_methods: {
          excluded_payment_types: methodConfig.excludedPaymentTypes,
          installments: methodConfig.maxInstallments,
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
      return response;
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
      await this.compensateFailedCheckout(order.id);
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
      await this.compensateFailedCheckout(order.id);
    }
    if (expired.length > 0) {
      this.logger.log(`Released ${expired.length} expired stock hold(s)`);
    }
    return expired.length;
  }

  /**
   * Restore stock and mark the order CANCELLED. Idempotent — repeated calls
   * after the order has already been compensated are no-ops.
   */
  private async compensateFailedCheckout(orderId: string): Promise<void> {
    const order = await this.orderService.findById(orderId);
    if (!order) {
      this.logger.warn(`compensate: order ${orderId} not found`);
      return;
    }
    if (order.status !== OrderStatus.PROCESSING_PAYMENT) {
      return;
    }

    const compensated = await this.dataSource.transaction(async (manager) => {
      const ids = order.items.map((i) => i.productVariationId);
      await this.productsService.lockVariationsForUpdate(manager, ids);

      // Claim the compensation atomically: only the caller that flips the
      // order out of PROCESSING_PAYMENT restores the stock. Protects
      // against concurrent release (lazy + cron) double-restoring, and
      // against cancelling an order a webhook just marked as paid.
      const claimed = await manager
        .getRepository(Order)
        .update(
          { id: orderId, status: OrderStatus.PROCESSING_PAYMENT },
          { status: OrderStatus.CANCELLED },
        );
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
      this.logger.log(`Compensated stock + cancelled order ${orderId}`);
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
          break;
        }
        case 'pending':
          this.logger.log(`Payment ${paymentId} is pending.`);
          break;
        case 'rejected':
        case 'cancelled':
          this.logger.log(
            `Payment ${paymentId} ${paymentData.status} — restoring stock.`,
          );
          await this.compensateFailedCheckout(order.id);
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
