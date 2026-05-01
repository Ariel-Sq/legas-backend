import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProductVariationsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ProductVariation } from './entities/product-variation.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Products')
@Controller('admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductVariationsService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a product variation with optional images' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sku: { type: 'string', example: 'MES-RUS-001' },
        name: { type: 'string', example: 'Mesa de Comedor Rústica' },
        price: { type: 'number', example: 45000 },
        attributes: {
          type: 'object',
          example: { color: 'red', size: 'M' },
        },
        stock: { type: 'number', example: 50 },
        template_id: { type: 'string', format: 'uuid' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['sku', 'name', 'price'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async create(
    @Req() request: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ProductVariation> {
    const productData: CreateProductDto = {
      sku: request.body.sku,
      name: request.body.name,
      price: parseFloat(request.body.price),
      attributes: request.body.attributes
        ? JSON.parse(request.body.attributes)
        : undefined,
      stock: request.body.stock ? parseInt(request.body.stock, 10) : 0,
      template_id: request.body.template_id,
    };

    const product = await this.productsService.create(productData);

    if (files && files.length > 0) {
      await this.productImagesService.create(product.id, files);
    }

    return this.productsService.findByIdWithDetails(product.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product variation' })
  @ApiBody({ type: UpdateProductDto })
  async updateJson(
    @Param('id') id: string,
    @Body() productData: UpdateProductDto,
  ): Promise<ProductVariation> {
    return this.productsService.update(id, productData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product variation' })
  async delete(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.productsService.delete(id);
    return { success: true, message: 'ProductVariation deleted successfully' };
  }
}
