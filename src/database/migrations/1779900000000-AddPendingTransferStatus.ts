import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the `pending_transfer` value to the order status enum: orders placed
 * with transfer/cash sit here until payment is confirmed (coordinated by
 * WhatsApp). Postgres 12+ allows ADD VALUE inside a transaction; the value
 * is only used at runtime, never in this migration.
 */
export class AddPendingTransferStatus1779900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'pending_transfer'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot drop a single enum value; leaving it is harmless.
  }
}
