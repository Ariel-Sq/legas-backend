import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariation } from './entities/product-variation.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductTemplate } from './entities/product-template.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import type { IStorageService } from '@app/storage/storage.interface';
import { CacheService } from '@app/cache/cache.service';
import { ProductPriceTiersService } from './services/product-price-tiers.service';

@Injectable()
export class ProductVariationsService {
  private readonly logger = new Logger(ProductVariationsService.name);

  constructor(
    @InjectRepository(ProductVariation)
    private productsRepository: Repository<ProductVariation>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    @InjectRepository(ProductTemplate)
    private productTemplatesRepository: Repository<ProductTemplate>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @Inject('StorageService')
    private readonly storageService: IStorageService,
    private readonly cacheService: CacheService,
    private readonly productPriceTiersService: ProductPriceTiersService,
  ) {}

  async create(productData: CreateProductDto): Promise<ProductVariation> {
    this.logger.log('Creating a new product...');
    console.log('productData: ', productData);

    const template = await this.productTemplatesRepository.findOne({
      where: { id: productData.template_id },
    });

    if (!template) {
      throw new NotFoundException(
        `Product template with ID ${productData.template_id} not found`,
      );
    }

    const product = this.productsRepository.create(productData);
    this.logger.log('ProductVariation data prepared, saving to database...');
    console.log('ProductVariation entity: ', product);

    // Save the product to get an ID
    const savedProductVariation = await this.productsRepository.save(product);

    this.logger.log(
      `ProductVariation created successfully with ID: ${savedProductVariation.id}`,
    );
    return this.findByIdWithDetails(savedProductVariation.id);
  }

  async update(id: string, productData: any): Promise<ProductVariation> {
    const product = await this.findByIdWithDetails(id);

    // Update basic product data
    Object.assign(product, productData);
    await this.productsRepository.save(product);

    // Return the updated product with all relations
    return this.findByIdWithDetails(id);
  }

  async delete(id: string): Promise<void> {
    const product = await this.findByIdWithDetails(id);

    // Find all images associated with the product
    const productImages = await this.productImagesRepository.find({
      where: { variation_id: id },
    });

    // Delete each image from Supabase and database
    for (const image of productImages) {
      if (image.path) {
        try {
          await this.storageService.deleteFile(image.path);
        } catch (error: any) {
          // Log but continue if delete fails
          console.error(`Failed to delete image: ${error.message}`);
        }
      }

      // Invalidate cache
      if (image.url) {
        this.cacheService.invalidateCache(image.url);
      }
    }

    await this.productsRepository.remove(product);

    this.logger.log(
      `ProductVariation with ID ${id} and its images deleted successfully`,
    );
  }

  /**
   * Get an image by product ID, using the cache system
   * @param productId - The ID of the product
   * @returns Buffer with the image data or null if not found
   */
  async getProductVariationImage(productId: string): Promise<Buffer | null> {
    // Find the main product image
    const mainImage = await this.productImagesRepository.findOne({
      where: { variation_id: productId, isMain: true },
    });

    if (!mainImage || !mainImage.url) {
      return null;
    }

    // Get the image from cache (or download it if not in cache)
    return this.cacheService.getImage(mainImage.url);
  }

  /**
   * Get product with full details
   */
  async findByIdWithDetails(id: string): Promise<ProductVariation> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!product) {
      throw new NotFoundException(`ProductVariation with ID ${id} not found`);
    }

    return product;
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{
    data: ProductVariation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.productsRepository.findAndCount({
      relations: ['images'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { data, total, page, limit };
  }

  /**
   * Find products by category ID
   */
  async findByCategory(categoryId: string): Promise<ProductVariation[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .innerJoin('product.categories', 'category')
      .where('category.id = :categoryId', { categoryId })
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.categories', 'categories')
      .getMany();
  }

  /**
   * Find products by category slug
   */
  async findByCategorySlug(slug: string): Promise<ProductVariation[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .innerJoin('product.categories', 'category')
      .where('category.slug = :slug', { slug })
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.categories', 'categories')
      .getMany();
  }

  /**
   * Add category to product
   */
  async addCategoryToProductVariation(
    productId: string,
    categoryId: string,
  ): Promise<void> {
    const product = await this.findByIdWithDetails(productId);
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Check if the relationship already exists
    const existingRelationship = await this.productsRepository
      .createQueryBuilder('product')
      .innerJoin('product.categories', 'category')
      .where('product.id = :productId', { productId })
      .andWhere('category.id = :categoryId', { categoryId })
      .getOne();

    if (existingRelationship) {
      throw new Error('ProductVariation is already in this category');
    }

    // Add the category to the product
    product.categories = product.categories || [];
    product.categories.push(category);
    await this.productsRepository.save(product);
  }

  /**
   * Remove category from product
   */
  async removeCategoryFromProductVariation(
    productId: string,
    categoryId: string,
  ): Promise<void> {
    const product = await this.findByIdWithDetails(productId);

    // Remove the category from the product's categories array
    product.categories = product.categories.filter(
      (category) => category.id !== categoryId,
    );

    await this.productsRepository.save(product);
  }

  /**
   * Update product categories
   */
  async updateProductVariationCategories(
    productId: string,
    categoryIds: string[],
  ): Promise<void> {
    const product = await this.findByIdWithDetails(productId);

    // Get all categories
    const categories = await this.categoriesRepository.findByIds(categoryIds);

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    // Update the product's categories
    product.categories = categories;
    await this.productsRepository.save(product);
  }

  /**
   * Get category hierarchy for a product
   */
  async getProductVariationCategoryHierarchy(
    productId: string,
  ): Promise<Category[]> {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      relations: ['categories'],
    });

    if (!product) {
      throw new NotFoundException(
        `ProductVariation with ID ${productId} not found`,
      );
    }

    // For each category, build the full hierarchy path
    const hierarchies: Category[] = [];

    for (const category of product.categories) {
      const hierarchy = await this.buildCategoryHierarchy(category.id);
      hierarchies.push(...hierarchy);
    }

    return hierarchies;
  }

  /**
   * Build category hierarchy from leaf to root
   */
  private async buildCategoryHierarchy(
    categoryId: string,
  ): Promise<Category[]> {
    const hierarchy: Category[] = [];
    let currentCategory = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });

    while (currentCategory) {
      hierarchy.unshift(currentCategory);

      if (currentCategory.parentId) {
        currentCategory = await this.categoriesRepository.findOne({
          where: { id: currentCategory.parentId },
        });
      } else {
        break;
      }
    }

    return hierarchy;
  }

  async getPriceForQuantity(
    variationId: string,
    quantity: number,
  ): Promise<number> {
    return this.productPriceTiersService.getPriceForQuantity(
      variationId,
      quantity,
    );
  }

  async updateStock(
    variationId: string,
    quantityChange: number,
  ): Promise<ProductVariation> {
    const productVariation = await this.findByIdWithDetails(variationId);

    const newStock = productVariation.stock + quantityChange;

    if (newStock < 0) {
      throw new Error(
        `Insufficient stock for product variation ${variationId}. Available: ${productVariation.stock}, Requested: ${Math.abs(quantityChange)}`,
      );
    }

    await this.productsRepository.update(variationId, {
      stock: newStock,
    });

    // Return updated product variation
    return this.findByIdWithDetails(variationId);
  }
}
