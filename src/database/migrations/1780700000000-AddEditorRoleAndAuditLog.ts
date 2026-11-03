import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `editor` role for the admin panel, plus an audit log so changes made by
 * delegated users can be traced (who, what, when).
 */
export class AddEditorRoleAndAuditLog1780700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'editor'`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_log" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actorId" uuid,
        "actorEmail" varchar,
        "action" varchar NOT NULL,
        "entity" varchar NOT NULL,
        "entityId" varchar,
        "payload" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_audit_createdAt" ON "admin_audit_log" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audit_log"`);
    // Postgres cannot remove a single enum value; leaving `editor` is harmless.
  }
}
