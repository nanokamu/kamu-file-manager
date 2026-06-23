import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { LocalStorageAdapter } from './local-storage.adapter';
import {
  buildMockFile,
  clearDefaultStorageFixture,
  createTestStorageConfig,
  FileTemplate,
  seedDefaultStorageFixtureNew,
  storageTestProviders,
  TEST_STORAGE_ROOT,
} from '../../../../test/helpers/storage.fixture';
import { StoragePathService } from '../../../core/services/storage-path.service';
import {
  DownloadResult,
  StorageOperations,
} from '../interfaces/storage-adapter.interface';
import { UnifiedResource } from '../interfaces/resource.interface';

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

async function expectDownloadEquals(
  adapter: StorageOperations,
  locator: string,
  template: FileTemplate,
): Promise<void> {
  const result = await adapter.download(locator);
  const content = await readStreamToBuffer(result.stream);
  const expectedContent = template.toBytes();
  expect(content.equals(expectedContent)).toBe(true);
  expect(result.size).toBe(expectedContent.length);
  const expectedChecksum = createHash('sha256')
    .update(expectedContent)
    .digest('hex');
  expect(result.checksum?.algorithm).toBe('sha256');
  expect(result.checksum?.value).toBe(expectedChecksum);
}

function expectListEntries(
  result: UnifiedResource[],
  expectedValues: Partial<UnifiedResource>[],
): void {
  expect(result).toHaveLength(expectedValues.length);
  for (const expected of expectedValues) {
    const match = result.find((entry) => entry.path === expected.path);
    expect(match).toMatchObject(expected);
    expect(match?.updatedAt).toEqual(expect.any(String));
    if (expected.type === 'file') {
      expect(match?.size).toEqual(expect.any(Number));
    }
  }
}

function expectPathsAbsent(result: UnifiedResource[], paths: string[]): void {
  const resultPaths = result.map((entry) => entry.path);
  for (const path of paths) {
    expect(resultPaths).not.toContain(path);
  }
}

describe('LocalStorageAdapter', () => {
  let storagePathService: StoragePathService;
  let localStorageAdapter: LocalStorageAdapter;
  let adapter: StorageOperations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LocalStorageAdapter,
          useClass: LocalStorageAdapter,
        },
        ...storageTestProviders(createTestStorageConfig(TEST_STORAGE_ROOT)),
      ],
    }).compile();

    localStorageAdapter = module.get<LocalStorageAdapter>(LocalStorageAdapter);
    adapter = localStorageAdapter.forUser('default');
    storagePathService = module.get<StoragePathService>(StoragePathService);

    const rootDataDir = storagePathService.resolveStoragePath();
    if (existsSync(rootDataDir)) {
      clearDefaultStorageFixture(rootDataDir);
    }
    seedDefaultStorageFixtureNew(rootDataDir);
  });

  afterEach(() => {
    clearDefaultStorageFixture(storagePathService.resolveStoragePath());
  });

  describe('list', () => {
    it('should return array of files and folders', async () => {
      const expectedValues: Partial<UnifiedResource>[] = [
        {
          path: 'mockfile_text_01.txt',
          name: 'mockfile_text_01.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_03.txt',
          name: 'mockfile_text_03.txt',
          type: 'file',
        },
        {
          path: 'nestitems',
          name: 'nestitems',
          type: 'directory',
        },
        {
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        },
      ];
      const result = await adapter.list('');
      expectListEntries(result, expectedValues);
    });

    it('should return array of nest files and folders', async () => {
      const expectedValues: Partial<UnifiedResource>[] = [
        {
          path: 'nestitems/mockfile_textnest_01.txt',
          name: 'mockfile_textnest_01.txt',
          type: 'file',
        },
        {
          path: 'nestitems/mockfile_textnest_02.txt',
          name: 'mockfile_textnest_02.txt',
          type: 'file',
        },
      ];
      const result = await adapter.list('nestitems');
      expectListEntries(result, expectedValues);
    });

    it('should reject list when the locator is not a directory', async () => {
      await expect(adapter.list('mockfile_text_01.txt')).rejects.toThrow(
        BadRequestException,
      );
      await expect(adapter.list('mockfile_text_01.txt')).rejects.toThrow(
        'Not a directory',
      );
    });

    it('should reject list when the locator does not exist', async () => {
      await expect(adapter.list('not_a_directory')).rejects.toThrow(
        NotFoundException,
      );
      await expect(adapter.list('not_a_directory')).rejects.toThrow(
        'Resource not found: not_a_directory',
      );
    });
  });

  describe('copy', () => {
    it('should copy a file and return metadata with byte-identical content', async () => {
      const fileTemplates = buildMockFile();
      const copied = await adapter.copy(
        'mockfile_text_01.txt',
        'mockfile_text_04.txt',
      );

      expect(copied).toMatchObject({
        path: 'mockfile_text_04.txt',
        name: 'mockfile_text_04.txt',
        type: 'file',
      });
      expect(copied.size).toEqual(expect.any(Number));
      expect(copied.updatedAt).toEqual(expect.any(String));

      await expectDownloadEquals(
        adapter,
        'mockfile_text_04.txt',
        fileTemplates['mockfile_text_01.txt'],
      );
      await expectDownloadEquals(
        adapter,
        'mockfile_text_01.txt',
        fileTemplates['mockfile_text_01.txt'],
      );

      const result = await adapter.list('');
      expectListEntries(result, [
        {
          path: 'mockfile_text_01.txt',
          name: 'mockfile_text_01.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_03.txt',
          name: 'mockfile_text_03.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_04.txt',
          name: 'mockfile_text_04.txt',
          type: 'file',
        },
        {
          path: 'nestitems',
          name: 'nestitems',
          type: 'directory',
        },
        {
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        },
      ]);
    });

    it('should copy a folder recursively and return metadata', async () => {
      const copied = await adapter.copy('nestitems', 'nestitems2', {
        recursive: true,
      });

      expect(copied).toMatchObject({
        path: 'nestitems2',
        name: 'nestitems2',
        type: 'directory',
      });
      expect(copied.updatedAt).toEqual(expect.any(String));

      const fileTemplates = buildMockFile();
      await expectDownloadEquals(
        adapter,
        'nestitems2/mockfile_textnest_01.txt',
        fileTemplates['nestitems/mockfile_textnest_01.txt'],
      );
      await expectDownloadEquals(
        adapter,
        'nestitems/mockfile_textnest_01.txt',
        fileTemplates['nestitems/mockfile_textnest_01.txt'],
      );

      const result = await adapter.list('');
      expectListEntries(result, [
        {
          path: 'mockfile_text_01.txt',
          name: 'mockfile_text_01.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_03.txt',
          name: 'mockfile_text_03.txt',
          type: 'file',
        },
        {
          path: 'nestitems',
          name: 'nestitems',
          type: 'directory',
        },
        {
          path: 'nestitems2',
          name: 'nestitems2',
          type: 'directory',
        },
        {
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        },
      ]);

      const copiedNestItems = await adapter.list('nestitems2');
      expectListEntries(copiedNestItems, [
        {
          path: 'nestitems2/mockfile_textnest_01.txt',
          name: 'mockfile_textnest_01.txt',
          type: 'file',
        },
        {
          path: 'nestitems2/mockfile_textnest_02.txt',
          name: 'mockfile_textnest_02.txt',
          type: 'file',
        },
      ]);
    });

    it('should copy a file into a folder and return metadata', async () => {
      const fileTemplates = buildMockFile();
      const copied = await adapter.copy(
        'mockfile_text_01.txt',
        'nestitems/mockfile_textnest_03.txt',
      );

      expect(copied).toMatchObject({
        path: 'nestitems/mockfile_textnest_03.txt',
        name: 'mockfile_textnest_03.txt',
        type: 'file',
      });
      expect(copied.size).toEqual(expect.any(Number));
      expect(copied.updatedAt).toEqual(expect.any(String));

      await expectDownloadEquals(
        adapter,
        'nestitems/mockfile_textnest_03.txt',
        fileTemplates['mockfile_text_01.txt'],
      );
      await expectDownloadEquals(
        adapter,
        'mockfile_text_01.txt',
        fileTemplates['mockfile_text_01.txt'],
      );

      const result = await adapter.list('nestitems');
      expectListEntries(result, [
        {
          path: 'nestitems/mockfile_textnest_01.txt',
          name: 'mockfile_textnest_01.txt',
          type: 'file',
        },
        {
          path: 'nestitems/mockfile_textnest_02.txt',
          name: 'mockfile_textnest_02.txt',
          type: 'file',
        },
        {
          path: 'nestitems/mockfile_textnest_03.txt',
          name: 'mockfile_textnest_03.txt',
          type: 'file',
        },
      ]);
    });

    describe('errors', () => {
      it('should reject copy when source is not found', async () => {
        await expect(
          adapter.copy('mockfile_text_99.txt', 'mockfile_text_04.txt'),
        ).rejects.toThrow(NotFoundException);
        await expect(
          adapter.copy('mockfile_text_99.txt', 'mockfile_text_04.txt'),
        ).rejects.toThrow('Resource not found: mockfile_text_99.txt');
      });

      it('should reject copy when destination exists without overwrite', async () => {
        await expect(
          adapter.copy('mockfile_text_01.txt', 'mockfile_text_02.txt'),
        ).rejects.toThrow(ConflictException);
        await expect(
          adapter.copy('mockfile_text_01.txt', 'mockfile_text_02.txt'),
        ).rejects.toThrow('File already exists');
      });

      it('should reject folder copy without recursive', async () => {
        await expect(adapter.copy('nestitems', 'nestitems2')).rejects.toThrow(
          BadRequestException,
        );
        await expect(adapter.copy('nestitems', 'nestitems2')).rejects.toThrow(
          'Recursive copy is required for folders',
        );
      });

      it('should reject copy when source and destination are the same', async () => {
        await expect(
          adapter.copy('mockfile_text_01.txt', 'mockfile_text_01.txt'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          adapter.copy('mockfile_text_01.txt', 'mockfile_text_01.txt'),
        ).rejects.toThrow('Source and destination are the same');
      });

      it('should reject copy of folder into a descendant', async () => {
        await expect(
          adapter.copy('nestitems', 'nestitems/subfolder', {
            recursive: true,
          }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          adapter.copy('nestitems', 'nestitems/subfolder', {
            recursive: true,
          }),
        ).rejects.toThrow('Cannot copy a folder into itself or a descendant');
      });

      it('should reject copy when destination parent is not a directory', async () => {
        await expect(
          adapter.copy(
            'mockfile_text_01.txt',
            'mockfile_text_02.txt/nested.txt',
          ),
        ).rejects.toThrow(BadRequestException);
        await expect(
          adapter.copy(
            'mockfile_text_01.txt',
            'mockfile_text_02.txt/nested.txt',
          ),
        ).rejects.toThrow('Destination parent is not a directory');
      });

      it('should overwrite an existing file when overwrite is true', async () => {
        const fileTemplates = buildMockFile();
        const copied = await adapter.copy(
          'mockfile_text_01.txt',
          'mockfile_text_02.txt',
          { overwrite: true },
        );

        expect(copied).toMatchObject({
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        });
        await expectDownloadEquals(
          adapter,
          'mockfile_text_02.txt',
          fileTemplates['mockfile_text_01.txt'],
        );
        await expectDownloadEquals(
          adapter,
          'mockfile_text_01.txt',
          fileTemplates['mockfile_text_01.txt'],
        );
      });

      it('should overwrite an existing folder when overwrite and recursive are true', async () => {
        const fileTemplates = buildMockFile();
        const copied = await adapter.copy('nestitems', 'nestitems_add', {
          overwrite: true,
          recursive: true,
        });

        expect(copied).toMatchObject({
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        });

        const nestResult = await adapter.list('nestitems_add');
        expect(nestResult.map((entry) => entry.path)).toEqual(
          expect.arrayContaining([
            'nestitems_add/mockfile_textnest_01.txt',
            'nestitems_add/mockfile_textnest_02.txt',
          ]),
        );
        await expectDownloadEquals(
          adapter,
          'nestitems_add/mockfile_textnest_01.txt',
          fileTemplates['nestitems/mockfile_textnest_01.txt'],
        );
        await expectDownloadEquals(
          adapter,
          'nestitems/mockfile_textnest_01.txt',
          fileTemplates['nestitems/mockfile_textnest_01.txt'],
        );
      });
    });
  });

  describe('move', () => {
    it('should move a file to a new path and remove the source', async () => {
      const fileTemplates = buildMockFile();
      const moved = await adapter.move(
        'mockfile_text_01.txt',
        'mockfile_text_04.txt',
      );

      expect(moved).toMatchObject({
        path: 'mockfile_text_04.txt',
        name: 'mockfile_text_04.txt',
        type: 'file',
      });
      expect(moved.size).toEqual(expect.any(Number));
      expect(moved.updatedAt).toEqual(expect.any(String));

      await expectDownloadEquals(
        adapter,
        'mockfile_text_04.txt',
        fileTemplates['mockfile_text_01.txt'],
      );

      const result = await adapter.list('');
      expectListEntries(result, [
        {
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_03.txt',
          name: 'mockfile_text_03.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_04.txt',
          name: 'mockfile_text_04.txt',
          type: 'file',
        },
        {
          path: 'nestitems',
          name: 'nestitems',
          type: 'directory',
        },
        {
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        },
      ]);
      expectPathsAbsent(result, ['mockfile_text_01.txt']);
    });

    it('should move a folder recursively and remove the source', async () => {
      const fileTemplates = buildMockFile();
      const moved = await adapter.move('nestitems', 'nestitems2', {
        recursive: true,
      });

      expect(moved).toMatchObject({
        path: 'nestitems2',
        name: 'nestitems2',
        type: 'directory',
      });
      expect(moved.updatedAt).toEqual(expect.any(String));

      await expectDownloadEquals(
        adapter,
        'nestitems2/mockfile_textnest_01.txt',
        fileTemplates['nestitems/mockfile_textnest_01.txt'],
      );

      const result = await adapter.list('');
      expectListEntries(result, [
        {
          path: 'mockfile_text_01.txt',
          name: 'mockfile_text_01.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_03.txt',
          name: 'mockfile_text_03.txt',
          type: 'file',
        },
        {
          path: 'nestitems2',
          name: 'nestitems2',
          type: 'directory',
        },
        {
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        },
      ]);
      expectPathsAbsent(result, ['nestitems']);

      const movedNestItems = await adapter.list('nestitems2');
      expectListEntries(movedNestItems, [
        {
          path: 'nestitems2/mockfile_textnest_01.txt',
          name: 'mockfile_textnest_01.txt',
          type: 'file',
        },
        {
          path: 'nestitems2/mockfile_textnest_02.txt',
          name: 'mockfile_textnest_02.txt',
          type: 'file',
        },
      ]);

      await expect(adapter.list('nestitems')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should move a file into a folder and remove the source from root', async () => {
      const fileTemplates = buildMockFile();
      const moved = await adapter.move(
        'mockfile_text_01.txt',
        'nestitems/mockfile_textnest_03.txt',
      );

      expect(moved).toMatchObject({
        path: 'nestitems/mockfile_textnest_03.txt',
        name: 'mockfile_textnest_03.txt',
        type: 'file',
      });
      expect(moved.size).toEqual(expect.any(Number));
      expect(moved.updatedAt).toEqual(expect.any(String));

      await expectDownloadEquals(
        adapter,
        'nestitems/mockfile_textnest_03.txt',
        fileTemplates['mockfile_text_01.txt'],
      );

      const rootResult = await adapter.list('');
      expectListEntries(rootResult, [
        {
          path: 'mockfile_text_02.txt',
          name: 'mockfile_text_02.txt',
          type: 'file',
        },
        {
          path: 'mockfile_text_03.txt',
          name: 'mockfile_text_03.txt',
          type: 'file',
        },
        {
          path: 'nestitems',
          name: 'nestitems',
          type: 'directory',
        },
        {
          path: 'nestitems_add',
          name: 'nestitems_add',
          type: 'directory',
        },
      ]);
      expectPathsAbsent(rootResult, ['mockfile_text_01.txt']);

      const nestResult = await adapter.list('nestitems');
      expectListEntries(nestResult, [
        {
          path: 'nestitems/mockfile_textnest_01.txt',
          name: 'mockfile_textnest_01.txt',
          type: 'file',
        },
        {
          path: 'nestitems/mockfile_textnest_02.txt',
          name: 'mockfile_textnest_02.txt',
          type: 'file',
        },
        {
          path: 'nestitems/mockfile_textnest_03.txt',
          name: 'mockfile_textnest_03.txt',
          type: 'file',
        },
      ]);
    });

    it('should reject folder move without recursive', async () => {
      await expect(adapter.move('nestitems', 'nestitems2')).rejects.toThrow(
        BadRequestException,
      );
      await expect(adapter.move('nestitems', 'nestitems2')).rejects.toThrow(
        'Recursive move is required for folders',
      );
    });

    it('should reject move when destination exists without overwrite', async () => {
      await expect(
        adapter.move('mockfile_text_01.txt', 'mockfile_text_02.txt'),
      ).rejects.toThrow(ConflictException);
      await expect(
        adapter.move('mockfile_text_01.txt', 'mockfile_text_02.txt'),
      ).rejects.toThrow('File already exists');
    });

    it('should overwrite an existing file when overwrite is true', async () => {
      const fileTemplates = buildMockFile();
      const moved = await adapter.move(
        'mockfile_text_01.txt',
        'mockfile_text_02.txt',
        { overwrite: true },
      );

      expect(moved).toMatchObject({
        path: 'mockfile_text_02.txt',
        name: 'mockfile_text_02.txt',
        type: 'file',
      });
      await expectDownloadEquals(
        adapter,
        'mockfile_text_02.txt',
        fileTemplates['mockfile_text_01.txt'],
      );

      const result = await adapter.list('');
      expectPathsAbsent(result, ['mockfile_text_01.txt']);
    });

    it('should overwrite an existing folder when overwrite and recursive are true', async () => {
      const fileTemplates = buildMockFile();
      const moved = await adapter.move('nestitems', 'nestitems_add', {
        overwrite: true,
        recursive: true,
      });

      expect(moved).toMatchObject({
        path: 'nestitems_add',
        name: 'nestitems_add',
        type: 'directory',
      });

      const nestResult = await adapter.list('nestitems_add');
      expectListEntries(nestResult, [
        {
          path: 'nestitems_add/mockfile_textnest_01.txt',
          name: 'mockfile_textnest_01.txt',
          type: 'file',
        },
        {
          path: 'nestitems_add/mockfile_textnest_02.txt',
          name: 'mockfile_textnest_02.txt',
          type: 'file',
        },
      ]);
      await expectDownloadEquals(
        adapter,
        'nestitems_add/mockfile_textnest_01.txt',
        fileTemplates['nestitems/mockfile_textnest_01.txt'],
      );
      await expect(adapter.list('nestitems')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject move when source is not found', async () => {
      await expect(
        adapter.move('mockfile_text_99.txt', 'mockfile_text_04.txt'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        adapter.move('mockfile_text_99.txt', 'mockfile_text_04.txt'),
      ).rejects.toThrow('Resource not found: mockfile_text_99.txt');
    });

    it('should reject move when source and destination are the same', async () => {
      await expect(
        adapter.move('mockfile_text_01.txt', 'mockfile_text_01.txt'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        adapter.move('mockfile_text_01.txt', 'mockfile_text_01.txt'),
      ).rejects.toThrow('Source and destination are the same');
    });

    it('should reject move of folder into a descendant', async () => {
      await expect(
        adapter.move('nestitems', 'nestitems/subfolder', {
          recursive: true,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        adapter.move('nestitems', 'nestitems/subfolder', {
          recursive: true,
        }),
      ).rejects.toThrow('Cannot copy a folder into itself or a descendant');
    });

    it('should reject move when destination parent is not a directory', async () => {
      await expect(
        adapter.move('mockfile_text_01.txt', 'mockfile_text_02.txt/nested.txt'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        adapter.move('mockfile_text_01.txt', 'mockfile_text_02.txt/nested.txt'),
      ).rejects.toThrow('Destination parent is not a directory');
    });
  });

  describe('download', () => {
    it('should download a file', async () => {
      const fileTemplates = buildMockFile();
      await expectDownloadEquals(
        adapter,
        'mockfile_text_01.txt',
        fileTemplates['mockfile_text_01.txt'],
      );
    });

    it('should download a file inside folder', async () => {
      const fileTemplates = buildMockFile();
      await expectDownloadEquals(
        adapter,
        'nestitems/mockfile_textnest_01.txt',
        fileTemplates['nestitems/mockfile_textnest_01.txt'],
      );
    });

    it('should reject download when the file does not exist', async () => {
      await expect(adapter.download('mockfile_text_99.txt')).rejects.toThrow(
        NotFoundException,
      );
      await expect(adapter.download('mockfile_text_99.txt')).rejects.toThrow(
        'Resource not found: mockfile_text_99.txt',
      );
    });

    it('should reject download when the locator is not a file', async () => {
      await expect(adapter.download('nestitems')).rejects.toThrow(
        BadRequestException,
      );
      await expect(adapter.download('nestitems')).rejects.toThrow('Not a file');
    });
  });

  describe('upload', () => {
    it('should upload a file', async () => {
      const fileTemplate = new FileTemplate(
        'upload_text_01.txt',
        'my upload text',
        'utf16le',
      );

      const uploadResult: UnifiedResource = await adapter.upload(
        '',
        fileTemplate.basename,
        Readable.from([fileTemplate.toBytes()]),
        {
          size: fileTemplate.toBytes().length,
          overwrite: false,
          visibility: 'public',
          checksum: {
            algorithm: 'sha256',
            value: createHash('sha256')
              .update(fileTemplate.toBytes())
              .digest('hex'),
          },
        },
      );

      expect(uploadResult).toMatchObject({
        path: fileTemplate.path,
        name: fileTemplate.basename,
        type: 'file',
        size: fileTemplate.toBytes().length,
      });

      await expectDownloadEquals(adapter, uploadResult.path, fileTemplate);
    });

    it('should upload a file with overwrite', async () => {
      const fileTemplate = new FileTemplate(
        'mockfile_text_01.txt',
        'my upload text',
        'utf16le',
      );
      const uploadResult = await adapter.upload(
        '',
        fileTemplate.basename,
        Readable.from(fileTemplate.toBytes()),
        {
          size: fileTemplate.toBytes().length,
          overwrite: true,
          visibility: 'public',
          checksum: {
            algorithm: 'sha256',
            value: createHash('sha256')
              .update(fileTemplate.toBytes())
              .digest('hex'),
          },
        },
      );

      expect(uploadResult).toMatchObject({
        path: fileTemplate.path,
        name: fileTemplate.basename,
        type: 'file',
        size: fileTemplate.toBytes().length,
      });

      await expectDownloadEquals(adapter, fileTemplate.basename, fileTemplate);
    });

    it('should upload a file with no overwrite and conflict', async () => {
      const fileTemplates = buildMockFile();
      const fileTemplate = new FileTemplate(
        'mockfile_text_01.txt',
        'my upload text',
        'utf16le',
      );
      await expect(
        adapter.upload(
          '',
          fileTemplate.basename,
          Readable.from(fileTemplate.toBytes()),
          {
            size: fileTemplate.toBytes().length,
            overwrite: false,
            visibility: 'public',
            checksum: {
              algorithm: 'sha256',
              value: createHash('sha256')
                .update(fileTemplate.toBytes())
                .digest('hex'),
            },
          },
        ),
      ).rejects.toThrow(ConflictException);
      await expectDownloadEquals(
        adapter,
        fileTemplate.path,
        fileTemplates[fileTemplate.path],
      );
    });

    it('should reject upload when checksum does not match', async () => {
      const fileTemplate = new FileTemplate(
        'checksum_fail.txt',
        'checksum test content',
      );
      const bytes = fileTemplate.toBytes();

      await expect(
        adapter.upload('', fileTemplate.basename, Readable.from(bytes), {
          size: bytes.length,
          overwrite: false,
          checksum: {
            algorithm: 'sha256',
            value: '0'.repeat(64),
          },
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        adapter.upload('', fileTemplate.basename, Readable.from(bytes), {
          size: bytes.length,
          overwrite: false,
          checksum: {
            algorithm: 'sha256',
            value: '0'.repeat(64),
          },
        }),
      ).rejects.toThrow('Checksum mismatch');

      await expect(adapter.getMetadata(fileTemplate.path)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upload a file to a nested locator', async () => {
      const fileTemplate = new FileTemplate(
        'nestitems/upload_nested.txt',
        'nested upload content',
      );
      const bytes = fileTemplate.toBytes();

      const uploadResult = await adapter.upload(
        'nestitems',
        'upload_nested.txt',
        Readable.from(bytes),
        {
          size: bytes.length,
          overwrite: false,
          checksum: {
            algorithm: 'sha256',
            value: createHash('sha256').update(bytes).digest('hex'),
          },
        },
      );

      expect(uploadResult).toMatchObject({
        path: 'nestitems/upload_nested.txt',
        name: 'upload_nested.txt',
        type: 'file',
      });
      await expectDownloadEquals(
        adapter,
        'nestitems/upload_nested.txt',
        fileTemplate,
      );
    });

    it('should reject upload when parent is not a directory', async () => {
      const bytes = Buffer.from('content');
      await expect(
        adapter.upload(
          'mockfile_text_01.txt',
          'nested.txt',
          Readable.from(bytes),
          {
            size: bytes.length,
            overwrite: false,
            checksum: {
              algorithm: 'sha256',
              value: createHash('sha256').update(bytes).digest('hex'),
            },
          },
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        adapter.upload(
          'mockfile_text_01.txt',
          'nested.txt',
          Readable.from(bytes),
          {
            size: bytes.length,
            overwrite: false,
            checksum: {
              algorithm: 'sha256',
              value: createHash('sha256').update(bytes).digest('hex'),
            },
          },
        ),
      ).rejects.toThrow('Upload destination is not a directory');
    });

    it('should include mimeType in upload response when provided', async () => {
      const fileTemplate = new FileTemplate('mime_test.txt', 'mime content');
      const bytes = fileTemplate.toBytes();

      const uploadResult = await adapter.upload(
        '',
        fileTemplate.basename,
        Readable.from(bytes),
        {
          size: bytes.length,
          overwrite: false,
          mimeType: 'text/plain',
          checksum: {
            algorithm: 'sha256',
            value: createHash('sha256').update(bytes).digest('hex'),
          },
        },
      );

      expect(uploadResult.mimeType).toBe('text/plain');
    });

    it('should upload an empty file', async () => {
      const bytes = Buffer.alloc(0);
      const uploadResult = await adapter.upload(
        '',
        'empty.txt',
        Readable.from([]),
        {
          size: 0,
          overwrite: false,
          checksum: {
            algorithm: 'sha256',
            value: createHash('sha256').update(bytes).digest('hex'),
          },
        },
      );

      expect(uploadResult).toMatchObject({
        path: 'empty.txt',
        name: 'empty.txt',
        type: 'file',
        size: 0,
      });

      const downloadResult: DownloadResult =
        await adapter.download('empty.txt');
      const content = await readStreamToBuffer(downloadResult.stream);
      expect(content.length).toBe(0);
      expect(downloadResult.size).toBe(0);
      expect(downloadResult.checksum?.value).toBe(
        createHash('sha256').update(bytes).digest('hex'),
      );
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      await adapter.delete('mockfile_text_01.txt');

      const result = await adapter.list('');
      expectPathsAbsent(result, ['mockfile_text_01.txt']);
      await expect(adapter.getMetadata('mockfile_text_01.txt')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete a folder recursively', async () => {
      await adapter.delete('nestitems');

      const result = await adapter.list('');
      expectPathsAbsent(result, ['nestitems']);
      await expect(adapter.list('nestitems')).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        adapter.getMetadata('nestitems/mockfile_textnest_01.txt'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject delete when path does not exist', async () => {
      await expect(adapter.delete('not_a_resource')).rejects.toThrow(
        NotFoundException,
      );
      await expect(adapter.delete('not_a_resource')).rejects.toThrow(
        'Resource not found: not_a_resource',
      );
    });
  });

  describe('createFolder', () => {
    it('should create a folder at root', async () => {
      const folderName = 'newfolder';
      const result = await adapter.createFolder('', folderName);

      expect(result).toMatchObject({
        path: folderName,
        name: folderName,
        type: 'directory',
      });
      expect(result.updatedAt).toEqual(expect.any(String));

      const rootEntries = await adapter.list('');
      expect(rootEntries.map((entry) => entry.path)).toContain(folderName);
    });

    it('should create a folder under a nested parent', async () => {
      const folderName = 'subfolder';
      const result = await adapter.createFolder('nestitems', folderName);

      expect(result).toMatchObject({
        path: 'nestitems/subfolder',
        name: folderName,
        type: 'directory',
      });

      const nestEntries = await adapter.list('nestitems');
      expect(nestEntries.map((entry) => entry.path)).toContain(
        'nestitems/subfolder',
      );
    });

    it('should reject duplicate folder creation', async () => {
      await adapter.createFolder('', 'newfolder');

      await expect(adapter.createFolder('', 'newfolder')).rejects.toThrow(
        ConflictException,
      );
      await expect(adapter.createFolder('', 'newfolder')).rejects.toThrow(
        'Folder already exists',
      );
    });

    it('should reject folder creation when parent is not a directory', async () => {
      await expect(
        adapter.createFolder('mockfile_text_01.txt', 'newfolder'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        adapter.createFolder('mockfile_text_01.txt', 'newfolder'),
      ).rejects.toThrow('Parent is not a directory');
    });

    it('should reject folder creation when a file with the same name exists', async () => {
      await expect(
        adapter.createFolder('', 'mockfile_text_01.txt'),
      ).rejects.toThrow(ConflictException);
      await expect(
        adapter.createFolder('', 'mockfile_text_01.txt'),
      ).rejects.toThrow('Folder already exists');
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for a file including size', async () => {
      const fileTemplates = buildMockFile();
      const template = fileTemplates['mockfile_text_01.txt'];

      const result = await adapter.getMetadata('mockfile_text_01.txt');

      expect(result).toMatchObject({
        path: 'mockfile_text_01.txt',
        name: 'mockfile_text_01.txt',
        type: 'file',
        size: template.toBytes().length,
      });
      expect(result.updatedAt).toEqual(expect.any(String));
    });

    it('should return metadata for a directory without size', async () => {
      const result = await adapter.getMetadata('nestitems');

      expect(result).toMatchObject({
        path: 'nestitems',
        name: 'nestitems',
        type: 'directory',
      });
      expect(result.size).toBeUndefined();
      expect(result.updatedAt).toEqual(expect.any(String));
    });

    it('should reject getMetadata when path does not exist', async () => {
      await expect(adapter.getMetadata('not_a_resource')).rejects.toThrow(
        NotFoundException,
      );
      await expect(adapter.getMetadata('not_a_resource')).rejects.toThrow(
        'Resource not found: not_a_resource',
      );
    });

    it('should normalize leading slashes in locator', async () => {
      const result = await adapter.getMetadata('/mockfile_text_01.txt');

      expect(result.path).toBe('mockfile_text_01.txt');
      expect(result.name).toBe('mockfile_text_01.txt');
      expect(result.type).toBe('file');
    });
  });

  describe('user isolation', () => {
    it('lists only files under the scoped user data root', async () => {
      const userBDataDir = storagePathService.resolveStoragePath(
        undefined,
        'user-b',
      );
      mkdirSync(userBDataDir, { recursive: true });
      writeFileSync(join(userBDataDir, 'user-b-only.txt'), 'user b data');

      const userBAdapter = localStorageAdapter.forUser('user-b');
      const userBResult = await userBAdapter.list('');

      expect(userBResult).toEqual([
        expect.objectContaining({
          path: 'user-b-only.txt',
          name: 'user-b-only.txt',
          type: 'file',
        }),
      ]);

      const defaultResult = await adapter.list('');
      expect(defaultResult.map((entry) => entry.path)).not.toContain(
        'user-b-only.txt',
      );
      expect(defaultResult.length).toBeGreaterThan(0);

      rmSync(userBDataDir, { recursive: true, force: true });
    });
  });
});
