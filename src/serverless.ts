import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from '@app/app.module';
import { configureApp } from '@app/app-setup';

/**
 * Vercel serverless entrypoint (see api/index.js). The Nest app is
 * bootstrapped once per lambda instance and reused across invocations —
 * only the first request of a cold start pays the boot cost.
 */
let cached: Promise<Express> | null = null;

export function getServer(): Promise<Express> {
  if (!cached) {
    cached = (async () => {
      const expressApp = express();
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
      );
      configureApp(app);
      await app.init();
      return expressApp;
    })();
  }
  return cached;
}
