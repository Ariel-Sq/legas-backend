import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Store the MercadoPago preference id on the order so a superseded
 * checkout (shopper started a new one, e.g. switched payment method)
 * can expire its MP preference — otherwise the old link stays payable
 * for up to an hour after we cancelled the order and restored its stock.
 *
 * Nullable: orders created before this column (or whose preference
 * creation failed) simply have no preference to expire.
 */
export class AddPreferenceIdToOrders1779600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "preferenceId" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "preferenceId"`);
  }
}
