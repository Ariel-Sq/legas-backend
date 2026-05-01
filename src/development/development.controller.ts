import {
  Controller,
  Post,
  Logger,
  BadRequestException,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import type { IStorageService } from '../storage/storage.interface';
import { AdminGuard } from '@app/auth/guards/admin.guard';

@ApiTags('Admin / Development')
@Controller('admin/development')
@UseGuards(AdminGuard)
export class DevelopmentController {
  private readonly logger = new Logger(DevelopmentController.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject('StorageService')
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Clear all database data and storage files (development only)
   */
  @Post('clear-database')
  @ApiOperation({
    summary: 'Clear database and storage (development only)',
    description:
      'Clears all database data and storage files. Only available in development environment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database and storage cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Database and storage cleared successfully',
        },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Endpoint not available in production',
  })
  async clearDatabase() {
    // Basic protection - only allow in development
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      throw new BadRequestException(
        'This endpoint is not available in production',
      );
    }
    this.logger.log('Clear database request received');

    try {
      // Clear all files from storage first
      const storageResult = await this.storageService.clearAllFiles();

      // Clear all database data
      const databaseResult = await this.databaseService.clearDatabase();

      this.logger.log('Database and storage cleared successfully');

      return {
        success: true,
        message: 'Database and storage cleared successfully',
        data: {
          ...databaseResult,
          ...storageResult,
        },
      };
    } catch (error) {
      this.logger.error('Error clearing database:', error);
      throw error;
    }
  }
}
