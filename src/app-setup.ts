import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { CORS_ORIGINS } from '@app/utils/environments';
import { AuthMiddleware } from '@app/auth/middleware/auth.middleware';
import { GlobalExceptionFilter } from '@app/global-exception.filter';

/**
 * Cross-cutting app configuration shared by both entrypoints:
 * - src/main.ts        → long-lived server (local dev, Docker/Railway)
 * - src/serverless.ts  → Vercel serverless function
 * Keep every global concern here so the two runtimes never drift.
 */
export function configureApp(app: INestApplication): void {
  // Enable CORS with explicit allowlist
  app.enableCors({ origin: CORS_ORIGINS, credentials: true });

  // Parse Cookie header so AuthMiddleware can read sessionId for anon carts.
  app.use(cookieParser());

  // Apply AuthMiddleware globally for all routes
  const authMiddleware = new AuthMiddleware();
  app.use(authMiddleware.use.bind(authMiddleware));

  // Frontend-origin gate: when FRONTEND_SHARED_SECRET is set, every route
  // (except the ones third parties must reach) requires the header the
  // frontend server attaches (utils/frontend-key.ts). All storefront calls
  // are server-side, so the secret never reaches a browser. Unset in local
  // dev → gate off.
  const frontendKey = process.env.FRONTEND_SHARED_SECRET;
  if (frontendKey) {
    const exempt = [
      '/api/health', // uptime checks
      '/api/images', // fetched by the Next.js image optimizer
      '/api/payments/mercadopago/webhook', // MercadoPago servers
      '/api/cron/', // Vercel Cron (guarded by CRON_SECRET)
      '/api/docs', // Swagger (read-only docs)
    ];
    app.use(
      (
        req: { path: string; headers: Record<string, unknown> },
        res: {
          status: (code: number) => { json: (body: unknown) => void };
        },
        next: () => void,
      ) => {
        if (exempt.some((p) => req.path.startsWith(p))) return next();
        if (req.headers['x-frontend-key'] === frontendKey) return next();
        res
          .status(403)
          .json({ statusCode: 403, message: 'Forbidden', error: 'Forbidden' });
      },
    );
  }

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Configure global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties not in DTO
      forbidNonWhitelisted: true, // Throw error if disallowed properties are present
      transform: true, // Automatically transform types
    }),
  );

  // Strip @Exclude()-marked fields from responses (e.g. user.password, tokens)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Ecommerce API')
    .setDescription('API documentation for Ecommerce application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Backend session JWT obtained from POST /api/auth/google.',
      },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      docExpansion: 'none', // Collapse all sections by default
    },
  });
}
