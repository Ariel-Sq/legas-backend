import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookValidatorMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    const dataId = req.query['data.id'] as string;

    if (!xSignature || !xRequestId || !dataId) {
      throw new UnauthorizedException(
        'Missing required webhook headers or query parameters',
      );
    }

    const parts = xSignature.split(',');
    let ts: string | null = null;
    let hash: string | null = null;

    // Extract timestamp and hash from x-signature header
    parts.forEach((part) => {
      const [key, value] = part.split('=').map((s) => s.trim());
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    });

    if (!ts || !hash) {
      throw new UnauthorizedException('Invalid x-signature format');
    }

    // Get the webhook secret from environment variables
    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) {
      throw new Error('MERCADOPAGO_WEBHOOK_SECRET is not configured');
    }

    // Create the manifest string
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Calculate HMAC
    const calculatedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    // Constant-time comparison so an attacker can't probe the secret with
    // timing differences. timingSafeEqual throws if buffers differ in length.
    const calcBuf = Buffer.from(calculatedHash, 'hex');
    const recvBuf = Buffer.from(hash, 'hex');
    if (
      calcBuf.length !== recvBuf.length ||
      !crypto.timingSafeEqual(calcBuf, recvBuf)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    next();
  }
}
