import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductTemplatesService } from '../services/product-templates.service';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Product Templates')
@Controller('admin/product-templates')
@UseGuards(AdminGuard)
export class AdminProductTemplatesController {
  constructor(
    private readonly productTemplatesService: ProductTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product template' })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Body() createProductTemplateDto: CreateProductTemplateDto) {
    return this.productTemplatesService.create(createProductTemplateDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product template' })
  @ApiParam({ name: 'id', description: 'Product template ID' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id') id: string,
    @Body() updateProductTemplateDto: UpdateProductTemplateDto,
  ) {
    return this.productTemplatesService.update(id, updateProductTemplateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product template' })
  @ApiParam({ name: 'id', description: 'Product template ID' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.productTemplatesService.remove(id);
  }
}
