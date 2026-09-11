import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Keep a user's reviews after the account is deleted: anonymize them instead
 * of cascading the delete.
 *
 *  - `reviews.userId` becomes nullable and its FK switches to ON DELETE SET
 *    NULL (was CASCADE).
 *  - `authorName` snapshots the display name so the review doesn't turn into
 *    "Anonymous" once the user row is gone; existing reviews are backfilled
 *    from the current user names.
 *
 * NULL userIds don't collide with any unique constraint (NULLs are distinct
 * in Postgres), so the same person can review again after recreating their
 * account.
 */
export class KeepReviewsOnUserDelete1780200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "userId" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN "authorName" varchar(200)`,
    );
    // Snapshot the current display name for reviews that already exist.
    await queryRunner.query(`
      UPDATE "reviews" r
      SET "authorName" = NULLIF(
        TRIM(CONCAT(u."firstName", ' ', u."lastName")), ''
      )
      FROM "users" u
      WHERE r."userId" = u.id
    `);

    // Drop the existing FK on reviews.userId regardless of its generated name.
    await queryRunner.query(`
      DO $$
      DECLARE cname text;
      BEGIN
        SELECT con.conname INTO cname
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'reviews'::regclass
          AND con.contype = 'f'
          AND att.attname = 'userId';
        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "reviews" DROP CONSTRAINT %I', cname);
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_userId"
       FOREIGN KEY ("userId") REFERENCES "users"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_userId"
       FOREIGN KEY ("userId") REFERENCES "users"("id")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "authorName"`);
    // Reverting to NOT NULL requires removing the anonymized rows.
    await queryRunner.query(`DELETE FROM "reviews" WHERE "userId" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "userId" SET NOT NULL`,
    );
  }
}
