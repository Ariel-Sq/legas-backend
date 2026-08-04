import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { ImageController } from './image.controller';
import { StorageServiceSupabase } from './storage.service.supabase';
import { StorageServiceLocal } from './storage.service.local';
import { StorageServiceBlob } from './storage.service.blob';
import { STORAGE_TYPE } from '@app/utils/environments';
import { CacheModule } from '@app/cache/cache.module';
import { UsersModule } from '@app/users/users.module';

@Module({
  imports: [CacheModule, UsersModule],
  providers: [
    {
      provide: 'StorageService',
      useFactory: () => {
        if (STORAGE_TYPE === 'SUPABASE') {
          return new StorageServiceSupabase();
        } else if (STORAGE_TYPE === 'LOCAL') {
          return new StorageServiceLocal();
        } else if (STORAGE_TYPE === 'VERCEL_BLOB') {
          return new StorageServiceBlob();
        } else {
          throw new Error(`Unsupported STORAGE_TYPE: ${STORAGE_TYPE}`);
        }
      },
    },
  ],
  controllers: [StorageController, ImageController],
  exports: ['StorageService'],
})
export class StorageModule {}
