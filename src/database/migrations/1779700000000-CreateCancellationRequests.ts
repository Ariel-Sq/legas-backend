import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Botón de arrepentimiento" (Resolución 424/2020): consumers can revoke a
 * purchase within 10 días corridos via a public form. The provider must give
 * them a trámite code — we return it instantly and store the request so the
 * admin (via chat) can process it.
 */
export class CreateCancellationRequests1779700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cancellation_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(20) NOT NULL UNIQUE,
        "orderId" uuid,
        "name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(40),
        "message" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cancellation_requests_status" ON "cancellation_requests" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cancellation_requests"`);
  }
}
