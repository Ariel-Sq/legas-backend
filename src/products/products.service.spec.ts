import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariationsService } from './products.service';
import { ProductVariation } from './entities/product-variation.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductTemplate } from './entities/product-template.entity';
import { Category } from '../categories/entities/category.entity';
import type { IStorageService } from '@app/storage/storage.interface';
import { CacheService } from '@app/cache/cache.service';
import { ProductPriceTiersService } from './services/product-price-tiers.service';
import { NotFoundException } from '@nestjs/common';
import { createTestProductVariation } from '../../test/utils/factories';
import { createMockRepository } from '../../test/utils/test-setup';

describe('ProductVariationsService', () => {
  let service: ProductVariationsService;
  let productRepository: Partial<Repository<ProductVariation>>;
  let productImageRepository: Partial<Repository<ProductImage>>;
  let productTemplateRepository: Partial<Repository<ProductTemplate>>;
  let categoryRepository: Partial<Repository<Category>>;
  let storageService: Partial<IStorageService>;
  let cacheService: Partial<CacheService>;
  let productPriceTiersService: Partial<ProductPriceTiersService>;

  beforeEach(async () => {
    // Create mock repositories
    productRepository = createMockRepository<ProductVariation>();
    productImageRepository = createMockRepository<ProductImage>();
    productTemplateRepository = createMockRepository<ProductTemplate>();
    categoryRepository = createMockRepository<Category>();

    // Create mock services
    storageService = {
      deleteFile: jest.fn(),
    };

    cacheService = {
      getImage: jest.fn(),
      invalidateCache: jest.fn(),
    };

    productPriceTiersService = {
      getPriceForQuantity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariationsService,
        {
          provide: getRepositoryToken(ProductVariation),
          useValue: productRepository,
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: productImageRepository,
        },
        {
          provide: getRepositoryToken(ProductTemplate),
          useValue: productTemplateRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
        {
          provide: 'StorageService',
          useValue: storageService,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: ProductPriceTiersService,
          useValue: productPriceTiersService,
        },
      ],
    }).compile();

    service = module.get<ProductVariationsService>(ProductVariationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByIdWithDetails', () => {
    it('should return a product by id', async () => {
      const mockProductVariation = createTestProductVariation({
        id: '1',
        name: 'Test ProductVariation',
      });

      (productRepository.findOne as jest.Mock).mockResolvedValue(
        mockProductVariation,
      );

      const result = await service.findByIdWithDetails('1');

      expect(result).toEqual(mockProductVariation);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['images'],
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      (productRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findByIdWithDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new product', async () => {
      const productData = {
        template_id: 'template-123',
        name: 'New ProductVariation',
        sku: 'new-sku',
        price: 100,
      };
      const savedProductVariation = {
        ...productData,
        id: 'generated-id',
        sku: 'sku',
        stock: 0,
        is_active: true,
        sort_order: 0,
        attributes: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      (productTemplateRepository.findOne as jest.Mock).mockResolvedValue({
        id: productData.template_id,
      });
      (productRepository.create as jest.Mock).mockReturnValue(productData);
      (productRepository.save as jest.Mock).mockResolvedValue(
        savedProductVariation,
      );
      (productRepository.findOne as jest.Mock).mockResolvedValue(
        savedProductVariation,
      );

      const result = await service.create(productData);

      expect(result).toEqual(savedProductVariation);
      expect(productRepository.create).toHaveBeenCalledWith(productData);
      expect(productRepository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const existingProductVariation = createTestProductVariation({
        id: '1',
        name: 'Old Name',
      });
      const updateData = { name: 'Updated Name' };
      const updatedProductVariation = {
        ...existingProductVariation,
        ...updateData,
      };

      (productRepository.findOne as jest.Mock).mockResolvedValue(
        existingProductVariation,
      );
      (productRepository.save as jest.Mock).mockResolvedValue(
        updatedProductVariation,
      );

      const result = await service.update('1', updateData);

      expect(result).toEqual(updatedProductVariation);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['images'],
      });
      expect(productRepository.save).toHaveBeenCalledWith(
        updatedProductVariation,
      );
    });
  });

  describe('delete', () => {
    it('should delete a product and its images', async () => {
      const product = createTestProductVariation({ id: '1' });
      const mockImages = [
        { id: 'img1', path: 'path1', url: 'url1' },
        { id: 'img2', path: 'path2', url: 'url2' },
      ];

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (productImageRepository.find as jest.Mock).mockResolvedValue(mockImages);
      (productRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.delete('1');

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['images'],
      });
      expect(productImageRepository.find).toHaveBeenCalledWith({
        where: { variation_id: '1' },
      });
      expect(storageService.deleteFile).toHaveBeenCalledWith('path1');
      expect(storageService.deleteFile).toHaveBeenCalledWith('path2');
      expect(cacheService.invalidateCache).toHaveBeenCalledWith('url1');
      expect(cacheService.invalidateCache).toHaveBeenCalledWith('url2');
      expect(productRepository.remove).toHaveBeenCalledWith(product);
    });
  });
});
