import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductImagesService } from './product-images.service';
import { ProductImage } from './entities/product-image.entity';
import {
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Product Images')
@Controller('admin/product-variations/:variationId/images')
@UseGuards(AdminGuard)
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  // ===== POST METHODS (Create Operations) =====

  @Post()
  @ApiOperation({ summary: 'Upload multiple images for a product variation' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'variationId',
    type: 'string',
    description: 'ID of the product variation',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        isMain: {
          type: 'boolean',
          description: 'Set as main product image',
        },
        altText: {
          type: 'string',
          description: 'Alternative text for the images',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Maximum 10 images at a time
  uploadImages(
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @Req() request: any,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ProductImage[]> {
    // Parse form fields from multipart/form-data
    const isMain = request.body.isMain === 'true';
    const altText = request.body.altText;

    return this.productImagesService.create(
      variationId,
      files,
      isMain,
      altText,
    );
  }

  // ===== DELETE METHODS (Delete Operations) =====

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product image' })
  @ApiParam({
    name: 'variationId',
    type: 'string',
    description: 'ID of the product variation',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID of the image' })
  async deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.productImagesService.delete(id);
    return { success: true };
  }
}
