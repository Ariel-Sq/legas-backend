import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join, dirname, resolve, sep } from 'path';
import { STORAGE_PATH } from '@app/utils/environments';
import { IStorageService } from './storage.interface';

export const LOCAL_STORAGE = '{{LOCAL_STORAGE}}';
@Injectable()
export class StorageServiceLocal implements IStorageService {
  private readonly logger = new Logger(StorageServiceLocal.name);

  constructor() {
    // Ensure directory exists
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
      this.logger.log(`Created local storage directory: ${STORAGE_PATH}`);
    }
    this.logger.log(`Local storage initialized at: ${STORAGE_PATH}`);
  }

  /**
   * Upload a file to local storage
   * @param file - The file to upload
   * @param path - Optional path within the storage (e.g., 'products/')
   * @returns The URL of the uploaded file
   */
  async uploadFile(
    file: Express.Multer.File,
    path: string = '',
  ): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      // Create a unique file name to prevent overwriting existing files
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const relativePath = path ? `${path}/${fileName}` : fileName;
      const fullPath = join(STORAGE_PATH, relativePath);

      // Ensure the directory exists
      const dir = dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(fullPath, file.buffer);

      return Promise.resolve({
        url: await this.getSignedUrl(relativePath),
        path: relativePath,
      });
    } catch (error: any) {
      this.logger.error(`Error in uploadFile: ${error.message}`, error);
      throw new BadRequestException(`Error uploading file: ${error.message}`);
    }
  }

  /**
   * Delete a file from local storage
   * @param filePath - The path of the file to delete
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = join(STORAGE_PATH, filePath);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`File not found: ${fullPath}`);
        throw new BadRequestException(`File not found: ${filePath}`);
      }
      fs.unlinkSync(fullPath);
      return Promise.resolve();
    } catch (error: any) {
      this.logger.error(`Error in deleteFile: ${error.message}`, error);
      throw new BadRequestException(`Error deleting file: ${error.message}`);
    }
  }

  /**
   * List files in a directory
   * @param path - The directory path to list
   * @returns List of files
   */
  async listFiles(path: string = ''): Promise<any[]> {
    try {
      const dirPath = join(STORAGE_PATH, path);
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      const files = fs.readdirSync(dirPath);
      // Return array of objects similar to Supabase format
      return Promise.resolve(
        files.map((file) => ({
          name: file,
          id: file,
          updated_at: null,
          created_at: null,
          last_accessed_at: null,
          metadata: null,
        })),
      );
    } catch (error: any) {
      this.logger.error(`Error in listFiles: ${error.message}`, error);
      throw new BadRequestException(`Error listing files: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for temporary access (for local, return the full path)
   * @param filePath - The path to the file
   * @param expiresIn - Expiration time in seconds (ignored for local)
   * @returns The full path as "signed URL"
   */
  getSignedUrl(filePath: string): Promise<string> {
    try {
      // Reject path traversal: the resolved target must stay under
      // STORAGE_PATH (e.g. `../../etc/passwd` escapes it). This is the choke
      // point the image controller calls before reading the file.
      const root = resolve(STORAGE_PATH);
      const fullPath = resolve(root, filePath);
      if (fullPath !== root && !fullPath.startsWith(root + sep)) {
        throw new BadRequestException(`Invalid path: ${filePath}`);
      }
      if (!fs.existsSync(fullPath)) {
        throw new BadRequestException(`File not found: ${filePath}`);
      }

      const signedUrl = `${LOCAL_STORAGE}/${filePath}`;
      return Promise.resolve(signedUrl);
    } catch (error: any) {
      this.logger.error(`Error in getSignedUrl: ${error.message}`, error);
      throw new BadRequestException(
        `Error creating signed URL: ${error.message}`,
      );
    }
  }

  /**
   * Clear all files from the local storage directory (development only)
   * @returns Number of files deleted
   */
  clearAllFiles(): Promise<{ filesDeleted: number }> {
    try {
      this.logger.log('Starting local storage cleanup...');

      if (!fs.existsSync(STORAGE_PATH)) {
        this.logger.log('Local storage directory does not exist');
        return Promise.resolve({ filesDeleted: 0 });
      }

      const files = fs.readdirSync(STORAGE_PATH);
      if (files.length === 0) {
        this.logger.log('No files found in local storage');
        return Promise.resolve({ filesDeleted: 0 });
      }

      let deletedCount = 0;
      for (const file of files) {
        const filePath = join(STORAGE_PATH, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      this.logger.log(
        `Successfully deleted ${deletedCount} files from local storage`,
      );
      return Promise.resolve({ filesDeleted: deletedCount });
    } catch (error: any) {
      this.logger.error(`Error in clearAllFiles: ${error.message}`, error);
      throw error;
    }
  }
}
