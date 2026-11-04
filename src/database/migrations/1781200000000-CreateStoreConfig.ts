import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Panel configuration: promotions (percentage discounts), hero carousel
 * slides and a key/value store for the marquee, payment methods and shipping
 * hints.
 */
export class CreateStoreConfig1781200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promotions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(120) NOT NULL,
        "percent" integer NOT NULL,
        "scope" varchar(20) NOT NULL DEFAULT 'all',
        "categoryId" uuid,
        "templateId" uuid,
        "startsAt" timestamptz,
        "endsAt" timestamptz,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_promotions_active" ON "promotions" ("isActive")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hero_slides" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "imagePath" varchar NOT NULL,
        "headline" varchar(120) NOT NULL DEFAULT '',
        "subheadline" varchar(300) NOT NULL DEFAULT '',
        "ctaLabel" varchar(40) NOT NULL DEFAULT '',
        "ctaHref" varchar(300) NOT NULL DEFAULT '',
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_settings" (
        "key" varchar(60) PRIMARY KEY,
        "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Sensible defaults so the panel and the shop agree from the first render.
    await queryRunner.query(`
      INSERT INTO "store_settings" ("key", "value") VALUES
        ('marquee', '{"text":"","isActive":false,"speed":40}'::jsonb),
        ('payments', '{"mercadopago":true,"transfer":true,"cash":true}'::jsonb),
        ('shipping', '{"cost":0,"freeFrom":0,"notes":""}'::jsonb)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hero_slides"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_settings"`);
  }
}
