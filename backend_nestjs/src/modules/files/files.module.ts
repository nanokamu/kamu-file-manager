import { Module } from '@nestjs/common';
import { STORAGE_ADAPTER } from '../../core/config/storage.config';
import { DatabaseStorageAdapter } from './adapters/database-storage.adapter';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { FilesController } from './controllers/files.controller';
import { FilesService } from './services/files.service';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    LocalStorageAdapter,
    DatabaseStorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useClass: LocalStorageAdapter,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
