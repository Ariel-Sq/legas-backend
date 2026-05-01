import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

interface StockValidationError {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
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
  ) {
    // Initialize MercadoPago client with the new SDK format
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.getOrThrow<string>(
        'MERCADO_PAGO_ACCESS_TOKEN',
      ),
    });
  }

  async createCheckoutPreferenceFromCart(
    cart: Cart,
    userId?: string,
    sessionId?: string,
  ) {
    if (userId) {
      await this.usersService.findById(userId);
    }

    const stockErrors = await this.validateCartStock(cart);
    if (stockErrors.length > 0) {
      throw new BadRequestException({
        error: 'INSUFFICIENT_STOCK',
        problems: stockErrors,
        message: 'Some products do not have sufficient stock',
      });
    }

    const items = await Promise.all(
      cart.items.map(this.mapCartItemToPreferenceItem.bind(this)),
    );

    const totalAmount = cart.totalPrice;

    const checkoutItems: CheckoutItemDto[] = cart.items.map((item) => ({
      id: item.productVariationId,
      quantity: item.quantity,
    }));

    const order = await this.orderService.createOrder({
      userId,
      sessionId,
      items: checkoutItems,
      totalAmount,
    });

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

    try {
      const preference = new Preference(this.client);
      const response = await preference.create({ body: preferenceData });
      return response;
    } catch (error: any) {
      throw new Error(
        `Failed to create Mercado Pago preference: ${error.message}`,
      );
    }
  }

  private async validateCartStock(cart: Cart): Promise<StockValidationError[]> {
    const errors: StockValidationError[] = [];

    for (const item of cart.items) {
      const product = await this.productsService.findByIdWithDetails(
        item.productVariationId,
      );

      if (!product) {
        errors.push({
          productId: item.productVariationId,
          productName: 'Unknown Product',
          requestedQuantity: item.quantity,
          availableQuantity: 0,
        });
        continue;
      }

      if (product.stock < item.quantity) {
        errors.push({
          productId: item.productVariationId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: product.stock,
        });
      }
    }

    return errors;
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
      unit_price: Number(cartItem.price) / cartItem.quantity, // Price already includes tier logic
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
        // Add more cases for other notification types as needed
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
      const response = await payment.get({ id: paymentId.toString() });

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

      // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      this.logger.log(`Payment ${paymentId} paymentData: ${paymentData}`);

      // Find the order by external reference
      const order = await this.orderService.findById(
        paymentData.external_reference || '',
      );
      if (!order) {
        throw new Error(`Order not found for payment ${paymentId}`);
      }

      // Update order with payment information
      await this.orderService.updateOrderPayment(order, paymentData);

      // Handle different payment statuses
      switch (paymentData.status) {
        case 'approved':
          this.logger.log(`Payment ${paymentId} approved.`);
          await this.clearCartAfterPayment(order.userId, order.sessionId);
          await this.updateInventory(order);
          // TODO: Send order confirmation email
          break;
        case 'pending':
          this.logger.log(`Payment ${paymentId} is pending.`);
          // TODO: Send payment pending notification
          break;
        case 'rejected':
          this.logger.log(`Payment ${paymentId} was rejected.`);
          // TODO: Send payment failed notification
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

  private async updateInventory(order: any): Promise<void> {
    try {
      this.logger.log(`Updating inventory for order ${order.id}`);

      for (const item of order.items) {
        await this.productsService.updateStock(
          item.productVariationId,
          -item.quantity, // Reduce stock by purchased quantity
        );
        this.logger.log(
          `Stock updated for product ${item.productVariationId}: -${item.quantity} units`,
        );
      }

      this.logger.log(`Inventory updated successfully for order ${order.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to update inventory for order ${order.id}: ${error.message}`,
        error.stack,
      );
      // Don't throw error - payment was successful, inventory update is secondary
      // But this should be monitored as it could lead to overselling
    }
  }
}
