import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFeaturedToProductTemplates1779100000000
  implements MigrationInterface
{
  name = 'AddIsFeaturedToProductTemplates1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_templates
       ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_product_templates_is_featured
       ON product_templates (is_featured)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_product_templates_is_featured`,
    );
    await queryRunner.query(
      `ALTER TABLE product_templates DROP COLUMN IF EXISTS is_featured`,
    );
  }
}
