import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create the wishlist_items table — per-user favorites.
 *
 * Schema:
 *   id                   uuid PK
 *   userId               uuid FK -> users.id (CASCADE on delete), indexed
 *   productVariationId   uuid FK -> product_variations.id (CASCADE on delete)
 *   createdAt            timestamptz
 *
 * Unique (userId, productVariationId) so a user cannot favorite the same
 * variation twice. The service layer treats add() as an idempotent upsert
 * but the constraint is the authoritative guarantee.
 */
export class CreateWishlistItemsTable1779400000000
  implements MigrationInterface
{
  name = 'CreateWishlistItemsTable1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wishlist_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "productVariationId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wishlist_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wishlist_items_userId"
        ON "wishlist_items" ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE "wishlist_items"
        ADD CONSTRAINT "UQ_wishlist_items_user_variation"
        UNIQUE ("userId", "productVariationId")
    `);

    await queryRunner.query(`
      ALTER TABLE "wishlist_items"
        ADD CONSTRAINT "FK_wishlist_items_userId"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "wishlist_items"
        ADD CONSTRAINT "FK_wishlist_items_productVariationId"
        FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "FK_wishlist_items_productVariationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "FK_wishlist_items_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "UQ_wishlist_items_user_variation"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wishlist_items_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wishlist_items"`);
  }
}
