import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { PORT } from '@app/utils/environments';
import { configureApp } from '@app/app-setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server running at: http://localhost:${PORT}/api/docs`);
}

bootstrap();
