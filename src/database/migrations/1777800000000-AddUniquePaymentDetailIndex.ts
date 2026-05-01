import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Webhook idempotency: same (orderId, transactionId) cannot be inserted twice.
 * Lets PaymentsService skip MercadoPago retries cleanly.
 */
export class AddUniquePaymentDetailIndex1777800000000
  implements MigrationInterface
{
  name = 'AddUniquePaymentDetailIndex1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop pre-existing duplicates that would block the unique index.
    await queryRunner.query(
      `DELETE FROM order_payment_details a
       USING order_payment_details b
       WHERE a.id < b.id
         AND a."orderId" = b."orderId"
         AND a."transactionId" = b."transactionId"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_detail_order_tx"
       ON order_payment_details ("orderId", "transactionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_payment_detail_order_tx"`,
    );
  }
}
