import { Global, Module } from '@nestjs/common';
import { createStorageConfig, STORAGE_CONFIG } from './config/storage.config';
import { HealthController } from './controllers/health.controller';
import { StoragePathService } from './services/storage-path.service';

@Global()
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [
    { provide: STORAGE_CONFIG, useFactory: () => createStorageConfig() },
    StoragePathService,
  ],
  exports: [STORAGE_CONFIG, StoragePathService],
})
export class CoreModule {}
