import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Home page hero banner: one row holding the background image and the copy,
 * so marketing changes don't need a deploy. Seeded with the copy that was
 * hardcoded in the component.
 */
export class CreateHeroBanner1780800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hero_banner" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "imagePath" varchar,
        "headline" varchar(120) NOT NULL,
        "subheadline" varchar(300) NOT NULL DEFAULT '',
        "ctaLabel" varchar(40) NOT NULL DEFAULT 'Ver Colección',
        "ctaHref" varchar(300) NOT NULL DEFAULT '/shop',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO "hero_banner" ("headline", "subheadline", "ctaLabel", "ctaHref")
      SELECT
        'Muebles de Madera Artesanales',
        'Descubrí piezas atemporales que aportan calidez y elegancia a tu hogar',
        'Ver Colección',
        '/shop'
      WHERE NOT EXISTS (SELECT 1 FROM "hero_banner")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hero_banner"`);
  }
}
