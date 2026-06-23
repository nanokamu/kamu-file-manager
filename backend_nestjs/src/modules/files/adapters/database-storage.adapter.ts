import { Injectable, NotImplementedException } from '@nestjs/common';
import { Readable } from 'stream';
import { UnifiedResource } from '../interfaces/resource.interface';
import {
  CopyOptions,
  DownloadResult,
  MoveOptions,
  StorageOperations,
  UnifiedStorageAdapter,
  UploadOptions,
} from '../interfaces/storage-adapter.interface';

class UserScopedDatabaseStorageAdapter implements StorageOperations {
  copy(
    sourceLocator: string,
    destinationLocator: string,
    options?: CopyOptions,
  ): Promise<UnifiedResource> {
    void sourceLocator;
    void destinationLocator;
    void options;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.copy not implemented.',
    );
  }

  move(
    sourceLocator: string,
    destinationLocator: string,
    options?: MoveOptions,
  ): Promise<UnifiedResource> {
    void sourceLocator;
    void destinationLocator;
    void options;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.move not implemented.',
    );
  }

  download(locator: string): Promise<DownloadResult> {
    void locator;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.download not implemented.',
    );
  }

  upload(
    locator: string,
    fileName: string,
    fileStream: Readable,
    options?: UploadOptions,
  ): Promise<UnifiedResource> {
    void locator;
    void fileName;
    void fileStream;
    void options;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.upload not implemented.',
    );
  }

  delete(locator: string): Promise<void> {
    void locator;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.delete not implemented.',
    );
  }

  list(locator?: string): Promise<UnifiedResource[]> {
    void locator;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.list not implemented.',
    );
  }

  createFolder(
    parentLocator: string,
    folderName: string,
  ): Promise<UnifiedResource> {
    void parentLocator;
    void folderName;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.createFolder not implemented.',
    );
  }

  getMetadata(locator: string): Promise<UnifiedResource> {
    void locator;
    throw new NotImplementedException(
      'DatabaseStorageAdapter.getMetadata not implemented.',
    );
  }
}

@Injectable()
export class DatabaseStorageAdapter implements UnifiedStorageAdapter {
  forUser(userId: string): StorageOperations {
    void userId;
    return new UserScopedDatabaseStorageAdapter();
  }
}
