import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { IStorageService } from './storage.interface';

/**
 * Public read-only storage endpoints.
 * Upload and delete live in AdminStorageController.
 */
@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(
    @Inject('StorageService')
    private readonly storageService: IStorageService,
  ) {}

  @Get('list')
  @ApiOperation({ summary: 'List files in storage' })
  @ApiQuery({
    name: 'path',
    required: false,
    description: 'Directory path to list',
  })
  @ApiResponse({ status: 200, description: 'Files listed successfully' })
  async listFiles(@Query('path') path?: string) {
    return await this.storageService.listFiles(path);
  }

  @Get('url')
  @ApiOperation({ summary: 'Get signed URL for file' })
  @ApiQuery({ name: 'path', required: true })
  @ApiQuery({ name: 'expiresIn', required: false })
  @ApiResponse({ status: 200 })
  async getSignedUrl(
    @Query('path') path: string,
    @Query('expiresIn') expiresIn?: number,
  ) {
    const expiration = expiresIn
      ? parseInt(expiresIn as unknown as string, 10)
      : 60;
    const url = await this.storageService.getSignedUrl(path, expiration);
    return { url };
  }
}
