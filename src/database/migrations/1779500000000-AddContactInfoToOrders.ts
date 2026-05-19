import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot the contact email and phone the shopper enters at checkout
 * onto the order itself. The user's profile may change later, but this
 * column always holds what they typed for THIS delivery — same idea as
 * unitPrice being copied onto order_items.
 *
 * Both columns are nullable: historical orders pre-dating this column
 * stay valid.
 */
export class AddContactInfoToOrders1779500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "customerEmail" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "customerPhone" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "customerPhone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "customerEmail"`,
    );
  }
}
