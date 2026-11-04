import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariationsCategoriesTable1699123456790 implements MigrationInterface {
  name = 'AddProductVariationsCategoriesTable1699123456790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create junction table for product_variations and categories many-to-many relationship
    await queryRunner.query(`
      CREATE TABLE "product_variations_categories" (
        "product_variation_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        CONSTRAINT "PK_product_variations_categories" PRIMARY KEY ("product_variation_id", "category_id")
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_categories_product_variation_id" ON "product_variations_categories" ("product_variation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_categories_category_id" ON "product_variations_categories" ("category_id")`,
    );

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "product_variations_categories" ADD CONSTRAINT "FK_product_variations_categories_product_variation"
      FOREIGN KEY ("product_variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_variations_categories" ADD CONSTRAINT "FK_product_variations_categories_category"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" DROP CONSTRAINT "FK_product_variations_categories_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" DROP CONSTRAINT "FK_product_variations_categories_product_variation"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_product_variations_categories_category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_product_variations_categories_product_variation_id"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "product_variations_categories"`);
  }
}
