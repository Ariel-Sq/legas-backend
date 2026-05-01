import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductPriceTiersService } from '../services/product-price-tiers.service';

/**
 * Public price-tier lookup. List + CUD live in AdminProductPriceTiersController.
 */
@ApiTags('Product Price Tiers')
@Controller('product-price-tiers')
export class ProductPriceTiersController {
  constructor(
    private readonly productPriceTiersService: ProductPriceTiersService,
  ) {}

  @Get('price/:variationId')
  @ApiOperation({ summary: 'Get unit price for a quantity' })
  @ApiParam({ name: 'variationId', description: 'Variation UUID' })
  @ApiQuery({ name: 'quantity', type: 'number' })
  @ApiResponse({ status: 200 })
  async getPriceForQuantity(
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Query('quantity') quantity: string,
  ) {
    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum < 1) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    const price = await this.productPriceTiersService.getPriceForQuantity(
      variationId,
      quantityNum,
    );

    return { price, quantity: quantityNum };
  }
}
