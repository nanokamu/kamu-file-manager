import { mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from 'fs';
import { join, resolve, sep, basename } from 'path';
import {
  MAX_ZIP_DOWNLOAD_SIZE_BYTES,
  STORAGE_CONFIG,
  type StorageConfig,
} from '../../src/core/config/storage.config';
import { StoragePathService } from '../../src/core/services/storage-path.service';

export const TEST_STORAGE_ROOT = join(__dirname, '../../../file_items_test');

export function createTestStorageConfig(
  rootDir: string,
  overrides?: Partial<StorageConfig>,
): StorageConfig {
  return {
    localStoragePath: rootDir,
    maxUploadSizeBytes: 100 * 1024 * 1024,
    maxZipDownloadSizeBytes: MAX_ZIP_DOWNLOAD_SIZE_BYTES,
    ...overrides,
  };
}

/**
 * Describes a mock file for storage tests: a relative path under the storage
 * data root and its text content with pluggable encoding.
 *
 * Use {@link buildMockFile} for a default set of templates, or construct
 * instances directly when seeding fixtures or asserting on file bytes.
 *
 * @example
 * const file = new FileTemplate('docs/readme.txt', 'hello');
 * writeFileSync(join(dataDir, file.path), file.content);
 * expect(file.equalsBytes(readFileSync(...))).toBe(true);
 */
export class FileTemplate {
  private _path: string;
  private _content: string;
  private _encoding: BufferEncoding;

  /**
   * @param path - Relative path from the storage data directory (e.g. `nestitems/foo.txt`).
   * @param content - File body as a string (default UTF-8, no BOM when written via {@link toBytes}).
   * @param encoding - (Optional) The encoding for the content. Defaults to 'utf8'.
   */
  constructor(
    path: string,
    content: string,
    encoding: BufferEncoding = 'utf8',
  ) {
    this._path = path;
    this._content = content;
    this._encoding = encoding;
  }

  /** Relative path within the storage data directory. */
  get path(): string {
    return this._path;
  }

  set path(value: string) {
    this._path = value;
  }

  get basename(): string {
    return basename(this.path);
  }

  /** Text content of the mock file. */
  get content(): string {
    return this._content;
  }

  set content(value: string) {
    this._content = value;
  }

  /** Encoding for the file contents. */
  get encoding(): BufferEncoding {
    return this._encoding;
  }

  set encoding(value: BufferEncoding) {
    this._encoding = value;
  }

  /**
   * Returns content as a Buffer encoded with the specified encoding (default: UTF-8, no BOM).
   */
  toBytes(): Buffer {
    // Node's Buffer.from(string, encoding) will not add a BOM
    return Buffer.from(this._content, this._encoding);
  }

  /**
   * Returns true when this template and `other` have byte-identical content.
   */
  equals(other: FileTemplate): boolean {
    if (!(other instanceof FileTemplate)) {
      return false;
    }
    return this.toBytes().equals(other.toBytes());
  }

  /**
   * Returns true when this template's content matches `bytes` byte-for-byte.
   *
   * @param bytes - A Buffer or string to compare against. If string, uses this template's encoding.
   */
  equalsBytes(bytes: Buffer | string): boolean {
    const thisBytes = this.toBytes();
    if (typeof bytes === 'string') {
      return thisBytes.equals(Buffer.from(bytes, this._encoding));
    }
    return thisBytes.equals(bytes);
  }
}

/**
 * Path-keyed map of mock files relative to the storage data root.
 */
export type MockFileMap = Record<string, FileTemplate>;

/**
 * Builds the default set of mock file templates used in storage adapter tests.
 *
 * Paths are relative to `default/data` under the test storage root. Nested
 * entries (e.g. `nestitems/...`) mirror the layout produced by
 * {@link seedDefaultStorageFixture}.
 *
 * @returns Map of relative path → {@link FileTemplate}; lookup by path, e.g.
 *   `buildMockFile()['mockfile_text_01.txt']`.
 */
export function buildMockFile(encoding: BufferEncoding = 'utf8'): MockFileMap {
  return {
    'mockfile_text_01.txt': new FileTemplate(
      'mockfile_text_01.txt',
      'hello mockfile 01',
      encoding,
    ),
    'mockfile_text_02.txt': new FileTemplate(
      'mockfile_text_02.txt',
      'hello mockfile 02',
      encoding,
    ),
    'mockfile_text_03.txt': new FileTemplate(
      'mockfile_text_03.txt',
      'hello mockfile 03',
      encoding,
    ),
    'nestitems/mockfile_textnest_01.txt': new FileTemplate(
      'nestitems/mockfile_textnest_01.txt',
      'hello mockfile nest 01',
      encoding,
    ),
    'nestitems/mockfile_textnest_02.txt': new FileTemplate(
      'nestitems/mockfile_textnest_02.txt',
      'hello mockfile nest 02',
      encoding,
    ),
    'nestitems_add/mockfile_textnest_01.txt': new FileTemplate(
      'nestitems_add/mockfile_textnest_01.txt',
      'hello mockfile nest add 01',
      encoding,
    ),
    'nestitems_add/mockfile_textnest_02.txt': new FileTemplate(
      'nestitems_add/mockfile_textnest_02.txt',
      'hello mockfile nest add 02',
      encoding,
    ),
    'nestitems_add/nestnest/mockfile_textnestnest_01.txt': new FileTemplate(
      'nestitems_add/nestnest/mockfile_textnestnest_01.txt',
      'hello mockfile nestnest add 01',
      encoding,
    ),
  };
}

// Legacy function for backward compatibility
export function seedDefaultStorageFixture(rootDir: string): void {
  const dataDir = join(rootDir, 'default', 'data');
  const nestitemsDir = join(dataDir, 'nestitems');

  mkdirSync(nestitemsDir, { recursive: true });
  mkdirSync(join(nestitemsDir, 'video'), { recursive: true });

  writeFileSync(join(dataDir, 'text1.txt'), 'hello');
  writeFileSync(join(dataDir, 'text2.txt'), 'hello');
  writeFileSync(join(dataDir, 'text3.txt'), 'hello');
  writeFileSync(join(nestitemsDir, 'textnest1.txt'), 'hello');
  writeFileSync(join(nestitemsDir, 'textnest2.txt'), 'hello');
}

export function isDefaultStorageFixtureEmpty(rootDataDir: string): boolean {
  const resolvedRoot = resolve(rootDataDir);
  const resolvedTestRoot = resolve(TEST_STORAGE_ROOT);
  if (
    resolvedRoot !== resolvedTestRoot &&
    !resolvedRoot.startsWith(resolvedTestRoot + sep)
  ) {
    throw new Error(
      `Unsafe clear attempt: rootDataDir (${resolvedRoot}) is not under TEST_STORAGE_ROOT (${resolvedTestRoot}).`,
    );
  }
  const entries: string[] = readdirSync(resolvedRoot);
  return entries.length === 0;
}

/**
 * Seeds a storage fixture under the specified data root directory.
 *
 * This function creates the default set of mock files in a structure compatible with
 * adapter and service tests. The files are written under the given data directory, e.g.,
 * `{absolute path}/{userId}/data`.
 *
 * Directory structure example:
 *   {rootDataDir}/
 *     mockfile_text_01.txt
 *     mockfile_text_02.txt
 *     mockfile_text_03.txt
 *     nestitems/
 *       mockfile_textnest_01.txt
 *       mockfile_textnest_02.txt
 *
 * @param rootDataDir - Absolute path to the `{userId}/data` directory
 */
export function seedDefaultStorageFixtureNew(rootDataDir: string): void {
  const resolvedRoot = resolve(rootDataDir);
  const resolvedTestRoot = resolve(TEST_STORAGE_ROOT);
  if (
    resolvedRoot !== resolvedTestRoot &&
    !resolvedRoot.startsWith(resolvedTestRoot + sep)
  ) {
    throw new Error(
      `Unsafe clear attempt: rootDataDir (${resolvedRoot}) is not under TEST_STORAGE_ROOT (${resolvedTestRoot}).`,
    );
  }

  const fileTemplates = buildMockFile();
  const nestitemsDir = join(resolvedRoot, 'nestitems');
  const nestitemsAddDir = join(resolvedRoot, 'nestitems_add');
  const nestnestitemsDir = join(nestitemsAddDir, 'nestnest');
  mkdirSync(resolvedRoot, { recursive: true });
  mkdirSync(nestitemsDir, { recursive: true });
  mkdirSync(nestitemsAddDir, { recursive: true });
  mkdirSync(nestnestitemsDir, { recursive: true });
  for (const fileTemplate of Object.values(fileTemplates)) {
    writeFileSync(
      join(resolvedRoot, fileTemplate.path),
      fileTemplate.toBytes(),
    );
  }
}

// Clean Test Directory
export function clearDefaultStorageFixture(rootDataDir: string): void {
  const resolvedRoot = resolve(rootDataDir);
  const resolvedTestRoot = resolve(TEST_STORAGE_ROOT);
  if (
    resolvedRoot !== resolvedTestRoot &&
    !resolvedRoot.startsWith(resolvedTestRoot + sep)
  ) {
    throw new Error(
      `Unsafe clear attempt: rootDataDir (${resolvedRoot}) is not under TEST_STORAGE_ROOT (${resolvedTestRoot}).`,
    );
  }

  // Recursively delete all contents of the directory, but not the dir itself.
  const entries = readdirSync(resolvedRoot);
  for (const entry of entries) {
    const entryPath = join(resolvedRoot, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      rmSync(entryPath, { recursive: true, force: true });
    } else {
      rmSync(entryPath, { force: true });
    }
  }
}

export function storageTestProviders(config: StorageConfig) {
  return [{ provide: STORAGE_CONFIG, useValue: config }, StoragePathService];
}
