import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Defense-in-depth: even if a code path bypasses the application-level
 * `stock + delta >= 0` guard in updateStock, the DB rejects negative stock.
 */
export class AddStockNonNegativeCheck1777800000001
  implements MigrationInterface
{
  name = 'AddStockNonNegativeCheck1777800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_variations
       ADD CONSTRAINT chk_stock_nonneg CHECK (stock >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_variations DROP CONSTRAINT IF EXISTS chk_stock_nonneg`,
    );
  }
}
