import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Promotions can now target a payment method: "all" (catalogue price, both
 * methods), "offline" (cash/transfer) or "mercadopago" (only the card price).
 */
export class AddPromotionMethod1781300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promotions"
      ADD COLUMN IF NOT EXISTS "method" varchar(20) NOT NULL DEFAULT 'all'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP COLUMN IF EXISTS "method"`,
    );
  }
}
