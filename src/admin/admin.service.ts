import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductTemplate } from '@app/products/entities/product-template.entity';
import { ProductVariation } from '@app/products/entities/product-variation.entity';
import { ProductImage } from '@app/products/entities/product-image.entity';
import { Category } from '@app/categories/entities/category.entity';
import { User, UserRole } from '@app/users/entities/user.entity';
import type { IStorageService } from '@app/storage/storage.interface';
import { AdminAuditService } from './admin-audit.service';
import {
  CreateProductDto,
  CreateVariationDto,
  UpdateImageDto,
  UpdateProductDto,
  UpdateVariationDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';
import type { AdminActor } from './admin.guard';

const IMAGE_PATH = 'products/legas';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(ProductTemplate)
    private readonly templates: Repository<ProductTemplate>,
    @InjectRepository(ProductVariation)
    private readonly variations: Repository<ProductVariation>,
    @InjectRepository(ProductImage)
    private readonly images: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @Inject('StorageService')
    private readonly storage: IStorageService,
    private readonly audit: AdminAuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ----- Reads -----

  async listProducts(q?: string) {
    const query = this.templates
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.categories', 'c')
      .leftJoinAndSelect('t.variations', 'v')
      .orderBy('t.name', 'ASC');

    if (q?.trim()) {
      query.andWhere('(t.name ILIKE :q OR t.slug ILIKE :q)', {
        q: `%${q.trim()}%`,
      });
    }

    const templates = await query.getMany();

    // One query for every main image, keyed by variation.
    const variationIds = templates.flatMap((t) => t.variations.map((v) => v.id));
    const mainImages = variationIds.length
      ? await this.images.find({
          where: { variation_id: In(variationIds), isMain: true },
        })
      : [];
    const imageByVariation = new Map(
      mainImages.map((img) => [img.variation_id, img.path]),
    );

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      is_active: t.is_active,
      is_featured: t.is_featured,
      category: t.categories?.[0]?.name ?? null,
      variations: t.variations.length,
      minPrice: t.variations.length
        ? Math.min(...t.variations.map((v) => Number(v.price)))
        : 0,
      mainImage: t.variations.length
        ? (imageByVariation.get(t.variations[0].id) ?? null)
        : null,
    }));
  }

  async getProduct(id: string) {
    const template = await this.templates.findOne({
      where: { id },
      relations: ['categories', 'variations'],
    });
    if (!template) throw new NotFoundException('Producto no encontrado');

    const variations = (template.variations ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const variationIds = variations.map((v) => v.id);
    const images = variationIds.length
      ? await this.images.find({
          where: { variation_id: In(variationIds) },
          order: { sortOrder: 'ASC' },
        })
      : [];

    return {
      ...template,
      variations: variations.map((v) => ({
        ...v,
        images: images.filter((img) => img.variation_id === v.id),
      })),
    };
  }

  async listCategories() {
    return this.categories.find({ order: { name: 'ASC' } });
  }

  async listUsers() {
    const users = await this.users.find({ order: { createdAt: 'ASC' } });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  async listAudit(limit = 100) {
    return this.dataSource.query(
      `SELECT "actorEmail", "action", "entity", "entityId", "payload", "createdAt"
         FROM "admin_audit_log" ORDER BY "createdAt" DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 500)],
    );
  }

  // ----- Writes -----

  /**
   * Create an empty product (template). Variants and photos are added from the
   * editor right after, so the shop never gets a product without price by
   * mistake: it starts hidden unless asked otherwise.
   */
  async createProduct(dto: CreateProductDto, actor: AdminActor) {
    const categories = await this.categories.findBy({
      id: In(dto.categoryIds),
    });
    if (categories.length === 0) {
      throw new BadRequestException('Elegí al menos una categoría');
    }

    const base = dto.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'producto';

    let slug = base;
    let suffix = 2;
    while (await this.templates.findOne({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    const template = this.templates.create({
      name: dto.name.trim(),
      slug,
      description: dto.description ?? '',
      specifications: dto.specifications ?? {},
      is_active: dto.is_active ?? false,
      is_featured: dto.is_featured ?? false,
      categories,
    });
    const saved = await this.templates.save(template);

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'create',
      entity: 'product',
      entityId: saved.id,
      payload: { name: saved.name, slug: saved.slug },
    });
    return saved;
  }

  async updateProduct(id: string, dto: UpdateProductDto, actor: AdminActor) {
    const template = await this.templates.findOne({
      where: { id },
      relations: ['categories'],
    });
    if (!template) throw new NotFoundException('Producto no encontrado');

    if (dto.name !== undefined) template.name = dto.name.trim();
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.specifications !== undefined) {
      template.specifications = dto.specifications;
    }
    if (dto.is_active !== undefined) template.is_active = dto.is_active;
    if (dto.is_featured !== undefined) template.is_featured = dto.is_featured;

    if (dto.categoryIds) {
      if (dto.categoryIds.length === 0) {
        throw new BadRequestException('Elegí al menos una categoría');
      }
      template.categories = await this.categories.findBy({
        id: In(dto.categoryIds),
      });
      if (template.categories.length !== dto.categoryIds.length) {
        throw new BadRequestException('Alguna categoría no existe');
      }
    }

    const saved = await this.templates.save(template);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update',
      entity: 'product',
      entityId: id,
      payload: dto,
    });
    return saved;
  }

  /**
   * New size/price for an existing product. The SKU and the display name are
   * derived from the template so the catalogue stays consistent.
   */
  async createVariation(
    productId: string,
    dto: CreateVariationDto,
    actor: AdminActor,
  ) {
    const template = await this.templates.findOne({
      where: { id: productId },
      relations: ['variations'],
    });
    if (!template) throw new NotFoundException('Producto no encontrado');

    const medida = dto.medida.trim().replace(/\s+/g, '');
    if (!/^[0-9]+(x[0-9]+){1,2}$/i.test(medida)) {
      throw new BadRequestException(
        'La medida debe tener el formato 100x60 o 100x60x40',
      );
    }

    const sku = `${template.slug}-${medida.toLowerCase()}`;
    const exists = await this.variations.findOne({ where: { sku } });
    if (exists) {
      throw new BadRequestException(`Ya existe una variante con la medida ${medida}`);
    }

    const material =
      (template.variations?.[0]?.attributes?.material as string) ?? 'Álamo';

    const variation = this.variations.create({
      template_id: template.id,
      sku,
      name: `${template.name} · ${medida} cm`,
      price: dto.price,
      stock: dto.stock ?? 10,
      attributes: { medida: `${medida} cm`, material },
      sort_order: (template.variations?.length ?? 0),
    });
    const saved = await this.variations.save(variation);

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'create',
      entity: 'variation',
      entityId: saved.id,
      payload: { medida, price: dto.price, sku },
    });
    return saved;
  }

  async updateVariation(id: string, dto: UpdateVariationDto, actor: AdminActor) {
    const variation = await this.variations.findOne({ where: { id } });
    if (!variation) throw new NotFoundException('Variante no encontrada');

    if (dto.name !== undefined) variation.name = dto.name.trim();
    if (dto.price !== undefined) variation.price = dto.price;
    if (dto.stock !== undefined) variation.stock = dto.stock;
    if (dto.is_active !== undefined) variation.is_active = dto.is_active;

    const saved = await this.variations.save(variation);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update',
      entity: 'variation',
      entityId: id,
      payload: dto,
    });
    return saved;
  }

  async addImage(
    variationId: string,
    file: Express.Multer.File | undefined,
    actor: AdminActor,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido (webp, jpg o png)');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('La imagen supera los 4 MB (límite de subida)');
    }

    const variation = await this.variations.findOne({
      where: { id: variationId },
    });
    if (!variation) throw new NotFoundException('Variante no encontrada');

    const uploaded = await this.storage.uploadFile(file, IMAGE_PATH);
    const existing = await this.images.find({
      where: { variation_id: variationId },
    });

    const image = this.images.create({
      url: `/api/images?path=${uploaded.path}`,
      path: uploaded.path,
      isMain: existing.length === 0,
      sortOrder: existing.length,
      altText: variation.name,
      variation_id: variationId,
    });
    const saved = await this.images.save(image);

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'upload-image',
      entity: 'variation',
      entityId: variationId,
      payload: { path: uploaded.path },
    });
    return saved;
  }

  async updateImage(id: string, dto: UpdateImageDto, actor: AdminActor) {
    const image = await this.images.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Imagen no encontrada');

    if (dto.isMain === true) {
      // Only one main image per variation.
      await this.images.update(
        { variation_id: image.variation_id },
        { isMain: false },
      );
      image.isMain = true;
    } else if (dto.isMain === false) {
      image.isMain = false;
    }
    if (dto.sortOrder !== undefined) image.sortOrder = dto.sortOrder;
    if (dto.altText !== undefined) image.altText = dto.altText;

    const saved = await this.images.save(image);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update',
      entity: 'image',
      entityId: id,
      payload: dto,
    });
    return saved;
  }

  async deleteImage(id: string, actor: AdminActor) {
    const image = await this.images.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Imagen no encontrada');

    const siblings = await this.images.count({
      where: { variation_id: image.variation_id },
    });
    if (siblings <= 1) {
      throw new BadRequestException(
        'Cada producto necesita al menos una foto. Subí otra antes de borrar esta.',
      );
    }

    await this.images.remove(image);
    if (image.isMain) {
      const next = await this.images.findOne({
        where: { variation_id: image.variation_id },
        order: { sortOrder: 'ASC' },
      });
      if (next) {
        next.isMain = true;
        await this.images.save(next);
      }
    }

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'delete',
      entity: 'image',
      entityId: id,
      payload: { path: image.path },
    });
    return { ok: true };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, actor: AdminActor) {
    if (!actor.isOwner) {
      throw new BadRequestException('Solo el dueño puede cambiar roles');
    }
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
    if (ownerEmail && user.email.toLowerCase() === ownerEmail) {
      throw new BadRequestException('El rol del dueño no se puede cambiar');
    }

    user.role = dto.role as UserRole;
    const saved = await this.users.save(user);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update-role',
      entity: 'user',
      entityId: id,
      payload: { role: dto.role, email: user.email },
    });
    return { id: saved.id, email: saved.email, role: saved.role };
  }
}
