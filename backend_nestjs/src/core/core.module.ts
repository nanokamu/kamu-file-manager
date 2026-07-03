import { Global, Module } from '@nestjs/common';
import { AUTH_CONFIG, createAuthConfig } from './config/auth.config';
import { createStorageConfig, STORAGE_CONFIG } from './config/storage.config';
import { HealthController } from './controllers/health.controller';
import { StoragePathService } from './services/storage-path.service';

@Global()
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [
    { provide: STORAGE_CONFIG, useFactory: () => createStorageConfig() },
    { provide: AUTH_CONFIG, useFactory: () => createAuthConfig() },
    StoragePathService,
  ],
  exports: [STORAGE_CONFIG, AUTH_CONFIG, StoragePathService],
})
export class CoreModule {}
