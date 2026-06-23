import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import {
  access,
  copyFile,
  cp,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
} from 'fs/promises';
import { basename, dirname, join, sep } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { StoragePathService } from '../../../core/services/storage-path.service';
import {
  computeFileChecksum,
  createChecksumVerifier,
} from '../../../shared/utils/checksum.util';
import { UnifiedResource } from '../interfaces/resource.interface';
import {
  CopyOptions,
  DownloadResult,
  MoveOptions,
  StorageOperations,
  UnifiedStorageAdapter,
  UploadOptions,
} from '../interfaces/storage-adapter.interface';

function toUpdatedAt(mtime: Date): string {
  return mtime.toISOString();
}

type UserPaths = ReturnType<StoragePathService['forUser']>;

class UserScopedLocalStorageAdapter implements StorageOperations {
  constructor(private readonly userPaths: UserPaths) {}

  async copy(
    sourceLocator: string,
    destinationLocator: string,
    options?: CopyOptions,
  ): Promise<UnifiedResource> {
    const sourcePath = this.userPaths.resolveStoragePath(sourceLocator);
    const sourceStats = await this.getPathStats(sourcePath, sourceLocator);
    const destPath = this.userPaths.resolveStoragePath(destinationLocator);
    const overwrite = options?.overwrite ?? false;
    const destName = basename(destinationLocator) || basename(destPath);

    if (sourcePath === destPath) {
      throw new BadRequestException('Source and destination are the same');
    }

    if (sourceStats.isDirectory() && destPath.startsWith(sourcePath + sep)) {
      throw new BadRequestException(
        'Cannot copy a folder into itself or a descendant',
      );
    }

    const destParentPath = dirname(destPath);
    const destParentStats = await this.getPathStats(
      destParentPath,
      this.userPaths.toRelativePath(destParentPath) || undefined,
    );

    if (!destParentStats.isDirectory()) {
      throw new BadRequestException('Destination parent is not a directory');
    }

    if (sourceStats.isFile()) {
      await this.ensureCanWrite(destPath, overwrite);
      await copyFile(sourcePath, destPath);

      const stats = await stat(destPath);

      return {
        path: this.userPaths.toRelativePath(destPath),
        name: destName,
        type: 'file',
        size: stats.size,
        updatedAt: toUpdatedAt(stats.mtime),
      };
    }

    if (sourceStats.isDirectory()) {
      if (!options?.recursive) {
        throw new BadRequestException('Recursive copy is required for folders');
      }

      await this.ensureCanWrite(destPath, overwrite);
      await cp(sourcePath, destPath, { recursive: true, force: overwrite });

      const stats = await stat(destPath);

      return {
        path: this.userPaths.toRelativePath(destPath),
        name: destName,
        type: 'directory',
        updatedAt: toUpdatedAt(stats.mtime),
      };
    }

    throw new BadRequestException('Not a file');
  }

  async move(
    sourceLocator: string,
    destinationLocator: string,
    options?: MoveOptions,
  ): Promise<UnifiedResource> {
    const sourcePath = this.userPaths.resolveStoragePath(sourceLocator);
    const sourceStats = await this.getPathStats(sourcePath, sourceLocator);
    const destPath = this.userPaths.resolveStoragePath(destinationLocator);
    const overwrite = options?.overwrite ?? false;
    const destName = basename(destinationLocator) || basename(destPath);

    if (sourcePath === destPath) {
      throw new BadRequestException('Source and destination are the same');
    }

    if (sourceStats.isDirectory() && destPath.startsWith(sourcePath + sep)) {
      throw new BadRequestException(
        'Cannot copy a folder into itself or a descendant',
      );
    }

    const destParentPath = dirname(destPath);
    const destParentStats = await this.getPathStats(
      destParentPath,
      this.userPaths.toRelativePath(destParentPath) || undefined,
    );

    if (!destParentStats.isDirectory()) {
      throw new BadRequestException('Destination parent is not a directory');
    }

    if (sourceStats.isFile()) {
      await this.ensureCanWrite(destPath, overwrite);
      if (overwrite) {
        try {
          await access(destPath);
          await rm(destPath, { force: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }
      await rename(sourcePath, destPath);

      const stats = await stat(destPath);

      return {
        path: this.userPaths.toRelativePath(destPath),
        name: destName,
        type: 'file',
        size: stats.size,
        updatedAt: toUpdatedAt(stats.mtime),
      };
    }

    if (sourceStats.isDirectory()) {
      if (!options?.recursive) {
        throw new BadRequestException('Recursive move is required for folders');
      }

      await this.ensureCanWrite(destPath, overwrite);
      if (overwrite) {
        try {
          await access(destPath);
          await rm(destPath, { recursive: true, force: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }
      await rename(sourcePath, destPath);

      const stats = await stat(destPath);

      return {
        path: this.userPaths.toRelativePath(destPath),
        name: destName,
        type: 'directory',
        updatedAt: toUpdatedAt(stats.mtime),
      };
    }

    throw new BadRequestException('Not a file');
  }

  async download(locator: string): Promise<DownloadResult> {
    const targetPath = this.userPaths.resolveStoragePath(locator);
    const stats = await this.getPathStats(targetPath, locator);

    if (!stats.isFile()) {
      throw new BadRequestException('Not a file');
    }

    const checksum = await computeFileChecksum(targetPath, 'sha256');

    return {
      stream: createReadStream(targetPath),
      size: stats.size,
      checksum,
    };
  }

  async upload(
    locator: string,
    fileName: string,
    fileStream: Readable,
    options: UploadOptions,
  ): Promise<UnifiedResource> {
    const parentDir = this.userPaths.resolveStoragePath(locator);
    const parentStats = await this.getPathStats(
      parentDir,
      locator || undefined,
    );

    if (!parentStats.isDirectory()) {
      throw new BadRequestException('Upload destination is not a directory');
    }

    const filePath = join(parentDir, fileName);
    await this.ensureCanWrite(filePath, options.overwrite);

    const tempDir = this.userPaths.resolveTempStoragePath(randomUUID());
    await this.ensureCanWrite(tempDir, false);

    const tempFilePath = join(tempDir, fileName);
    await mkdir(tempDir, { recursive: true });

    try {
      await pipeline(
        fileStream,
        createChecksumVerifier(options.checksum),
        createWriteStream(tempFilePath),
      );

      await rename(tempFilePath, filePath);
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      throw error;
    }

    await rm(tempDir, { recursive: true, force: true });

    const stats = await stat(filePath);

    return {
      path: this.userPaths.toRelativePath(filePath),
      name: fileName,
      type: 'file',
      mimeType: options?.mimeType,
      size: stats.size,
      updatedAt: toUpdatedAt(stats.mtime),
    };
  }

  async delete(locator: string): Promise<void> {
    const targetPath = this.userPaths.resolveStoragePath(locator);
    await this.getPathStats(targetPath, locator);
    await rm(targetPath, { recursive: true, force: true });
  }

  async list(locator?: string): Promise<UnifiedResource[]> {
    const dirPath = this.userPaths.resolveStoragePath(locator);
    const dirStats = await this.getPathStats(dirPath, locator);

    if (!dirStats.isDirectory()) {
      throw new BadRequestException('Not a directory');
    }

    const parentPath = locator?.replace(/^\/+/, '') ?? '';
    const entries = await readdir(dirPath, { withFileTypes: true });

    return Promise.all(
      entries.map(async (entry) => {
        const entryPath = parentPath
          ? join(parentPath, entry.name).replace(/\\/g, '/')
          : entry.name;
        const entryStats = await stat(join(dirPath, entry.name));
        const resource: UnifiedResource = {
          path: entryPath,
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          updatedAt: toUpdatedAt(entryStats.mtime),
        };

        if (entry.isFile()) {
          resource.size = entryStats.size;
        }

        return resource;
      }),
    );
  }

  async createFolder(
    parentLocator: string,
    folderName: string,
  ): Promise<UnifiedResource> {
    const parentDir = this.userPaths.resolveStoragePath(parentLocator);
    const parentStats = await this.getPathStats(
      parentDir,
      parentLocator || undefined,
    );

    if (!parentStats.isDirectory()) {
      throw new BadRequestException('Parent is not a directory');
    }

    const folderPath = join(parentDir, folderName);
    await this.ensureCanCreateFolder(folderPath);

    try {
      await mkdir(folderPath, { recursive: false });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new ConflictException('Folder already exists');
      }

      throw error;
    }

    const stats = await stat(folderPath);

    return {
      path: this.userPaths.toRelativePath(folderPath),
      name: folderName,
      type: 'directory',
      updatedAt: toUpdatedAt(stats.mtime),
    };
  }

  async getMetadata(locator: string): Promise<UnifiedResource> {
    const targetPath = this.userPaths.resolveStoragePath(locator);
    const stats = await this.getPathStats(targetPath, locator);

    return {
      path: locator.replace(/^\/+/, ''),
      name: basename(locator) || basename(targetPath),
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.isFile() ? stats.size : undefined,
      updatedAt: toUpdatedAt(stats.mtime),
    };
  }

  private async ensureCanCreateFolder(folderPath: string): Promise<void> {
    try {
      await access(folderPath);
      throw new ConflictException('Folder already exists');
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }

      throw error;
    }
  }

  private async ensureCanWrite(
    filePath: string,
    overwrite = false,
  ): Promise<void> {
    try {
      await access(filePath);
      if (!overwrite) {
        throw new ConflictException('File already exists');
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
    }
  }

  private async getPathStats(absolutePath: string, locator?: string) {
    try {
      return await stat(absolutePath);
    } catch {
      throw new NotFoundException(
        locator ? `Resource not found: ${locator}` : 'Resource not found',
      );
    }
  }
}

@Injectable()
export class LocalStorageAdapter implements UnifiedStorageAdapter {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly storagePaths: StoragePathService) { }

  forUser(userId: string): StorageOperations {
    return new UserScopedLocalStorageAdapter(this.storagePaths.forUser(userId));
  }
}
