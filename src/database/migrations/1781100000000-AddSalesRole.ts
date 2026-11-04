import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `sales` role: takes care of orders (view + status changes) and review
 * moderation. Cannot touch the catalogue, users or the home banner.
 */
export class AddSalesRole1781100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'sales'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot remove a single enum value; leaving `sales` is harmless.
  }
}
