import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot the DNI the shopper enters at checkout onto the order itself.
 * Same idea as customerEmail/customerPhone: holds what they typed for THIS
 * order, independent of any later profile change.
 *
 * Nullable: historical orders pre-dating this column stay valid.
 */
export class AddDniToOrders1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "customerDni" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerDni"`);
  }
}
