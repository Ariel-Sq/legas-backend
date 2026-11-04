import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductPriceTiersTable1699123456794 implements MigrationInterface {
  name = 'CreateProductPriceTiersTable1699123456794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create product_price_tiers table
    await queryRunner.query(`
      CREATE TABLE "product_price_tiers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "variation_id" uuid NOT NULL,
        "min_quantity" integer NOT NULL,
        "max_quantity" integer,
        "price" decimal(10,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_price_tiers" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_product_price_tiers_variation_id" ON "product_price_tiers" ("variation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_price_tiers_variation_quantity" ON "product_price_tiers" ("variation_id", "min_quantity")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_price_tiers_active" ON "product_price_tiers" ("variation_id", "is_active")`,
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "product_price_tiers" ADD CONSTRAINT "FK_product_price_tiers_variation"
      FOREIGN KEY ("variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Add check constraints
    await queryRunner.query(`
      ALTER TABLE "product_price_tiers" ADD CONSTRAINT "CHK_product_price_tiers_quantity"
      CHECK ("min_quantity" > 0 AND ("max_quantity" IS NULL OR "max_quantity" > "min_quantity"))
    `);

    await queryRunner.query(`
      ALTER TABLE "product_price_tiers" ADD CONSTRAINT "CHK_product_price_tiers_price"
      CHECK ("price" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraints
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "CHK_product_price_tiers_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "CHK_product_price_tiers_quantity"`,
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "FK_product_price_tiers_variation"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_product_price_tiers_active"`);
    await queryRunner.query(
      `DROP INDEX "IDX_product_price_tiers_variation_quantity"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_product_price_tiers_variation_id"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "product_price_tiers"`);
  }
}
