import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionIdToOrders1777600000000 implements MigrationInterface {
  name = 'AddSessionIdToOrders1777600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "sessionId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "sessionId"`);
  }
}
