import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariationIdToOrderItems1762250226986 implements MigrationInterface {
  name = 'AddProductVariationIdToOrderItems1762250226986';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_parentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" DROP CONSTRAINT "FK_product_templates_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_product_images_variation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "FK_product_price_tiers_variation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" DROP CONSTRAINT "FK_product_variations_template"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" DROP CONSTRAINT "FK_order_payment_details_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_images" DROP CONSTRAINT "FK_review_images_reviewId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_productVariationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" DROP CONSTRAINT "FK_product_rating_summary_productVariationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_cart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_product_variation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_carts_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" DROP CONSTRAINT "FK_product_templates_categories_product_template"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" DROP CONSTRAINT "FK_product_templates_categories_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" DROP CONSTRAINT "FK_product_variations_categories_product_variation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" DROP CONSTRAINT "FK_product_variations_categories_category"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_parentId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_level"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_sort_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_mpath"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_templates_category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_templates_is_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_product_templates_slug"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_price_tiers_variation_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_price_tiers_variation_quantity"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_price_tiers_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_variations_template_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_product_variations_sku"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_variations_price"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_variations_attributes"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_variations_sort_order"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_review_images_reviewId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_review_images_sortOrder"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reviews_productVariationId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_createdAt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reviews_isVerifiedPurchase"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_rating_summary_productVariationId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_rating_summary_averageRating"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_rating_summary_totalReviews"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_templates_categories_product_template_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_templates_categories_category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_variations_categories_product_variation_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_variations_categories_category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "CHK_product_price_tiers_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "CHK_product_price_tiers_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "reviews_rating_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "UQ_reviews_user_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "productVariationId" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "authProvider"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_authprovider_enum" AS ENUM('local', 'google', 'facebook', 'instagram', 'apple')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "authProvider" "public"."users_authprovider_enum" NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'admin', 'customer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'processing', 'completed', 'cancelled', 'refunded')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."reviews_status_enum" AS ENUM('pending', 'approved', 'rejected', 'hidden', 'flagged')`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "status" "public"."reviews_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ALTER COLUMN "averageRating" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ALTER COLUMN "ratingDistribution" SET DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ALTER COLUMN "verifiedAverageRating" SET DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "carts" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "carts" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a80b3b5a17be9ca70177f0dcd" ON "categories" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_083b4657d537e819d86961f4aa" ON "categories" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db43047fcc9324b6acbea627d9" ON "categories" ("level") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a6f051e66982b5f0318981bca" ON "categories" ("parentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce5e75c870d5c3ef9c9d9b0f85" ON "product_templates" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26d62bdb455d1b3604c2fb7a94" ON "product_templates" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c4f77fd0d74e1f7f3820ae4f3" ON "product_price_tiers" ("variation_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a29d1fe7e750b3e7b888f2aefd" ON "product_price_tiers" ("variation_id", "min_quantity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e183d6b878e5a09c1360131209" ON "product_price_tiers" ("variation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bac1410de9eac6688c1c613670" ON "product_variations" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cffde77ebe0f40f27fe3485071" ON "product_variations" ("attributes") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea1185ab36cb2c364ed3e83d69" ON "product_variations" ("price") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99ffcb7287adf3b4134158ddd3" ON "product_variations" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c47ad25ab57a5a3daf00a604c" ON "product_variations" ("template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4f5476fb90e6bbe26b0f3a1d24" ON "review_images" ("sortOrder") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c94c9391ebd2ce1f69b5c4e3a" ON "review_images" ("reviewId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5dd7e3b8af3ca3e28faa79cfa4" ON "reviews" ("isVerifiedPurchase") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3b0d4755fa5510f2a4041ffc8" ON "reviews" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7b06c23cf52ca8aea0dcaf0ee2" ON "reviews" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ed5659e7139fc8bc039198cc1" ON "reviews" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_072dd9fa9d5b0b82af3df79a67" ON "reviews" ("productVariationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2264e7ee214ca5dbc4af2feb1b" ON "product_rating_summary" ("totalReviews") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12bf1302d94f139ebc027e0495" ON "product_rating_summary" ("averageRating") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d1c44fa82a12598489df2e6802" ON "product_rating_summary" ("productVariationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3be0cd8d65795b76c074635245" ON "product_templates_categories" ("product_template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f7e19060d13a1e66606158b8f5" ON "product_templates_categories" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_223a1661fdf6b35f1335d7d763" ON "product_variations_categories" ("product_variation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c7c85befe0d4cfe5bfb969d11" ON "product_variations_categories" ("category_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_16e8442d18bf3e61495cfed4257" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" ADD CONSTRAINT "FK_e183d6b878e5a09c1360131209d" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ADD CONSTRAINT "FK_1c47ad25ab57a5a3daf00a604ce" FOREIGN KEY ("template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" ADD CONSTRAINT "FK_8f8c56f3768c203af24721f54f1" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_images" ADD CONSTRAINT "FK_3c94c9391ebd2ce1f69b5c4e3ac" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_072dd9fa9d5b0b82af3df79a673" FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_53a68dc905777554b7f702791fa" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ADD CONSTRAINT "FK_d1c44fa82a12598489df2e6802b" FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_edd714311619a5ad09525045838" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_e72b7ebc5bf611cb51ef1383829" FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" ADD CONSTRAINT "FK_69828a178f152f157dcf2f70a89" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" ADD CONSTRAINT "FK_3be0cd8d65795b76c0746352457" FOREIGN KEY ("product_template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" ADD CONSTRAINT "FK_f7e19060d13a1e66606158b8f5c" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" ADD CONSTRAINT "FK_223a1661fdf6b35f1335d7d7632" FOREIGN KEY ("product_variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" ADD CONSTRAINT "FK_0c7c85befe0d4cfe5bfb969d11a" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" DROP CONSTRAINT "FK_0c7c85befe0d4cfe5bfb969d11a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" DROP CONSTRAINT "FK_223a1661fdf6b35f1335d7d7632"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" DROP CONSTRAINT "FK_f7e19060d13a1e66606158b8f5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" DROP CONSTRAINT "FK_3be0cd8d65795b76c0746352457"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_69828a178f152f157dcf2f70a89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_e72b7ebc5bf611cb51ef1383829"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_edd714311619a5ad09525045838"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" DROP CONSTRAINT "FK_d1c44fa82a12598489df2e6802b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_53a68dc905777554b7f702791fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_072dd9fa9d5b0b82af3df79a673"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_images" DROP CONSTRAINT "FK_3c94c9391ebd2ce1f69b5c4e3ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" DROP CONSTRAINT "FK_8f8c56f3768c203af24721f54f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" DROP CONSTRAINT "FK_1c47ad25ab57a5a3daf00a604ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" DROP CONSTRAINT "FK_e183d6b878e5a09c1360131209d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_16e8442d18bf3e61495cfed4257"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0c7c85befe0d4cfe5bfb969d11"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_223a1661fdf6b35f1335d7d763"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7e19060d13a1e66606158b8f5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3be0cd8d65795b76c074635245"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d1c44fa82a12598489df2e6802"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12bf1302d94f139ebc027e0495"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2264e7ee214ca5dbc4af2feb1b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_072dd9fa9d5b0b82af3df79a67"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ed5659e7139fc8bc039198cc1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b06c23cf52ca8aea0dcaf0ee2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3b0d4755fa5510f2a4041ffc8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5dd7e3b8af3ca3e28faa79cfa4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c94c9391ebd2ce1f69b5c4e3a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f5476fb90e6bbe26b0f3a1d24"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c47ad25ab57a5a3daf00a604c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99ffcb7287adf3b4134158ddd3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea1185ab36cb2c364ed3e83d69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cffde77ebe0f40f27fe3485071"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bac1410de9eac6688c1c613670"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e183d6b878e5a09c1360131209"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a29d1fe7e750b3e7b888f2aefd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c4f77fd0d74e1f7f3820ae4f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26d62bdb455d1b3604c2fb7a94"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce5e75c870d5c3ef9c9d9b0f85"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a6f051e66982b5f0318981bca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db43047fcc9324b6acbea627d9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_083b4657d537e819d86961f4aa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a80b3b5a17be9ca70177f0dcd"`,
    );
    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "carts" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "carts" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ALTER COLUMN "verifiedAverageRating" SET DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ALTER COLUMN "ratingDistribution" SET DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ALTER COLUMN "averageRating" SET DEFAULT 0.00`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."reviews_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "status" character varying(20) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'customer'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "authProvider"`);
    await queryRunner.query(`DROP TYPE "public"."users_authprovider_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "authProvider" character varying NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "productVariationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" ADD "category_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "UQ_reviews_user_product" UNIQUE ("userId", "productVariationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" ADD CONSTRAINT "CHK_product_price_tiers_price" CHECK ((price >= (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" ADD CONSTRAINT "CHK_product_price_tiers_quantity" CHECK (((min_quantity > 0) AND ((max_quantity IS NULL) OR (max_quantity > min_quantity))))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_categories_category_id" ON "product_variations_categories" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_categories_product_variation_id" ON "product_variations_categories" ("product_variation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_categories_category_id" ON "product_templates_categories" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_categories_product_template_id" ON "product_templates_categories" ("product_template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_rating_summary_totalReviews" ON "product_rating_summary" ("totalReviews") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_rating_summary_averageRating" ON "product_rating_summary" ("averageRating") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_rating_summary_productVariationId" ON "product_rating_summary" ("productVariationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_isVerifiedPurchase" ON "reviews" ("isVerifiedPurchase") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_createdAt" ON "reviews" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_status" ON "reviews" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_userId" ON "reviews" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_productVariationId" ON "reviews" ("productVariationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_review_images_sortOrder" ON "review_images" ("sortOrder") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_review_images_reviewId" ON "review_images" ("reviewId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_sort_order" ON "product_variations" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_attributes" ON "product_variations" ("attributes") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_price" ON "product_variations" ("price") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_sku" ON "product_variations" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_variations_template_id" ON "product_variations" ("template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_price_tiers_active" ON "product_price_tiers" ("is_active", "variation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_price_tiers_variation_quantity" ON "product_price_tiers" ("min_quantity", "variation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_price_tiers_variation_id" ON "product_price_tiers" ("variation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_slug" ON "product_templates" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_is_active" ON "product_templates" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_templates_category_id" ON "product_templates" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_mpath" ON "categories" ("mpath") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_sort_order" ON "categories" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_slug" ON "categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_is_active" ON "categories" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_level" ON "categories" ("level") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_parentId" ON "categories" ("parentId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" ADD CONSTRAINT "FK_product_variations_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations_categories" ADD CONSTRAINT "FK_product_variations_categories_product_variation" FOREIGN KEY ("product_variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" ADD CONSTRAINT "FK_product_templates_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates_categories" ADD CONSTRAINT "FK_product_templates_categories_product_template" FOREIGN KEY ("product_template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" ADD CONSTRAINT "FK_carts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_product_variation" FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_cart" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_rating_summary" ADD CONSTRAINT "FK_product_rating_summary_productVariationId" FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_productVariationId" FOREIGN KEY ("productVariationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_images" ADD CONSTRAINT "FK_review_images_reviewId" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payment_details" ADD CONSTRAINT "FK_order_payment_details_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ADD CONSTRAINT "FK_product_variations_template" FOREIGN KEY ("template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_price_tiers" ADD CONSTRAINT "FK_product_price_tiers_variation" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_product_images_variation" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_templates" ADD CONSTRAINT "FK_product_templates_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_parentId" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
