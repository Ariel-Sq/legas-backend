import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the shopper's DNI to the user profile so it can be pre-filled at
 * checkout (the checkout requires it to coordinate the sale).
 */
export class AddDniToUsers1780300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "dni" varchar(20)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dni"`);
  }
}
