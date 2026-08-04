import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

/**
 * Maintenance endpoints invoked by Vercel Cron (see vercel.json `crons`).
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env var is
 * set — requests without it are rejected. The same jobs also run lazily in
 * the hot paths (e.g. checkout), so the cron is a daily backstop.
 */
@ApiTags('Cron')
@Controller('cron')
export class CronController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('release-stock')
  @ApiOperation({
    summary: 'Release stock held by abandoned checkouts',
    description:
      'Cancels PROCESSING_PAYMENT orders older than the hold window and restores their stock.',
  })
  @ApiResponse({ status: 200, description: 'Number of released holds.' })
  async releaseStock(@Req() req: Request): Promise<{ released: number }> {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    const released = await this.paymentsService.releaseExpiredCheckouts();
    return { released };
  }
}
