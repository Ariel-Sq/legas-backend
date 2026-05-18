import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `order_items.productVariationId` was created as `character varying`, while
 * `product_variations.id` is `uuid`. Joining the two raised
 * `operator does not exist: uuid = character varying`, which broke the
 * /api/orders endpoint as soon as it eager-loaded the variation. All
 * existing values are uuid-format strings, so the USING cast is safe.
 */
export class AlterOrderItemsProductVariationIdToUuid1779200000000
  implements MigrationInterface
{
  name = 'AlterOrderItemsProductVariationIdToUuid1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE order_items
         ALTER COLUMN "productVariationId" TYPE uuid
         USING "productVariationId"::uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE order_items
         ALTER COLUMN "productVariationId" TYPE character varying
         USING "productVariationId"::text`,
    );
  }
}
