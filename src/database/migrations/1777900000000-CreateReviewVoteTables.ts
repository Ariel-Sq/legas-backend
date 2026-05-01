import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-user dedup for review helpful votes and reports. The (review_id, user_id)
 * primary keys make repeat votes/reports a no-op (or a 409 at the service layer).
 * Counters on the reviews table are kept as derived numbers (re-COUNTed) so
 * cleanup-on-cascade leaves no drift.
 */
export class CreateReviewVoteTables1777900000000 implements MigrationInterface {
  name = 'CreateReviewVoteTables1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_helpful_votes" (
        "reviewId" uuid NOT NULL,
        "userId"   uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_review_helpful_votes PRIMARY KEY ("reviewId", "userId"),
        CONSTRAINT fk_review_helpful_votes_review
          FOREIGN KEY ("reviewId") REFERENCES reviews(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_helpful_votes_user
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_reports" (
        "reviewId" uuid NOT NULL,
        "userId"   uuid NOT NULL,
        "reason"   varchar(500),
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_review_reports PRIMARY KEY ("reviewId", "userId"),
        CONSTRAINT fk_review_reports_review
          FOREIGN KEY ("reviewId") REFERENCES reviews(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_reports_user
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "review_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "review_helpful_votes"`);
  }
}
