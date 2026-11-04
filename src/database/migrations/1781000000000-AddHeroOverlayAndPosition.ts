import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Banner tuning: how dark the veil over the photo is (percent) and which part
 * of the photo stays visible when it is cropped (vertical focal point).
 */
export class AddHeroOverlayAndPosition1781000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hero_banner"
      ADD COLUMN IF NOT EXISTS "overlayOpacity" integer NOT NULL DEFAULT 15,
      ADD COLUMN IF NOT EXISTS "imagePosition" integer NOT NULL DEFAULT 50
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hero_banner"
      DROP COLUMN IF EXISTS "overlayOpacity",
      DROP COLUMN IF EXISTS "imagePosition"
    `);
  }
}
