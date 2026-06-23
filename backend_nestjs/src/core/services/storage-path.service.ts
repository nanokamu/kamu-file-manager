import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { resolve, sep } from 'path';
import { STORAGE_CONFIG, type StorageConfig } from '../config/storage.config';
import { assertValidUserIdForStoragePath } from '../../shared/utils/user-id.util';

/**
 * Maps API locators to absolute filesystem paths under local storage.
 *
 * All paths are scoped per user (`{localStoragePath}/{userId}/data` or `.../temp`)
 * and validated to prevent directory traversal.
 */
@Injectable()
export class StoragePathService {
  // eslint-disable-next-line prettier/prettier
  constructor(@Inject(STORAGE_CONFIG) private readonly config: StorageConfig) { }

  /**
   * Resolves a locator to an absolute path under the user's data directory.
   *
   * @param locator - Optional path relative to `{userId}/data` (e.g. `nestitems/foo.txt`).
   *   Omitted or empty returns the data root.
   * @returns Absolute path on disk.
   * @throws BadRequestException when the locator escapes the data root.
   */
  resolveStoragePath(locator?: string, userId: string = 'default'): string {
    return this.resolvePathUnderRoot(
      this.resolveUserDataStoragePath(userId),
      locator,
    );
  }

  /**
   * Resolves a relative path to an absolute path under the user's temp directory.
   *
   * @param relativePath - Optional path relative to `{userId}/temp`.
   *   Omitted or empty returns the temp root.
   * @returns Absolute path on disk.
   * @throws BadRequestException when the path escapes the temp root.
   */
  resolveTempStoragePath(
    relativePath?: string,
    userId: string = 'default',
  ): string {
    return this.resolvePathUnderRoot(
      resolve(this.resolveUserTempStoragePath(userId)),
      relativePath,
    );
  }

  /**
   * Converts an absolute data path back to a locator (forward slashes, no leading slash).
   *
   * @param absolutePath - Absolute path previously produced by {@link resolveStoragePath}.
   * @returns Locator relative to the user's data root.
   */
  toRelativePath(absolutePath: string, userId: string = 'default'): string {
    const rootDir = resolve(this.resolveUserDataStoragePath(userId));
    const relative = absolutePath.slice(rootDir.length).replace(/^[/\\]+/, '');
    return relative.replace(/\\/g, '/');
  }

  /** Per-user facade over path resolution methods. */
  forUser(userId: string) {
    assertValidUserIdForStoragePath(userId);
    return {
      resolveStoragePath: (locator?: string) =>
        this.resolveStoragePath(locator, userId),
      resolveTempStoragePath: (relativePath?: string) =>
        this.resolveTempStoragePath(relativePath, userId),
      toRelativePath: (absolutePath: string) =>
        this.toRelativePath(absolutePath, userId),
    };
  }

  /** Absolute path to `{localStoragePath}/{userId}/temp`. */
  private resolveUserTempStoragePath(userId: string = 'default'): string {
    assertValidUserIdForStoragePath(userId);
    return resolve(this.config.localStoragePath, userId, 'temp');
  }

  /** Absolute path to `{localStoragePath}/{userId}/data`. */
  private resolveUserDataStoragePath(userId: string = 'default'): string {
    assertValidUserIdForStoragePath(userId);
    return resolve(this.config.localStoragePath, userId, 'data');
  }

  /**
   * Joins `relativePath` to `rootDir` and rejects paths that escape the root.
   *
   * @throws BadRequestException when resolved path is outside `rootDir`.
   */
  private resolvePathUnderRoot(rootDir: string, relativePath?: string): string {
    const relative = (relativePath ?? '').replace(/^\/+/, '');
    const absolute = resolve(rootDir, relative);

    if (absolute !== rootDir && !absolute.startsWith(rootDir + sep)) {
      throw new BadRequestException('Invalid path');
    }

    return absolute;
  }
}
