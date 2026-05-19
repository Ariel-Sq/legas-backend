import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replace OrderStatus with a richer post-payment lifecycle. Existing orders
 * are wiped — the product decision was that backwards compatibility is not
 * needed, so we don't have to map old values to new ones.
 *
 * New states:
 *   processing_payment      — checkout opened, MP hasn't confirmed yet
 *   paid_preparing          — MP approved, seller hasn't touched it
 *   paid_ready_to_ship      — packed, waiting for pickup / courier
 *   paid_shipped            — in transit
 *   paid_delivered          — buyer received it
 *   cancelled               — MP rejected or seller cancelled
 *   refunded                — MP refunded
 */
export class RebuildOrderStatusEnum1779300000000 implements MigrationInterface {
  name = 'RebuildOrderStatusEnum1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wipe order-related tables in dependency order so the column drop
    // doesn't have to deal with cascades.
    await queryRunner.query(`TRUNCATE TABLE order_payment_details CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE order_items CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE orders CASCADE`);

    // Drop the column → drop the enum → recreate with new values → re-add
    // the column. Faster than ALTER TYPE … RENAME / ADD VALUE dance.
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN status`);
    await queryRunner.query(`DROP TYPE IF EXISTS orders_status_enum`);
    await queryRunner.query(`
      CREATE TYPE orders_status_enum AS ENUM (
        'processing_payment',
        'paid_preparing',
        'paid_ready_to_ship',
        'paid_shipped',
        'paid_delivered',
        'cancelled',
        'refunded'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN status orders_status_enum
        NOT NULL DEFAULT 'processing_payment'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE order_payment_details CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE order_items CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE orders CASCADE`);

    await queryRunner.query(`ALTER TABLE orders DROP COLUMN status`);
    await queryRunner.query(`DROP TYPE IF EXISTS orders_status_enum`);
    await queryRunner.query(`
      CREATE TYPE orders_status_enum AS ENUM (
        'pending', 'processing', 'completed', 'cancelled', 'refunded'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN status orders_status_enum NOT NULL DEFAULT 'pending'
    `);
  }
}
