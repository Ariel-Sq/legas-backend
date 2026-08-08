import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from '@app/health/health.module';
import { ProductsModule } from '@app/products/products.module';
import { StorageModule } from '@app/storage/storage.module';
import { UsersModule } from '@app/users/users.module';
import { CartModule } from '@app/cart/cart.module';
import { PaymentsModule } from '@app/payments/payments.module';
import { CacheModule } from '@app/cache/cache.module';
import { CategoriesModule } from '@app/categories/categories.module';
import { ReviewsModule } from '@app/reviews/reviews.module';
import { WishlistModule } from '@app/wishlist/wishlist.module';
import { AuthModule } from '@app/auth/auth.module';
import { CancellationsModule } from '@app/cancellations/cancellations.module';
import { MetricsModule } from '@app/metrics/metrics.module';
import { THROTTLE_LIMIT, THROTTLE_TTL } from '@app/utils/environments';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        // Managed Postgres providers (Neon, Supabase pooler) require TLS.
        ...(configService.get<string>('DB_SSL') === 'true'
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
        autoLoadEntities: true,
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        // Serverless note: this runs on every cold start; it is a no-op when
        // the schema is up to date. Set MIGRATIONS_RUN=false to disable.
        migrationsRun: configService.get<string>('MIGRATIONS_RUN') !== 'false',
        // Verbose SQL only when LOG_SQL=1; otherwise just errors/warnings.
        logging:
          process.env.LOG_SQL === '1' ? 'all' : (['error', 'warn'] as const),
      }),
    }),
    // Brute force protection
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: THROTTLE_TTL, // 1 minute
          limit: THROTTLE_LIMIT, // 10 requests per minute
        },
      ],
      errorMessage: 'Too many requests. Please try again later.',
    }),
    HealthModule,
    ProductsModule,
    StorageModule,
    UsersModule,
    CartModule,
    PaymentsModule,
    CacheModule,
    CategoriesModule,
    ReviewsModule,
    WishlistModule,
    AuthModule,
    CancellationsModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
