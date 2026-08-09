import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CartService } from '@app/cart/cart.service';

/**
 * Maintenance endpoints invoked by Vercel Cron (see vercel.json `crons`).
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env var is
 * set — requests without it are rejected. The same jobs also run lazily in
 * the hot paths (e.g. checkout), so the cron is a daily backstop.
 */
@ApiTags('Cron')
@Controller('cron')
export class CronController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly cartService: CartService,
  ) {}

  @Get('release-stock')
  @ApiOperation({
    summary: 'Daily maintenance: release stock holds + sweep orphan carts',
    description:
      'Cancels PROCESSING_PAYMENT orders older than the hold window (restoring stock) and deletes anonymous carts untouched for 30 days.',
  })
  @ApiResponse({ status: 200, description: 'Counts of the sweep.' })
  async releaseStock(@Req() req: Request): Promise<{
    released: number;
    transfersReleased: number;
    orphanCartsDeleted: number;
  }> {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    const released = await this.paymentsService.releaseExpiredCheckouts();
    const transfersReleased =
      await this.paymentsService.releaseExpiredTransfers();
    const orphanCartsDeleted =
      await this.cartService.cleanupOrphanAnonymousCarts();
    return { released, transfersReleased, orphanCartsDeleted };
  }
}
