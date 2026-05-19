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

interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

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
  ) {
    if (userId) {
      await this.usersService.findById(userId);
    }
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const checkoutItems: CheckoutItemDto[] = cart.items.map((item) => ({
      id: item.productVariationId,
      quantity: item.quantity,
    }));
    const totalAmount = cart.totalPrice;

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
        cart.items.map(this.mapCartItemToPreferenceItem.bind(this)),
      );

      const preferenceData: PreferenceRequest = {
        items,
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
   * Restore stock and mark the order CANCELLED. Idempotent — repeated calls
   * after the order has already been compensated are no-ops.
   */
  private async compensateFailedCheckout(orderId: string): Promise<void> {
    const order = await this.orderService.findById(orderId);
    if (!order) {
      this.logger.warn(`compensate: order ${orderId} not found`);
      return;
    }
    if (order.status === OrderStatus.CANCELLED) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const ids = order.items.map((i) => i.productVariationId);
      await this.productsService.lockVariationsForUpdate(manager, ids);

      for (const item of order.items) {
        await this.productsService.updateStockWithManager(
          manager,
          item.productVariationId,
          item.quantity,
        );
      }
      await manager
        .getRepository(Order)
        .update(orderId, { status: OrderStatus.CANCELLED });
    });
    this.logger.log(`Compensated stock + cancelled order ${orderId}`);
  }

  private async mapCartItemToPreferenceItem(
    cartItem: any,
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
      unit_price: Number(cartItem.price) / cartItem.quantity,
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
        case 'approved':
          this.logger.log(`Payment ${paymentId} approved.`);
          await this.clearCartAfterPayment(order.userId, order.sessionId);
          // Stock was already decremented at checkout — nothing to do.
          break;
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
      this.logger.error(
        `Failed to clear cart: ${error.message}`,
        error.stack,
      );
    }
  }
}
