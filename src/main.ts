import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '@app/app.module';
import { CORS_ORIGINS, PORT } from '@app/utils/environments';
import { AuthMiddleware } from '@app/auth/middleware/auth.middleware';
import { GlobalExceptionFilter } from '@app/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with explicit allowlist
  app.enableCors({ origin: CORS_ORIGINS, credentials: true });

  // Parse Cookie header so AuthMiddleware can read sessionId for anon carts.
  app.use(cookieParser());

  // Apply AuthMiddleware globally for all routes
  const authMiddleware = new AuthMiddleware();
  app.use(authMiddleware.use.bind(authMiddleware));

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

  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server running at: http://localhost:${PORT}/api/docs`);
}

bootstrap();
