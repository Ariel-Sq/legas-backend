import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { del, head, list, put } from '@vercel/blob';
import { IStorageService } from './storage.interface';

/**
 * Vercel Blob storage adapter — used when STORAGE_TYPE=VERCEL_BLOB.
 * Requires BLOB_READ_WRITE_TOKEN (injected automatically when the Blob
 * store is connected to the Vercel project; set manually elsewhere).
 * Files are stored public with their logical path as the pathname, so
 * paths recorded in product_images keep working across storage backends.
 */
@Injectable()
export class StorageServiceBlob implements IStorageService {
  private readonly logger = new Logger(StorageServiceBlob.name);

  async uploadFile(
    file: Express.Multer.File,
    path: string = '',
  ): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    try {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const relativePath = path ? `${path}/${fileName}` : fileName;

      const blob = await put(relativePath, file.buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: file.mimetype,
      });

      return { url: blob.url, path: relativePath };
    } catch (error: any) {
      this.logger.error(`Error in uploadFile: ${error.message}`, error);
      throw new BadRequestException(`Error uploading file: ${error.message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const url = await this.getSignedUrl(filePath);
      await del(url);
    } catch (error: any) {
      this.logger.error(`Error in deleteFile: ${error.message}`, error);
      throw new BadRequestException(`Error deleting file: ${error.message}`);
    }
  }

  async listFiles(path: string = ''): Promise<any[]> {
    try {
      const { blobs } = await list({ prefix: path });
      return blobs.map((blob) => ({
        name: blob.pathname,
        id: blob.pathname,
        updated_at: blob.uploadedAt,
        created_at: blob.uploadedAt,
        last_accessed_at: null,
        metadata: { size: blob.size, url: blob.url },
      }));
    } catch (error: any) {
      this.logger.error(`Error in listFiles: ${error.message}`, error);
      throw new BadRequestException(`Error listing files: ${error.message}`);
    }
  }

  async getSignedUrl(filePath: string): Promise<string> {
    // Blobs are public: BLOB_BASE_URL (the store's public origin, e.g.
    // https://xxxx.public.blob.vercel-storage.com) lets us build the URL
    // without an API roundtrip; otherwise fall back to head().
    const base = process.env.BLOB_BASE_URL;
    if (base) {
      return `${base.replace(/\/$/, '')}/${filePath}`;
    }
    try {
      const blob = await head(filePath);
      return blob.url;
    } catch (error: any) {
      this.logger.error(`Error in getSignedUrl: ${error.message}`, error);
      throw new BadRequestException(`File not found: ${filePath}`);
    }
  }

  async clearAllFiles(): Promise<{ filesDeleted: number }> {
    try {
      const { blobs } = await list();
      if (blobs.length === 0) return { filesDeleted: 0 };
      await del(blobs.map((blob) => blob.url));
      this.logger.log(`Deleted ${blobs.length} blobs`);
      return { filesDeleted: blobs.length };
    } catch (error: any) {
      this.logger.error(`Error in clearAllFiles: ${error.message}`, error);
      throw error;
    }
  }
}
