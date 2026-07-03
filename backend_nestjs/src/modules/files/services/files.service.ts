/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { basename } from 'path';
import { Readable, type Readable as ReadableType } from 'stream';
import {
  STORAGE_ADAPTER,
  STORAGE_CONFIG,
  type StorageConfig,
} from '../../../core/config/storage.config';
import { computeBufferChecksum } from '../../../shared/utils/checksum.util';
import {
  joinLocator,
  resolveUniqueArchiveName,
} from '../../../shared/utils/locator-path.util';
import {
  createUploadSizeValidator,
  validateUploadSizeHeaders,
} from '../../../shared/utils/upload-size.util';
import { ZipBuilder, type ZipEntry } from '../../../shared/utils/zip.util';
import { DownloadZipDto } from '../dto/download-zip.dto';
import { UnifiedResource } from '../interfaces/resource.interface';
import type {
  Checksum,
  CopyOptions,
  DownloadResult,
  MoveOptions,
  StorageOperations,
  UnifiedStorageAdapter,
  UploadOptions,
} from '../interfaces/storage-adapter.interface';
import { UploadFileQueryDto } from '../dto/upload-file-query.dto';
// import { parseOptionalBoolean } from '../../../shared/utils/query-param.util';

export interface DownloadZipResult {
  stream: ReadableType;
  archiveName: string;
  checksum: Checksum;
  size: number;
}

export interface CompressLocatorsToZipFileResult {
  savedLocator: string;
  savedName: string;
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: UnifiedStorageAdapter,
    @Inject(STORAGE_CONFIG)
    private readonly storageConfig: StorageConfig,
  ) { }

  /** Legacy flat file list (all files recursively). */
  async listFiles(userId: string): Promise<string[]> {
    const storage = this.storageAdapter.forUser(userId);
    const files: string[] = [];
    await this.collectAllFilePaths(storage, undefined, files);
    return files.sort();
  }

  list(locator: string | undefined, userId: string): Promise<UnifiedResource[]> {
    const storage = this.storageAdapter.forUser(userId);
    return storage.list(locator);
  }

  async download(
    locator: string,
    userId: string,
  ): Promise<
    DownloadResult & {
      resource: UnifiedResource;
    }
  > {
    const storage = this.storageAdapter.forUser(userId);
    const [downloadResult, resource] = await Promise.all([
      storage.download(locator),
      storage.getMetadata(locator),
    ]);

    return {
      ...downloadResult,
      mimeType: downloadResult.mimeType ?? resource.mimeType,
      size: downloadResult.size ?? resource.size,
      resource,
    };
  }

  async upload(
    locator: string,
    fileName: string,
    req: Request,
    query: UploadFileQueryDto,
    userId: string,
  ): Promise<UnifiedResource> {
    const storage = this.storageAdapter.forUser(userId);
    const expectedBytes = Number(query.size);
    const limits = {
      maxBytes: this.storageConfig.maxUploadSizeBytes,
      expectedBytes,
    };

    validateUploadSizeHeaders(req.headers['content-length'], limits);

    const validatedStream = req.pipe(createUploadSizeValidator(limits));

    return storage.upload(
      locator,
      fileName,
      validatedStream,
      this.buildUploadOptions(query),
    );
  }

  delete(locator: string, userId: string): Promise<void> {
    const storage = this.storageAdapter.forUser(userId);
    return storage.delete(locator);
  }

  createFolder(
    parentLocator: string,
    folderName: string,
    userId: string,
  ): Promise<UnifiedResource> {
    const storage = this.storageAdapter.forUser(userId);
    return storage.createFolder(parentLocator, folderName);
  }

  copy(
    sourceLocator: string,
    destinationLocator: string,
    userId: string,
    options?: CopyOptions,
  ): Promise<UnifiedResource> {
    const storage = this.storageAdapter.forUser(userId);
    return storage.copy(sourceLocator, destinationLocator, options);
  }

  move(
    sourceLocator: string,
    destinationLocator: string,
    userId: string,
    options?: MoveOptions,
  ): Promise<UnifiedResource> {
    const storage = this.storageAdapter.forUser(userId);
    return storage.move(sourceLocator, destinationLocator, options);
  }

  getMetadata(locator: string, userId: string): Promise<UnifiedResource> {
    const storage = this.storageAdapter.forUser(userId);
    return storage.getMetadata(locator);
  }

  async downloadZipFromLocators(
    locators: string[],
    archiveName: string,
    userId: string,
  ): Promise<DownloadZipResult> {
    const { fileLocators, folderLocators, folderZipPaths } =
      await this.partitionLocatorsForZip(locators, userId);

    return this.downloadZip(
      {
        locators: fileLocators,
        folderLocators,
        ...(folderLocators.length > 0 && { folderZipPaths }),
        archiveName,
      },
      userId,
    );
  }

  async compressLocatorsToZipFile(
    parentLocator: string,
    locators: string[],
    archiveName: string,
    userId: string,
  ): Promise<CompressLocatorsToZipFileResult> {
    const storage = this.storageAdapter.forUser(userId);

    const zipResult = await this.downloadZipFromLocators(
      locators,
      archiveName,
      userId,
    );

    const zipBuffer = await readStreamToBuffer(zipResult.stream);

    const checkExists = async (fileName: string): Promise<boolean> => {
      const locator = joinLocator(parentLocator, fileName);
      try {
        await storage.getMetadata(locator);
        return true;
      } catch (error) {
        if (error instanceof NotFoundException) {
          return false;
        }
        throw error;
      }
    };

    const savedName = await resolveUniqueArchiveName(checkExists, archiveName);

    await storage.upload(parentLocator, savedName, Readable.from(zipBuffer), {
      mimeType: 'application/zip',
      size: zipBuffer.length,
      overwrite: false,
      checksum: zipResult.checksum,
    });

    return {
      savedLocator: joinLocator(parentLocator, savedName),
      savedName,
    };
  }

  /**
   * Build a zip archive containing the requested files and/or folders.
   *
   * Individual files are added by `dto.locators` (optional custom names via
   * `dto.zipPaths`). Folders are expanded recursively via `dto.folderLocators`
   * (optional archive prefix per folder via `dto.folderZipPaths`). At least
   * one of `locators` or `folderLocators` must be provided.
   *
   * Each file is downloaded through the storage adapter, buffered in memory,
   * and appended to the archive. Total uncompressed size is checked against
   * `maxZipDownloadSizeBytes` before any downloads begin. The returned stream
   * carries the finalized archive for HTTP response streaming.
   *
   * @param dto File and folder locators, optional zip entry names, and archive name.
   * @returns A readable zip stream and the archive filename.
   * @throws BadRequestException when path arrays are mismatched, a locator is the
   *   wrong resource type, file size is unavailable, or the size limit is exceeded.
   */
  async downloadZip(
    dto: DownloadZipDto,
    userId: string,
  ): Promise<DownloadZipResult> {
    const storage = this.storageAdapter.forUser(userId);
    const locators = dto.locators ?? [];
    const folderLocators = dto.folderLocators ?? [];

    if (dto.zipPaths && dto.zipPaths.length !== locators.length) {
      throw new BadRequestException(
        'zipPaths length must match locators length',
      );
    }

    if (
      dto.folderZipPaths &&
      dto.folderZipPaths.length !== folderLocators.length
    ) {
      throw new BadRequestException(
        'folderZipPaths length must match folderLocators length',
      );
    }

    const fileResults =
      locators.length > 0
        ? await Promise.all(
          locators.map(async (locator, index) => {
            const resource = await storage.getMetadata(locator);

            if (resource.type === 'directory') {
              throw new BadRequestException('Not a file');
            }

            if (resource.size === undefined) {
              throw new BadRequestException('File size unavailable');
            }

            return {
              entry: {
                locator,
                zipEntryName: dto.zipPaths
                  ? dto.zipPaths[index]
                  : basename(locator),
              },
              size: resource.size,
            };
          }),
        )
        : [];

    const fileEntries = fileResults.map((result) => result.entry);

    const folderResults = await Promise.all(
      folderLocators.map((folderLocator, index) =>
        this.collectFolderZipEntries(
          storage,
          folderLocator,
          dto.folderZipPaths?.[index],
        ),
      ),
    );

    const folderEntries = folderResults.flatMap((result) => result.entries);

    const totalBytes =
      fileResults.reduce((sum, result) => sum + result.size, 0) +
      folderResults.reduce((sum, result) => sum + result.totalBytes, 0);

    if (totalBytes > this.storageConfig.maxZipDownloadSizeBytes) {
      throw new BadRequestException(
        `Total download size exceeds maximum of ${this.storageConfig.maxZipDownloadSizeBytes} bytes`,
      );
    }

    const zipBuilder = new ZipBuilder();
    for (const fileEntry of [...fileEntries, ...folderEntries]) {
      const downloadResult = await storage.download(fileEntry.locator);
      const buffer = await readStreamToBuffer(downloadResult.stream);
      zipBuilder.addFile(buffer, fileEntry.zipEntryName);
    }
    zipBuilder.close();

    const zipBuffer = await readStreamToBuffer(zipBuilder.archive);
    const checksum = computeBufferChecksum(zipBuffer, 'sha256');

    return {
      stream: Readable.from(zipBuffer),
      archiveName: dto.archiveName ?? 'archive.zip',
      checksum,
      size: zipBuffer.length,
    };
  }

  /**
   * Build zip stream entries for every file under a folder.
   *
   * Recursively collects file locators and maps each to a zip-internal name
   * relative to `folderLocator`. When `zipPrefix` is set,
   * that prefix is prepended to each entry name inside the archive.
   *
   * @param folderLocator Storage-relative path to the folder to zip.
   * @param zipPrefix Optional path prefix for entry names inside the archive.
   * @returns Zip entries paired with the combined byte size of all files.
   * @throws BadRequestException when `folderLocator` is not a directory.
   */
  private async partitionLocatorsForZip(
    locators: string[],
    userId: string,
  ): Promise<{
    fileLocators: string[];
    folderLocators: string[];
    folderZipPaths: string[];
  }> {
    const storage = this.storageAdapter.forUser(userId);
    const fileLocators: string[] = [];
    const folderLocators: string[] = [];
    const folderZipPaths: string[] = [];

    for (const locator of locators) {
      const resource = await storage.getMetadata(locator);
      if (resource.type === 'directory') {
        folderLocators.push(locator);
        folderZipPaths.push(resource.name);
      } else {
        fileLocators.push(locator);
      }
    }

    return { fileLocators, folderLocators, folderZipPaths };
  }

  private async collectFolderZipEntries(
    storage: StorageOperations,
    folderLocator: string,
    zipPrefix?: string,
  ): Promise<{ entries: ZipEntry[]; totalBytes: number }> {
    const resource = await storage.getMetadata(folderLocator);

    if (resource.type !== 'directory') {
      throw new BadRequestException('Not a directory');
    }

    const filePaths: string[] = [];
    const totalBytes = await this.collectAllFilePaths(
      storage,
      folderLocator,
      filePaths,
      true,
    );

    const normalizedFolder = folderLocator
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const entries = filePaths.map((filePath) => {
      const relativePath = filePath.startsWith(`${normalizedFolder}/`)
        ? filePath.slice(normalizedFolder.length + 1)
        : filePath;

      const zipEntryName = zipPrefix
        ? `${zipPrefix.replace(/\\/g, '/').replace(/\/+$/, '')}/${relativePath}`
        : relativePath;

      return {
        locator: filePath,
        zipEntryName,
      };
    });

    return { entries, totalBytes };
  }

  private buildUploadOptions(query: UploadFileQueryDto): UploadOptions {
    return {
      mimeType: query.mimeType,
      size: Number(query.size),
      overwrite: query.overwrite ?? false,
      visibility: query.visibility,
      checksum: {
        algorithm: query.checksumAlgorithm,
        value: query.checksumValue,
      },
    };
  }

  /**
   * Recursively walk a folder tree and collect every file path beneath it.
   *
   * Paths are appended to the shared `files` array (including from nested
   * recursive calls) so callers receive one flat list without merging arrays
   * at each directory level.
   *
   * @param locator Storage-relative folder to list; `undefined` means the root.
   * @param files Accumulator mutated in place with each discovered file path.
   * @param accumulateSize When true, sum file sizes and return the total;
   *   throws if any file is missing a size.
   * @returns Total byte size of collected files when `accumulateSize` is true;
   *   otherwise 0.
   */
  private async collectAllFilePaths(
    storage: StorageOperations,
    locator: string | undefined,
    files: string[],
    accumulateSize = false,
  ): Promise<number> {
    let totalBytes = 0;
    const resources = await storage.list(locator);

    for (const resource of resources) {
      if (resource.type === 'file') {
        files.push(resource.path);

        if (accumulateSize) {
          if (resource.size === undefined) {
            throw new BadRequestException('File size unavailable');
          }

          totalBytes += resource.size;
        }
      } else {
        totalBytes += await this.collectAllFilePaths(
          storage,
          resource.path,
          files,
          accumulateSize,
        );
      }
    }

    return totalBytes;
  }
}

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as string | Uint8Array),
    );
  }
  return Buffer.concat(chunks);
}
