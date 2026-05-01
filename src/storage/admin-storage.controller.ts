import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Inject,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { IStorageService } from './storage.interface';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Storage')
@Controller('admin/storage')
@UseGuards(AdminGuard)
export class AdminStorageController {
  private readonly logger = new Logger(AdminStorageController.name);

  constructor(
    @Inject('StorageService')
    private readonly storageService: IStorageService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { path?: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      return await this.storageService.uploadFile(file, body.path);
    } catch (error) {
      this.logger.error('Error uploading file', error);
      throw error;
    }
  }

  @Delete('files/:path')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'path', required: true })
  @ApiResponse({ status: 200 })
  async deleteFile(@Param('path') path: string) {
    await this.storageService.deleteFile(path);
    return { message: 'File deleted successfully' };
  }
}
