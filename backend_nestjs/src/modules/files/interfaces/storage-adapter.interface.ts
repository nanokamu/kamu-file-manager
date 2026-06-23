import { Readable } from 'stream';
import { UnifiedResource } from './resource.interface';

export interface Checksum {
  algorithm: 'md5' | 'sha256' | 'crc32c';
  value: string;
}

export interface UploadOptions {
  mimeType?: string;
  size: number;
  overwrite: boolean;
  visibility?: 'public' | 'private';
  checksum: Checksum;
}

export interface DownloadResult {
  stream: Readable;
  mimeType?: string;
  size?: number;
  checksum?: Checksum;
}

export interface CopyOptions {
  /** If true, replaces the destination file if it exists. */
  overwrite?: boolean;
  /** If true, copies folders and all nested contents.
   * If false and the source is a folder, rejects the operation.
   * @default false
   */
  recursive?: boolean;
}

export interface MoveOptions {
  /** * If true, replaces the destination file if it exists.
   * @default false
   */
  overwrite?: boolean;
  /** * If true, moves folders and all nested contents.
   * If false and the source is a folder, rejects the operation.
   * @default false
   */
  recursive?: boolean;
}

export interface StorageOperations {
  /**
   * Download a file as a stream, accompanied by critical metadata
   * and a checksum for integrity verification.
   */
  download(locator: string): Promise<DownloadResult>;

  /**
   * Upload a file from a stream.
   * Options allow passing a pre-calculated checksum to guarantee zero-corruption.
   */
  upload(
    locator: string,
    fileName: string,
    fileStream: Readable,
    options?: UploadOptions,
  ): Promise<UnifiedResource>;

  /** Delete a file or folder. */
  delete(locator: string): Promise<void>;

  /**
   * List files and folders at the given location.
   * @param locator Empty or omitted means the root folder
   */
  list(locator?: string): Promise<UnifiedResource[]>;

  /** Create a new folder. */
  createFolder(
    parentLocator: string,
    folderName: string,
  ): Promise<UnifiedResource>;

  /** Get metadata for a single file or folder. */
  getMetadata(locator: string): Promise<UnifiedResource>;

  /**
   * Copy a file from one location to another.
   * Returns the metadata of the new file.
   */
  copy(
    sourceLocator: string,
    destinationLocator: string,
    options?: CopyOptions,
  ): Promise<UnifiedResource>;

  /**
   * Move or rename a file from one location to another.
   * Returns the metadata of the file at its new location.
   */
  move(
    sourceLocator: string,
    destinationLocator: string,
    options?: MoveOptions,
  ): Promise<UnifiedResource>;
}

export interface UnifiedStorageAdapter {
  forUser(userId: string): StorageOperations;
}
