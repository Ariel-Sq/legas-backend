import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';
import { promisify } from 'util';
import NodeCache from 'node-cache';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new NodeCache({
    stdTTL: 3600, // 1 hour default TTL
    checkperiod: 600, // check for expired keys every 10 minutes
    useClones: false, // don't clone objects (for memory efficiency)
  });
  private readonly cacheDir: string = path.join(
    process.cwd(),
    'cache',
    'images',
  );

  constructor() {
    this.initializeCacheDir();
  }

  private async initializeCacheDir(): Promise<void> {
    try {
      if (!(await existsAsync(this.cacheDir))) {
        await mkdirAsync(this.cacheDir, { recursive: true });
        this.logger.log(`Cache directory created at ${this.cacheDir}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to create cache directory: ${error.message}`);
    }
  }

  /**
   * Get an image from cache by URL, or download and cache it if not found
   * @param imageUrl - The URL of the image to get
   * @returns Buffer with the image data
   */
  async getImage(imageUrl: string): Promise<Buffer | null> {
    if (!imageUrl) return null;

    // Create a hash of the URL to use as the cache key
    const cacheKey = this.generateCacheKey(imageUrl);

    // Check if the image is in memory cache
    const cachedImage = this.cache.get<Buffer>(cacheKey);
    if (cachedImage) {
      this.logger.debug(`Cache hit for image: ${imageUrl}`);
      return cachedImage;
    }

    // Check if the image is in file cache
    const fileCachePath = path.join(this.cacheDir, cacheKey);
    try {
      if (await existsAsync(fileCachePath)) {
        const imageBuffer = await readFileAsync(fileCachePath);
        // Store in memory cache for faster access
        this.cache.set(cacheKey, imageBuffer);
        this.logger.debug(`File cache hit for image: ${imageUrl}`);
        return imageBuffer;
      }
    } catch (error: any) {
      this.logger.error(`Error reading cached image file: ${error.message}`);
    }

    // If not found in cache, download the image
    return this.downloadAndCacheImage(imageUrl, cacheKey, fileCachePath);
  }

  /**
   * Download an image and cache it
   * @param imageUrl - The URL of the image to download
   * @param cacheKey - The cache key to use
   * @param fileCachePath - The path to cache the file
   * @returns Buffer with the image data
   */
  private async downloadAndCacheImage(
    imageUrl: string,
    cacheKey: string,
    fileCachePath: string,
  ): Promise<Buffer | null> {
    try {
      this.logger.debug(`Downloading image: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });

      const imageBuffer = Buffer.from(response.data, 'binary');

      // Save to memory cache
      this.cache.set(cacheKey, imageBuffer);

      // Save to file cache
      await writeFileAsync(fileCachePath, imageBuffer);

      this.logger.debug(`Image downloaded and cached: ${imageUrl}`);
      return imageBuffer;
    } catch (error: any) {
      this.logger.error(
        `Error downloading image from ${imageUrl}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Generate a cache key from a URL
   * @param url - The URL to hash
   * @returns A hashed string to use as a cache key
   */
  private generateCacheKey(url: string): string {
    // For Supabase signed URLs, drop the token query param so cache survives token rotation.
    // For non-URL strings (e.g. local-storage placeholders) hash the raw value.
    let keyInput = url;
    try {
      const urlObj = new URL(url);
      keyInput =
        urlObj.pathname +
        (urlObj.searchParams.get('token') ? '' : urlObj.search);
    } catch {
      // not a parseable URL — fall back to the raw string
    }
    return crypto.createHash('md5').update(keyInput).digest('hex');
  }

  /**
   * Invalidate a cached image
   * @param imageUrl - The URL of the image to invalidate
   */
  invalidateCache(imageUrl: string): void {
    if (!imageUrl) return;

    const cacheKey = this.generateCacheKey(imageUrl);
    this.cache.del(cacheKey);

    const fileCachePath = path.join(this.cacheDir, cacheKey);
    fs.unlink(fileCachePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        this.logger.error(`Error deleting cached image file: ${err.message}`);
      }
    });
  }
}
