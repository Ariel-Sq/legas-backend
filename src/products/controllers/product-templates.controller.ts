import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductTemplatesService } from '../services/product-templates.service';
import { ListProductTemplatesQueryDto } from '../dto/list-product-templates-query.dto';

/**
 * Public read-only template controller. CUD lives in AdminProductTemplatesController.
 */
@ApiTags('Product Templates')
@Controller('product-templates')
export class ProductTemplatesController {
  constructor(
    private readonly productTemplatesService: ProductTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all product templates' })
  @ApiResponse({
    status: 200,
    description: 'Product templates retrieved successfully',
  })
  findAll(@Query() query: ListProductTemplatesQueryDto) {
    return this.productTemplatesService.findAll(query);
  }

  @Get('by-slug/:slugOrId')
  @ApiOperation({
    summary: 'Get one product template by slug or uuid',
    description:
      'Single-template lookup for the product detail page — avoids fetching the whole catalogue.',
  })
  @ApiParam({ name: 'slugOrId', description: 'Template slug or uuid' })
  @ApiResponse({ status: 200, description: 'Product template found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findBySlug(@Param('slugOrId') slugOrId: string) {
    return this.productTemplatesService.findOneBySlugOrId(slugOrId);
  }
}
