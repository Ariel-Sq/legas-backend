import {
  BadRequestException,
  Logger,
  ForbiddenException,
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
import { User, UserRole, AuthProvider } from '@app/users/entities/user.entity';
import { Order, OrderStatus } from '@app/payments/entities/order.entity';
import { EmailService } from '@app/notifications/email.service';
import { SiteService } from '@app/site/site.service';
import { publicImageUrl } from '@app/utils/image-url';
import type { IStorageService } from '@app/storage/storage.interface';
import { AdminAuditService } from './admin-audit.service';
import {
  CreateProductDto,
  CreateVariationDto,
  InviteUserDto,
  UpdateImageDto,
  UpdateOrderStatusDto,
  UpdateHeroDto,
  UpdateProductDto,
  UpdateVariationDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';
import type { AdminActor } from './admin.guard';

const IMAGE_PATH = 'products/legas';
const HERO_IMAGE_PATH = 'site/hero';
const MAX_IMAGES_PER_VARIATION = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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
    private readonly email: EmailService,
    private readonly site: SiteService,
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
    const variationIds = templates.flatMap((t) =>
      t.variations.map((v) => v.id),
    );
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
      // Absolute URL (Blob CDN in production): the panel renders thumbnails
      // straight from it instead of proxying each byte through the API.
      mainImageUrl: t.variations.length
        ? publicImageUrl({
            path: imageByVariation.get(t.variations[0].id) ?? undefined,
          }) || null
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
      // Stock is not part of the panel anymore (everything is made to order);
      // `undefined` keys are dropped from the JSON payload.
      variations: variations.map((v) => ({
        ...v,
        stock: undefined,
        images: images
          .filter((img) => img.variation_id === v.id)
          .map((img) => ({ ...img, url: publicImageUrl(img) })),
      })),
    };
  }

  async listCategories() {
    return this.categories.find({ order: { name: 'ASC' } });
  }

  /**
   * Only people with panel access (owner/admin/editor) are listed. Store
   * customers are not staff and never show up here; to give one access, invite
   * their email — the invite upgrades the existing row instead of duplicating
   * it.
   */
  async listUsers() {
    const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
    const users = await this.users
      .createQueryBuilder('u')
      .where('u.role IN (:...roles)', {
        roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR],
      })
      .orWhere('LOWER(u.email) = :ownerEmail', { ownerEmail })
      .orderBy('u.createdAt', 'ASC')
      .getMany();
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

    const base =
      dto.name
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
      throw new BadRequestException(
        `Ya existe una variante con la medida ${medida}`,
      );
    }

    const material =
      (template.variations?.[0]?.attributes?.material as string) ?? 'Álamo';

    const variation = this.variations.create({
      template_id: template.id,
      sku,
      name: `${template.name} · ${medida} cm`,
      price: dto.price,
      stock: 0,
      attributes: { medida: `${medida} cm`, material },
      sort_order: template.variations?.length ?? 0,
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

  async updateVariation(
    id: string,
    dto: UpdateVariationDto,
    actor: AdminActor,
  ) {
    const variation = await this.variations.findOne({ where: { id } });
    if (!variation) throw new NotFoundException('Variante no encontrada');

    if (dto.name !== undefined) variation.name = dto.name.trim();
    if (dto.price !== undefined) variation.price = dto.price;
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
      throw new BadRequestException(
        'La imagen supera los 4 MB (límite de subida)',
      );
    }

    const variation = await this.variations.findOne({
      where: { id: variationId },
    });
    if (!variation) throw new NotFoundException('Variante no encontrada');

    const existing = await this.images.find({
      where: { variation_id: variationId },
    });
    if (existing.length >= MAX_IMAGES_PER_VARIATION) {
      throw new BadRequestException(
        `Máximo ${MAX_IMAGES_PER_VARIATION} fotos por variante`,
      );
    }

    const uploaded = await this.storage.uploadFile(file, IMAGE_PATH);

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

    user.role = dto.role;
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

  async deleteProduct(id: string, actor: AdminActor) {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Producto no encontrado');

    await this.templates.remove(template);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'delete',
      entity: 'product',
      entityId: id,
      payload: { name: template.name, slug: template.slug },
    });
    return { ok: true };
  }

  // ----- Orders -----

  async listOrders(status?: string) {
    const rows = await this.dataSource.query(
      `SELECT o.id, o.status, o."totalAmount", o."customerEmail", o."customerPhone",
              o."deliveryMethod", o."deliveryAddress", o."depositAmount",
              o."balanceAmount", o."depositPaidAt", o."createdAt",
              COALESCE(SUM(oi.quantity), 0)::int AS items,
              STRING_AGG(oi.title, ' · ') AS titles
         FROM orders o
         LEFT JOIN order_items oi ON oi."orderId" = o.id
         ${status ? 'WHERE o.status = $1' : ''}
         GROUP BY o.id
         ORDER BY o."createdAt" DESC
         LIMIT 200`,
      status ? [status] : [],
    );
    return rows;
  }

  async updateOrderStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actor: AdminActor,
  ) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    order.status = dto.status as OrderStatus;
    await this.dataSource.getRepository(Order).save(order);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update-status',
      entity: 'order',
      entityId: id,
      payload: { status: dto.status },
    });
    return { ok: true, status: order.status };
  }

  async markDepositPaid(id: string, actor: AdminActor) {
    await this.dataSource.query(
      `UPDATE orders SET "depositPaidAt" = now(), status = 'paid_preparing', "updatedAt" = now() WHERE id = $1`,
      [id],
    );
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'deposit-paid',
      entity: 'order',
      entityId: id,
    });
    return { ok: true };
  }

  // ----- Users -----

  /**
   * Pre-authorise an email with a role. The person then signs in with Google
   * (which creates/links their user row) and already has the permissions.
   */
  async inviteUser(dto: InviteUserDto, actor: AdminActor) {
    if (!actor.isOwner) {
      throw new ForbiddenException('Solo el dueño puede invitar usuarios');
    }
    const email = dto.email.trim().toLowerCase();

    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      user = this.users.create({
        email,
        firstName: email.split('@')[0],
        lastName: '',
        role: dto.role,
        authProvider: AuthProvider.GOOGLE,
      });
    } else {
      user.role = dto.role;
    }
    const saved = await this.users.save(user);

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'invite',
      entity: 'user',
      entityId: saved.id,
      payload: { email, role: dto.role },
    });

    const site = (
      process.env.FRONTEND_URL ?? 'https://legasmuebles.com'
    ).replace(/\/$/, '');
    // The panel lives on its own subdomain (admin.<site>); /admin on the
    // storefront answers 404 by design.
    const panel =
      process.env.ADMIN_PANEL_URL ??
      site.replace('://www.', '://').replace('://', '://admin.');
    const roleLabel =
      dto.role === UserRole.ADMIN
        ? 'administrador'
        : dto.role === UserRole.EDITOR
          ? 'editor'
          : 'cliente';
    const emailSent = await this.email.send(
      saved.email,
      'Te invitaron al panel de Legas Muebles',
      `Hola!\n\nTe habilitamos acceso al panel de Legas Muebles con rol de ${roleLabel}.\n\n` +
        `Para entrar: abrí ${panel}, ingresá el usuario y la contraseña del equipo ` +
        `(te los pasamos aparte) y después iniciá sesión con Google usando este mismo email.\n\n` +
        `Si no esperabas este mensaje, ignorá este correo.\n\n— Legas Muebles`,
    );

    this.logger.log(
      `invite: ${saved.email} role=${dto.role} emailSent=${emailSent}`,
    );

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      emailSent,
    };
  }

  // ----- Home hero -----

  async getHero() {
    const hero = await this.site.getHero();
    return {
      ...this.site.toPublic(hero),
      imagePath: hero.imagePath,
      updatedAt: hero.updatedAt,
    };
  }

  async updateHero(dto: UpdateHeroDto, actor: AdminActor) {
    await this.site.updateHero(dto);
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update',
      entity: 'hero',
      payload: { ...dto },
    });
    return this.getHero();
  }

  async uploadHeroImage(file: Express.Multer.File, actor: AdminActor) {
    if (!file) {
      throw new BadRequestException('Falta la imagen');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido (webp, jpg o png)');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'La imagen supera los 4 MB (límite de subida)',
      );
    }

    const uploaded = await this.storage.uploadFile(file, HERO_IMAGE_PATH);
    const { previousPath } = await this.site.setImage(uploaded.path);

    if (previousPath && previousPath !== uploaded.path) {
      // Best effort: an orphaned file is harmless, a failed upload is not.
      await this.storage.deleteFile(previousPath).catch(() => undefined);
    }

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update-image',
      entity: 'hero',
      payload: { path: uploaded.path },
    });
    return this.getHero();
  }

  async deleteHeroImage(actor: AdminActor) {
    const { previousPath } = await this.site.clearImage();
    if (previousPath) {
      await this.storage.deleteFile(previousPath).catch(() => undefined);
    }
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'delete-image',
      entity: 'hero',
    });
    return this.getHero();
  }
}
