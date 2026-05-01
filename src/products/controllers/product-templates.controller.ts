import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductTemplatesService } from '../services/product-templates.service';

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
  findAll() {
    return this.productTemplatesService.findAll();
  }
}
