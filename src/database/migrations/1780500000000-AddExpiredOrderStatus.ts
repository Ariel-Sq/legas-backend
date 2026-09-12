import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `expired` status for abandoned/superseded checkout holds, so they can be
 * hidden from the customer's order history (unlike a user/admin CANCELLED).
 */
export class AddExpiredOrderStatus1780500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'expired'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot drop a single enum value; leaving it is harmless.
  }
}
