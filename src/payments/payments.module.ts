import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { CronController } from './cron.controller';
import { PaymentsService } from './payments.service';
import { ProductsModule } from '@app/products/products.module';
import { UsersModule } from '@app/users/users.module';
import { CartModule } from '@app/cart/cart.module';
import { WebhookValidatorMiddleware } from './middleware/webhook-validator.middleware';
import { OrderService } from './services/order.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderPaymentDetail } from './entities/order-payment-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderPaymentDetail]),
    ProductsModule,
    UsersModule,
    CartModule,
  ],
  controllers: [
    PaymentsController,
    OrdersController,
    AdminOrdersController,
    CronController,
  ],
  providers: [PaymentsService, OrderService],
  exports: [OrderService, TypeOrmModule],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WebhookValidatorMiddleware)
      .forRoutes('payments/mercadopago/webhook');
  }
}
