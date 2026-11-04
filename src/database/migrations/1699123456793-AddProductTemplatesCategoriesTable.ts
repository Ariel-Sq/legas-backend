import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductTemplatesCategoriesTable1699123456793 implements MigrationInterface {
  name = 'AddProductTemplatesCategoriesTable1699123456793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create junction table for product_templates and categories many-to-many relationship
    await queryRunner.query(`
      CREATE TABLE "product_templates_categories" (
        "product_template_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        CONSTRAINT "PK_product_templates_categories" PRIMARY KEY ("product_template_id", "category_id")
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_categories_product_template_id" ON "product_templates_categories" ("product_template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_categories_category_id" ON "product_templates_categories" ("category_id")`,
    );

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "product_templates_categories" ADD CONSTRAINT "FK_product_templates_categories_product_template"
      FOREIGN KEY ("product_template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_templates_categories" ADD CONSTRAINT "FK_product_templates_categories_category"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" DROP CONSTRAINT "FK_product_templates_categories_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" DROP CONSTRAINT "FK_product_templates_categories_product_template"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_product_templates_categories_category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_product_templates_categories_product_template_id"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "product_templates_categories"`);
  }
}
