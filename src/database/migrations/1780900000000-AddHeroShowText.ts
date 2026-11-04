import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A banner that already carries its own logo and copy should not get the
 * site's headline printed over it. `showText` lets the panel pick: image only,
 * or image with the centered title/button on a darkened background.
 */
export class AddHeroShowText1780900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hero_banner"
      ADD COLUMN IF NOT EXISTS "showText" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hero_banner" DROP COLUMN IF EXISTS "showText"`,
    );
  }
}
