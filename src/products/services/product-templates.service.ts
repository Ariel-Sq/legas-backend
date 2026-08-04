import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, In, Repository } from 'typeorm';
import { ProductTemplate } from '../entities/product-template.entity';
import { ProductVariation } from '../entities/product-variation.entity';
import { Category } from '../../categories/entities/category.entity';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';
import {
  ListProductTemplatesQueryDto,
  ProductTemplateSortField,
  SortOrder,
} from '../dto/list-product-templates-query.dto';
import { BACKEND_URL } from '@app/utils/environments';

@Injectable()
export class ProductTemplatesService {
  private readonly logger = new Logger(ProductTemplatesService.name);

  constructor(
    @InjectRepository(ProductTemplate)
    private productTemplatesRepository: Repository<ProductTemplate>,
    @InjectRepository(ProductVariation)
    private productVariationsRepository: Repository<ProductVariation>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async findAll(
    query: ListProductTemplatesQueryDto = {},
  ): Promise<ProductTemplate[]> {
    const sortField = query.sort ?? ProductTemplateSortField.NAME;
    const sortOrder = (query.order ?? SortOrder.ASC).toUpperCase() as
      | 'ASC'
      | 'DESC';

    const where =
      query.featured !== undefined
        ? { is_featured: query.featured }
        : undefined;

    // `take` combined with joined relations applies the LIMIT to the joined
    // rows (a template with 3 variations eats 3 slots), so resolve the page
    // of template ids first — no relations, LIMIT works on entities — and
    // then load those ids with the full relation tree.
    let idFilter: { id: ReturnType<typeof In<string>> } | undefined;
    if (query.limit) {
      const idRows = await this.productTemplatesRepository.find({
        // The sort column must be selected too: eager relations force a
        // DISTINCT subquery and its ORDER BY can only reference selected
        // columns.
        select: {
          id: true,
          [sortField]: true,
        } as FindOptionsSelect<ProductTemplate>,
        ...(where ? { where } : {}),
        order: { [sortField]: sortOrder },
        take: query.limit,
      });
      idFilter = { id: In(idRows.map((r) => r.id)) };
    }

    // The LIST endpoint deliberately omits reviews: they were ~half the
    // payload, and no list consumer uses them (the product page loads
    // reviews from /api/reviews; rating summaries come from /api/ratings).
    const res = await this.productTemplatesRepository.find({
      relations: ['categories', 'variations', 'variations.priceTiers'],
      ...(idFilter ? { where: idFilter } : where ? { where } : {}),
      order: { [sortField]: sortOrder, variations: { sort_order: 'ASC' } },
    });

    // Transform image URLs to full URLs
    res.forEach((template) => {
      template.variations.forEach((variation) => {
        variation.images.forEach((image) => {
          image.url = `${BACKEND_URL}/api/images/${image.path}`;
        });
      });
    });

    return res;
  }

  /**
   * Resolve a single template by slug (canonical product URLs) or by uuid
   * (legacy links). Loads the detail-page relation set — no reviews, the
   * product page fetches those from /api/reviews.
   */
  async findOneBySlugOrId(slugOrId: string): Promise<ProductTemplate> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );
    const template = await this.productTemplatesRepository.findOne({
      where: isUuid ? { id: slugOrId } : { slug: slugOrId },
      relations: ['categories', 'variations', 'variations.priceTiers'],
      order: { variations: { sort_order: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException(
        `Product template "${slugOrId}" not found`,
      );
    }

    template.variations.forEach((variation) => {
      variation.images.forEach((image) => {
        image.url = `${BACKEND_URL}/api/images/${image.path}`;
      });
    });

    return template;
  }

  async findOne(id: string): Promise<ProductTemplate> {
    const template = await this.productTemplatesRepository.findOne({
      where: { id },
      relations: [
        'categories',
        'variations',
        'variations.priceTiers',
        'variations.reviews',
        'variations.reviews.user',
      ],
      order: { variations: { sort_order: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException(`Product template with ID ${id} not found`);
    }

    // Transform image URLs to full URLs
    template.variations.forEach((variation) => {
      variation.images.forEach((image) => {
        image.url = `${BACKEND_URL}/api/images/${image.path}`;
      });
    });

    return template;
  }

  async create(
    createProductTemplateDto: CreateProductTemplateDto,
  ): Promise<ProductTemplate> {
    this.logger.log('Creating a new product template...');

    // Check if slug already exists
    const existingTemplate = await this.productTemplatesRepository.findOne({
      where: { slug: createProductTemplateDto.slug },
    });

    if (existingTemplate) {
      throw new BadRequestException(
        `Product template with slug "${createProductTemplateDto.slug}" already exists`,
      );
    }

    const template = this.productTemplatesRepository.create(
      createProductTemplateDto,
    );

    // If category_ids are provided, verify all categories exist
    if (
      createProductTemplateDto.category_ids &&
      createProductTemplateDto.category_ids.length > 0
    ) {
      const categories = await this.categoriesRepository.find({
        where: createProductTemplateDto.category_ids.map((id) => ({ id })),
      });

      if (categories.length !== createProductTemplateDto.category_ids.length) {
        const foundIds = categories.map((cat) => cat.id);
        const notFoundIds = createProductTemplateDto.category_ids.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Categories with IDs ${notFoundIds.join(', ')} not found`,
        );
      }

      // Assign the found categories to the template
      template.categories = categories;
    }

    const savedTemplate = await this.productTemplatesRepository.save(template);

    this.logger.log(
      `Product template created successfully with ID: ${savedTemplate.id}`,
    );
    return this.findOne(savedTemplate.id);
  }

  async update(
    id: string,
    updateProductTemplateDto: UpdateProductTemplateDto,
  ): Promise<ProductTemplate> {
    const template = await this.findOne(id);

    // Check if slug is being changed and if it already exists
    if (
      updateProductTemplateDto.slug &&
      updateProductTemplateDto.slug !== template.slug
    ) {
      const existingTemplate = await this.productTemplatesRepository.findOne({
        where: { slug: updateProductTemplateDto.slug },
      });

      if (existingTemplate) {
        throw new BadRequestException(
          `Product template with slug "${updateProductTemplateDto.slug}" already exists`,
        );
      }
    }

    // If category_ids are being changed, verify all categories exist
    if (
      updateProductTemplateDto.category_ids &&
      JSON.stringify(updateProductTemplateDto.category_ids.sort()) !==
        JSON.stringify(template.categories?.map((cat) => cat.id).sort() || [])
    ) {
      const categories = await this.categoriesRepository.find({
        where: updateProductTemplateDto.category_ids.map((id) => ({ id })),
      });

      if (categories.length !== updateProductTemplateDto.category_ids.length) {
        const foundIds = categories.map((cat) => cat.id);
        const notFoundIds = updateProductTemplateDto.category_ids.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Categories with IDs ${notFoundIds.join(', ')} not found`,
        );
      }

      // Assign the found categories to the template
      template.categories = categories;
    }

    Object.assign(template, updateProductTemplateDto);
    await this.productTemplatesRepository.save(template);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);

    // Check if template has variations
    const variationsCount = await this.productVariationsRepository.count({
      where: { template_id: id },
    });

    if (variationsCount > 0) {
      throw new BadRequestException(
        'Cannot delete template with variations. Delete variations first.',
      );
    }

    await this.productTemplatesRepository.remove(template);
    this.logger.log(`Product template with ID ${id} deleted successfully`);
  }
}
