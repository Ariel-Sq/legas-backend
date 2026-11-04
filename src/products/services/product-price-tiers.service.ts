import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductPriceTier } from '../entities/product-price-tier.entity';
import { PromotionsService } from '@app/site/promotions.service';
import { ProductVariation } from '../entities/product-variation.entity';
import { CreateProductPriceTierDto } from '../dto/create-product-price-tier.dto';
import { UpdateProductPriceTierDto } from '../dto/update-product-price-tier.dto';

@Injectable()
export class ProductPriceTiersService {
  private readonly logger = new Logger(ProductPriceTiersService.name);

  constructor(
    private readonly promotions: PromotionsService,
    @InjectRepository(ProductPriceTier)
    private productPriceTiersRepository: Repository<ProductPriceTier>,
    @InjectRepository(ProductVariation)
    private productVariationsRepository: Repository<ProductVariation>,
  ) {}

  async findByVariationAndQuantity(
    variationId: string,
    quantity: number,
  ): Promise<ProductPriceTier | null> {
    // Buscar el tier que corresponda a la cantidad
    // La cantidad debe ser >= min_quantity Y <= max_quantity (o max_quantity es null)
    // Ordenar por min_quantity DESC para obtener el tier más específico
    const priceTier = await this.productPriceTiersRepository
      .createQueryBuilder('tier')
      .where('tier.variation_id = :variationId', { variationId })
      .andWhere('tier.is_active = true')
      .andWhere('tier.min_quantity <= :quantity', { quantity })
      .andWhere(
        '(tier.max_quantity IS NULL OR tier.max_quantity >= :quantity)',
        { quantity },
      )
      .orderBy('tier.min_quantity', 'DESC')
      .addOrderBy('tier.sort_order', 'ASC')
      .getOne();

    return priceTier || null;
  }

  async findAll(): Promise<ProductPriceTier[]> {
    return this.productPriceTiersRepository.find({
      order: { variation_id: 'ASC', sort_order: 'ASC', min_quantity: 'ASC' },
    });
  }

  async findByVariation(variationId: string): Promise<ProductPriceTier[]> {
    return this.productPriceTiersRepository.find({
      where: { variation_id: variationId },
      order: { sort_order: 'ASC', min_quantity: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ProductPriceTier> {
    const priceTier = await this.productPriceTiersRepository.findOne({
      where: { id },
      relations: ['variation'],
    });

    if (!priceTier) {
      throw new NotFoundException(`Product price tier with ID ${id} not found`);
    }

    return priceTier;
  }

  async create(
    createProductPriceTierDto: CreateProductPriceTierDto,
  ): Promise<ProductPriceTier> {
    this.logger.log('Creating a new product price tier...');

    // Verificar que la variación existe
    const variation = await this.productVariationsRepository.findOne({
      where: { id: createProductPriceTierDto.variation_id },
    });

    if (!variation) {
      throw new NotFoundException(
        `Product variation with ID ${createProductPriceTierDto.variation_id} not found`,
      );
    }

    // Validar que min_quantity < max_quantity si max_quantity existe
    if (
      createProductPriceTierDto.max_quantity &&
      createProductPriceTierDto.min_quantity >=
        createProductPriceTierDto.max_quantity
    ) {
      throw new BadRequestException(
        'min_quantity must be less than max_quantity',
      );
    }

    // Los tiers no entran en conflicto entre sí - los tiers de mayor cantidad tienen prioridad
    // Solo verificamos que el nuevo tier no tenga rangos inválidos
    const conflictingTiers = [];

    if (conflictingTiers.length > 0) {
      throw new BadRequestException(
        'Conflicting price tier found. Please check quantity ranges.',
      );
    }

    const priceTier = this.productPriceTiersRepository.create(
      createProductPriceTierDto,
    );

    const savedPriceTier =
      await this.productPriceTiersRepository.save(priceTier);

    this.logger.log(
      `Product price tier created successfully with ID: ${savedPriceTier.id}`,
    );

    return this.findOne(savedPriceTier.id);
  }

  async update(
    id: string,
    updateProductPriceTierDto: UpdateProductPriceTierDto,
  ): Promise<ProductPriceTier> {
    const priceTier = await this.findOne(id);

    // Validaciones si se están actualizando cantidades
    if (updateProductPriceTierDto.min_quantity !== undefined) {
      if (
        updateProductPriceTierDto.max_quantity &&
        updateProductPriceTierDto.min_quantity >=
          updateProductPriceTierDto.max_quantity
      ) {
        throw new BadRequestException(
          'min_quantity must be less than max_quantity',
        );
      }

      // Los tiers no entran en conflicto entre sí - los tiers de mayor cantidad tienen prioridad
      // Solo verificamos que el tier actualizado no tenga rangos inválidos
      const conflictingTiers = [];

      if (conflictingTiers.length > 0) {
        throw new BadRequestException(
          'Conflicting price tier found. Please check quantity ranges.',
        );
      }
    }

    Object.assign(priceTier, updateProductPriceTierDto);
    await this.productPriceTiersRepository.save(priceTier);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const priceTier = await this.findOne(id);
    await this.productPriceTiersRepository.remove(priceTier);
    this.logger.log(`Product price tier with ID ${id} deleted successfully`);
  }

  async getPriceForQuantity(
    variationId: string,
    quantity: number,
  ): Promise<number> {
    const priceTier = await this.findByVariationAndQuantity(
      variationId,
      quantity,
    );

    const percent = await this.promotions.percentForVariation(variationId);

    if (priceTier) {
      // Discounts stack on top of the quantity tier.
      return this.promotions.apply(Number(priceTier.price), percent);
    }

    // Si no hay tier específico, usar precio base de la variación
    const variation = await this.productVariationsRepository.findOne({
      where: { id: variationId },
    });

    if (!variation) {
      throw new NotFoundException(
        `Product variation with ID ${variationId} not found`,
      );
    }

    return this.promotions.apply(Number(variation.price), percent);
  }
}
