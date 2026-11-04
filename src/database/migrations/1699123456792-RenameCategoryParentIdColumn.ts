import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCategoryParentIdColumn1699123456792 implements MigrationInterface {
  name = 'RenameCategoryParentIdColumn1699123456792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the column from parent_id to parentId to match TypeORM expectations
    await queryRunner.query(`
      ALTER TABLE "categories" RENAME COLUMN "parent_id" TO "parentId"
    `);

    // Update the index name to match the new column name
    await queryRunner.query(`
      ALTER INDEX "IDX_categories_parent_id" RENAME TO "IDX_categories_parentId"
    `);

    // Update the foreign key constraint name to match the new column name
    await queryRunner.query(`
      ALTER TABLE "categories" RENAME CONSTRAINT "FK_categories_parent" TO "FK_categories_parentId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the column name from parentId back to parent_id
    await queryRunner.query(`
      ALTER TABLE "categories" RENAME COLUMN "parentId" TO "parent_id"
    `);

    // Revert the index name
    await queryRunner.query(`
      ALTER INDEX "IDX_categories_parentId" RENAME TO "IDX_categories_parent_id"
    `);

    // Revert the foreign key constraint name
    await queryRunner.query(`
      ALTER TABLE "categories" RENAME CONSTRAINT "FK_categories_parentId" TO "FK_categories_parent"
    `);
  }
}
