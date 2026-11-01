import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pickup deposit: when the shopper pays cash/transfer AND picks the order up
 * at the shop, they pay 50% up front by transfer to reserve the piece and the
 * balance on pickup. Shipments never use a deposit.
 */
export class AddPickupDepositToOrders1780600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositAmount" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "balanceAmount" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositPaidAt" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "depositPaidAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "balanceAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "depositAmount"`,
    );
  }
}
