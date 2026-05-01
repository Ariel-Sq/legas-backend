import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../services/categories.service';

/**
 * Public categories controller. CUD operations live in AdminCategoriesController.
 */
@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('tree')
  @ApiOperation({
    summary: 'Get category tree',
    description:
      'Retrieves the complete category hierarchy as a tree structure',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
  })
  getCategoryTree() {
    return this.categoriesService.getCategoryTree();
  }
}
