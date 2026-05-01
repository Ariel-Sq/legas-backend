import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductPriceTiersService } from '../services/product-price-tiers.service';
import { CreateProductPriceTierDto } from '../dto/create-product-price-tier.dto';
import { UpdateProductPriceTierDto } from '../dto/update-product-price-tier.dto';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Product Price Tiers')
@Controller('admin/product-price-tiers')
@UseGuards(AdminGuard)
export class AdminProductPriceTiersController {
  constructor(
    private readonly productPriceTiersService: ProductPriceTiersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all product price tiers' })
  @ApiResponse({ status: 200 })
  findAll() {
    return this.productPriceTiersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a price tier' })
  @ApiResponse({ status: 201 })
  create(@Body() createProductPriceTierDto: CreateProductPriceTierDto) {
    return this.productPriceTiersService.create(createProductPriceTierDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a price tier' })
  @ApiParam({ name: 'id', description: 'Price tier ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductPriceTierDto: UpdateProductPriceTierDto,
  ) {
    return this.productPriceTiersService.update(id, updateProductPriceTierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a price tier' })
  @ApiParam({ name: 'id', description: 'Price tier ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productPriceTiersService.remove(id);
  }
}
