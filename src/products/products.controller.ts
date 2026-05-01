import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductVariationsService } from './products.service';
import { ProductVariation } from './entities/product-variation.entity';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

/**
 * Public read-only endpoints for product variations.
 * Create / update / delete live in AdminProductsController.
 */
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductVariationsService) {}

  @Get()
  @ApiOperation({ summary: 'List product variations (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list.' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAllPaginated(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product variation by ID' })
  @ApiResponse({ status: 200, type: ProductVariation })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductVariation> {
    return this.productsService.findByIdWithDetails(id);
  }
}
