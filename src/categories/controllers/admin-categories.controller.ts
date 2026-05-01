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
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { MoveCategoryDto } from '../dto/move-category.dto';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Categories')
@Controller('admin/categories')
@UseGuards(AdminGuard)
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move category to a new position or parent' })
  @ApiParam({ name: 'id', description: 'Category ID to move' })
  @ApiResponse({ status: 200, description: 'Category moved successfully' })
  moveCategory(
    @Param('id') id: string,
    @Body() moveCategoryDto: MoveCategoryDto,
  ) {
    return this.categoriesService.moveCategory(id, moveCategoryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID to update' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete('delete-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all categories' })
  @ApiResponse({ status: 204, description: 'All categories deleted' })
  deleteAll() {
    return this.categoriesService.deleteAll();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID to delete' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
