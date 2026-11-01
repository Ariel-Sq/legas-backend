import {
  Controller,
  Get,
  BadRequestException,
  Param,
  Res,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CacheService } from '@app/cache/cache.service';
import type { IStorageService } from './storage.interface';
import { Inject } from '@nestjs/common';
import { promisify } from 'util';
import * as fs from 'fs';
import { STORAGE_PATH } from '@app/utils/environments';
import { LOCAL_STORAGE } from './storage.service.local';

const readFileAsync = promisify(fs.readFile);

@ApiTags('Images')
@Controller('images')
export class ImageController {
  constructor(
    @Inject('StorageService')
    private readonly storageService: IStorageService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Path-style variant (`/api/images/products/legas/x.jpg`) — preferred:
   * Next.js image optimization rejects remote URLs with query strings
   * unless `search` is configured, so URL builders emit this form.
   */
  @Get('*imagePath')
  @ApiOperation({
    summary: 'Get image file by path',
    description: 'Returns the image file directly (path-style URL)',
  })
  @ApiResponse({
    status: 200,
    description: 'Image file returned successfully',
  })
  async getImageByPath(
    @Param('imagePath') imagePath: string | string[],
    @Res() res: any,
  ): Promise<void> {
    const path = Array.isArray(imagePath) ? imagePath.join('/') : imagePath;
    return this.getImage(path, res);
  }

  @Get()
  @ApiOperation({
    summary: 'Get image file',
    description: 'Returns the image file directly',
  })
  @ApiQuery({
    name: 'path',
    required: true,
    description: 'Path of the image file',
  })
  @ApiResponse({
    status: 200,
    description: 'Image file returned successfully',
  })
  async getImage(@Query('path') path: string, @Res() res: any): Promise<void> {
    const url = await this.storageService.getSignedUrl(path);
    let imageBuffer: Buffer<ArrayBufferLike> | null;
    if (url.startsWith(LOCAL_STORAGE)) {
      const localFile = url.replace(LOCAL_STORAGE, STORAGE_PATH);
      imageBuffer = await readFileAsync(localFile);
    } else {
      imageBuffer = await this.cacheService.getImage(url);
    }

    if (!imageBuffer) {
      throw new BadRequestException('Image not found or could not be loaded');
    }

    const contentType = path.toLowerCase().endsWith('.png')
      ? 'image/png'
      : path.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : path.toLowerCase().endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg';
    res.set({
      'Content-Type': contentType,
      // In development images are edited in place, so never let the browser
      // or the image optimizer keep a stale copy.
      'Cache-Control':
        process.env.NODE_ENV === 'development'
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=3600',
    });
    res.send(imageBuffer);
  }
}
