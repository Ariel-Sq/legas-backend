import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Palette-choice telemetry: one aggregate row per (base, accent) combo with
 * a counter — enough to learn the most-picked palette without storing any
 * per-user data.
 */
export class CreatePaletteEvents1779800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "palette_choices" (
        "base" varchar(30) NOT NULL,
        "accent" varchar(30) NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("base", "accent")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "palette_choices"`);
  }
}
