import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot how the shopper wants the order delivered:
 *  - deliveryMethod: 'delivery' (default) or 'pickup' (retira en persona).
 *  - deliveryAddress: the address they typed, null when they pick up.
 *
 * Both nullable so historical orders stay valid.
 */
export class AddDeliveryToOrders1780100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "deliveryMethod" varchar DEFAULT 'delivery'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "deliveryAddress" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "deliveryAddress"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryMethod"`);
  }
}
