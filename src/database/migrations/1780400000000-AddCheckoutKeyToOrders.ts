import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client-provided idempotency key for a checkout attempt, so re-clicking
 * "Pagar" (or retrying) reuses the live order/preference instead of creating
 * duplicate orders.
 */
export class AddCheckoutKeyToOrders1780400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "checkoutKey" varchar`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_checkoutKey" ON "orders" ("checkoutKey")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_checkoutKey"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "checkoutKey"`);
  }
}
