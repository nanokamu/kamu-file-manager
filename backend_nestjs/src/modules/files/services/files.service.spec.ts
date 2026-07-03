import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import {
  MAX_ZIP_DOWNLOAD_SIZE_BYTES,
  STORAGE_ADAPTER,
} from '../../../core/config/storage.config';
import {
  createTestStorageConfig,
  storageTestProviders,
} from '../../../../test/helpers/storage.fixture';
import { FilesService } from './files.service';
import type {
  StorageOperations,
  UnifiedStorageAdapter,
} from '../interfaces/storage-adapter.interface';
import type { UnifiedResource } from '../interfaces/resource.interface';
import { basename, join } from 'path';

const TEST_STORAGE_ROOT = join(__dirname, '../../../../file_items_test');

function createStorageOperationsMock(
  overrides: Partial<StorageOperations> = {},
): StorageOperations {
  return {
    download: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    createFolder: jest.fn(),
    getMetadata: jest.fn(),
    copy: jest.fn(),
    move: jest.fn(),
    ...overrides,
  };
}

const defaultUploadQuery = {
  locator: '',
  fileName: 'test.txt',
  checksumAlgorithm: 'sha256' as const,
  checksumValue:
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

describe('FilesService upload validation', () => {
  let filesService: FilesService;
  let uploadMock: jest.Mock;

  beforeEach(async () => {
    uploadMock = jest.fn((_locator, _fileName, stream: Readable) =>
      pipeline(
        stream,
        new Writable({
          write(_chunk, _encoding, callback) {
            callback();
          },
        }),
      ).then(() => ({
        path: 'test.txt',
        name: 'test.txt',
        type: 'file' as const,
      })),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        ...storageTestProviders(createTestStorageConfig(TEST_STORAGE_ROOT)),
        {
          provide: STORAGE_ADAPTER,
          useValue: {
            forUser: jest.fn(() =>
              createStorageOperationsMock({ upload: uploadMock }),
            ),
          } satisfies UnifiedStorageAdapter,
        },
      ],
    }).compile();

    filesService = module.get(FilesService);
  });

  function createRequest(
    body: string,
    headers: Record<string, string> = {},
  ): Request {
    const stream = Readable.from([Buffer.from(body)]);
    return Object.assign(stream, {
      headers,
    }) as unknown as Request;
  }

  it('rejects Content-Length larger than declared size before streaming', async () => {
    const req = createRequest('hello world', { 'content-length': '10' });

    await expect(
      filesService.upload('', 'test.txt', req, {
        ...defaultUploadQuery,
        size: 5,
      }, 'default'),
    ).rejects.toThrow(
      /Content-Length \(10\) does not match declared size \(5\)/,
    );

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects body larger than declared size during streaming', async () => {
    const req = createRequest('123456');

    await expect(
      filesService.upload('', 'test.txt', req, {
        ...defaultUploadQuery,
        size: 5,
      }, 'default'),
    ).rejects.toThrow(/Upload exceeds declared size/);

    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('rejects body smaller than declared size during streaming', async () => {
    const req = createRequest('1234');

    await expect(
      filesService.upload('', 'test.txt', req, {
        ...defaultUploadQuery,
        size: 5,
      }, 'default'),
    ).rejects.toThrow(/Uploaded size mismatch/);

    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('allows upload when declared size matches body', async () => {
    const req = createRequest('12345', { 'content-length': '5' });

    await filesService.upload('', 'test.txt', req, {
      ...defaultUploadQuery,
      size: 5,
    }, 'default');

    expect(uploadMock).toHaveBeenCalledTimes(1);
  });
});

function toFileResource(
  path: string,
  size: number,
  updatedAt: string,
): UnifiedResource {
  // const name = path.slice(path.lastIndexOf('/') + 1);
  const name = basename(path);
  return { path, name, type: 'file', size, updatedAt };
}

function toDirResource(path: string, updatedAt: string): UnifiedResource {
  // const name = path.slice(path.lastIndexOf('/') + 1);
  const name = basename(path);
  return { path, name, type: 'directory', updatedAt };
}

function toListEntry(resource: UnifiedResource): UnifiedResource {
  const entry: UnifiedResource = {
    path: resource.path,
    name: resource.name,
    type: resource.type,
    updatedAt: resource.updatedAt,
  };

  if (resource.size !== undefined) {
    entry.size = resource.size;
  }

  return entry;
}

describe('FilesService downloadZip size limit', () => {
  let filesService: FilesService;
  let getMetadataMock: jest.Mock;
  let listMock: jest.Mock;
  let downloadMock: jest.Mock;

  beforeEach(async () => {
    getMetadataMock = jest.fn();
    listMock = jest.fn();
    downloadMock = jest.fn(() =>
      Promise.resolve({ stream: Readable.from([Buffer.alloc(0)]) }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        ...storageTestProviders(createTestStorageConfig(TEST_STORAGE_ROOT)),
        {
          provide: STORAGE_ADAPTER,
          useValue: {
            forUser: jest.fn(() =>
              createStorageOperationsMock({
                getMetadata: getMetadataMock,
                list: listMock,
                download: downloadMock,
              }),
            ),
          } satisfies UnifiedStorageAdapter,
        },
      ],
    }).compile();

    filesService = module.get(FilesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows direct files under limit', async () => {
    getMetadataMock.mockResolvedValue({
      path: 'small.txt',
      name: 'small.txt',
      type: 'file',
      size: 500,
      updatedAt: '2024-01-01',
    });

    const result = await filesService.downloadZip({
      locators: ['small.txt'],
    }, 'default');

    expect(result.archiveName).toBe('archive.zip');
    expect(downloadMock).toHaveBeenCalledWith('small.txt');
    expect(result.stream).toBeDefined();
    expect(result.checksum.algorithm).toBe('sha256');

    const chunks: Buffer[] = [];
    for await (const chunk of result.stream) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as string | Uint8Array),
      );
    }
    const zipBuffer = Buffer.concat(chunks);
    expect(result.checksum.value).toBe(
      createHash('sha256').update(zipBuffer).digest('hex'),
    );
    expect(result.size).toBe(zipBuffer.length);
  });

  it('allows multiple files under limit', async () => {
    const locators = [
      'file_01.txt',
      'file_02.txt',
      'file_03.txt',
      'folder_01/file_04.txt',
    ];

    const fileFixtures = [
      { path: 'file_01.txt', size: 500, updatedAt: '2024-01-01' },
      { path: 'file_02.txt', size: 2000, updatedAt: '2025-01-01' },
      {
        path: 'file_03.txt',
        size: 102 * 1024 * 1024,
        updatedAt: '2025-05-01',
      },
      {
        path: 'folder_01/file_04.txt',
        size: 400 * 1024,
        updatedAt: '2025-08-08',
      },
    ];

    const metadataByLocator = Object.fromEntries(
      fileFixtures.map(({ path, size, updatedAt }) => [
        path,
        toFileResource(path, size, updatedAt),
      ]),
    );

    getMetadataMock.mockImplementation((locator: string) =>
      Promise.resolve(metadataByLocator[locator]),
    );

    listMock.mockImplementation((locator: string) => {
      const filelistByLocator: Record<string, UnifiedResource[]> = {
        '': [
          ...['file_01.txt', 'file_02.txt', 'file_03.txt'].map((path) =>
            toListEntry(metadataByLocator[path]),
          ),
          toDirResource('folder_01', '2025-08-08'),
        ],
        folder_01: [toListEntry(metadataByLocator['folder_01/file_04.txt'])],
      };
      return Promise.resolve(filelistByLocator[locator]);
    });

    const result = await filesService.downloadZip({
      locators,
    }, 'default');

    expect(result.archiveName).toBe('archive.zip');
    expect(downloadMock).toHaveBeenCalledTimes(locators.length);
    expect(downloadMock).toHaveBeenCalledWith('file_01.txt');
    expect(downloadMock).toHaveBeenCalledWith('folder_01/file_04.txt');
  });

  it('rejects direct files over limit', async () => {
    getMetadataMock.mockResolvedValue({
      path: 'large.txt',
      name: 'large.txt',
      type: 'file',
      size: MAX_ZIP_DOWNLOAD_SIZE_BYTES + 1,
      updatedAt: '2024-01-01',
    });

    await expect(
      filesService.downloadZip({
        locators: ['large.txt'],
      }, 'default'),
    ).rejects.toThrow(
      new BadRequestException(
        `Total download size exceeds maximum of ${MAX_ZIP_DOWNLOAD_SIZE_BYTES} bytes`,
      ),
    );
  });

  it('rejects multiple files over limit', async () => {
    const locators = [
      'file_01.txt',
      'file_02.txt',
      'file_03.txt',
      'folder_01/file_04.txt',
    ];

    const fileFixtures = [
      { path: 'file_01.txt', size: 500, updatedAt: '2024-01-01' },
      { path: 'file_02.txt', size: 2000, updatedAt: '2025-01-01' },
      {
        path: 'file_03.txt',
        size: 1024 * 1024 * 1024,
        updatedAt: '2025-05-01',
      },
      {
        path: 'folder_01/file_04.txt',
        size: 400 * 1024,
        updatedAt: '2025-08-08',
      },
    ];

    const metadataByLocator = Object.fromEntries(
      fileFixtures.map(({ path, size, updatedAt }) => [
        path,
        toFileResource(path, size, updatedAt),
      ]),
    );

    getMetadataMock.mockImplementation((locator: string) =>
      Promise.resolve(metadataByLocator[locator]),
    );

    listMock.mockImplementation((locator: string) => {
      const filelistByLocator: Record<string, UnifiedResource[]> = {
        '': [
          ...['file_01.txt', 'file_02.txt', 'file_03.txt'].map((path) =>
            toListEntry(metadataByLocator[path]),
          ),
          toDirResource('folder_01', '2025-08-08'),
        ],
        folder_01: [toListEntry(metadataByLocator['folder_01/file_04.txt'])],
      };
      return Promise.resolve(filelistByLocator[locator]);
    });

    await expect(
      filesService.downloadZip({
        locators: locators.slice(0, 3),
      }, 'default'),
    ).rejects.toThrow(
      new BadRequestException(
        `Total download size exceeds maximum of ${MAX_ZIP_DOWNLOAD_SIZE_BYTES} bytes`,
      ),
    );

    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('rejects folders whose files sum over limit', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const locators = [
      'file_01.txt',
      'file_02.txt',
      'file_03.txt',
      'folder_01/file_04.txt',
      'folder_01/file_05.txt',
    ];

    const fileFixtures = [
      { path: 'file_01.txt', size: 500, updatedAt: '2024-01-01' },
      { path: 'file_02.txt', size: 2000, updatedAt: '2025-01-01' },
      {
        path: 'file_03.txt',
        size: 100 * 1024 * 1024,
        updatedAt: '2025-05-01',
      },
      {
        path: 'folder_01/file_04.txt',
        size: 400 * 1024,
        updatedAt: '2025-08-08',
      },
      {
        path: 'folder_01/file_05.txt',
        size: 1024 * 1024 * 1024,
        updatedAt: '2025-08-02',
      },
    ];

    const metadataByLocator = Object.fromEntries(
      fileFixtures.map(({ path, size, updatedAt }) => [
        path,
        toFileResource(path, size, updatedAt),
      ]),
    );
    metadataByLocator['folder_01'] = toDirResource('folder_01', '2025-08-08');

    getMetadataMock.mockImplementation((locator: string) =>
      Promise.resolve(metadataByLocator[locator]),
    );

    listMock.mockImplementation((locator: string) => {
      const filelistByLocator: Record<string, UnifiedResource[]> = {
        '': [
          ...['file_01.txt', 'file_02.txt', 'file_03.txt'].map((path) =>
            toListEntry(metadataByLocator[path]),
          ),
          toDirResource('folder_01', '2025-08-08'),
        ],
        folder_01: [
          ...['folder_01/file_04.txt', 'folder_01/file_05.txt'].map((path) =>
            toListEntry(metadataByLocator[path]),
          ),
        ],
      };
      return Promise.resolve(filelistByLocator[locator]);
    });

    await expect(
      filesService.downloadZip({
        folderLocators: ['folder_01'],
      }, 'default'),
    ).rejects.toThrow(
      new BadRequestException(
        `Total download size exceeds maximum of ${MAX_ZIP_DOWNLOAD_SIZE_BYTES} bytes`,
      ),
    );

    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('rejects folders whose files sum over limit', async () => {
    getMetadataMock.mockResolvedValue({
      path: 'folder',
      name: 'folder',
      type: 'directory',
      updatedAt: '2024-01-01',
    });

    listMock.mockResolvedValue([
      {
        path: 'folder/big.bin',
        name: 'big.bin',
        type: 'file',
        size: MAX_ZIP_DOWNLOAD_SIZE_BYTES + 1,
        updatedAt: '2024-01-01',
      },
    ]);

    await expect(
      filesService.downloadZip({
        folderLocators: ['folder'],
      }, 'default'),
    ).rejects.toThrow(
      new BadRequestException(
        `Total download size exceeds maximum of ${MAX_ZIP_DOWNLOAD_SIZE_BYTES} bytes`,
      ),
    );
  });

  it('rejects files with unavailable size', async () => {
    getMetadataMock.mockResolvedValue({
      path: 'unknown.txt',
      name: 'unknown.txt',
      type: 'file',
      updatedAt: '2024-01-01',
    });

    await expect(
      filesService.downloadZip({
        locators: ['unknown.txt'],
      }, 'default'),
    ).rejects.toThrow(new BadRequestException('File size unavailable'));
  });
});

describe('FilesService downloadZipFromLocators', () => {
  let filesService: FilesService;
  let getMetadataMock: jest.Mock;
  let listMock: jest.Mock;
  let downloadMock: jest.Mock;

  beforeEach(async () => {
    getMetadataMock = jest.fn();
    listMock = jest.fn();
    downloadMock = jest.fn(() =>
      Promise.resolve({ stream: Readable.from([Buffer.alloc(0)]) }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        ...storageTestProviders(createTestStorageConfig(TEST_STORAGE_ROOT)),
        {
          provide: STORAGE_ADAPTER,
          useValue: {
            forUser: jest.fn(() =>
              createStorageOperationsMock({
                getMetadata: getMetadataMock,
                list: listMock,
                download: downloadMock,
              }),
            ),
          } satisfies UnifiedStorageAdapter,
        },
      ],
    }).compile();

    filesService = module.get(FilesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('expands folder-only locators into folderLocators', async () => {
    const downloadZipSpy = jest.spyOn(filesService, 'downloadZip');

    getMetadataMock.mockImplementation((locator: string) => {
      if (locator === 'folder') {
        return Promise.resolve(toDirResource('folder', '2024-01-01'));
      }

      return Promise.resolve(
        toFileResource(locator, 7, '2024-01-01'),
      );
    });

    listMock.mockResolvedValue([
      toListEntry(toFileResource('folder/nested.txt', 7, '2024-01-01')),
    ]);

    await filesService.downloadZipFromLocators(['folder'], 'archive.zip', 'default');

    expect(downloadZipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        locators: [],
        folderLocators: ['folder'],
        folderZipPaths: ['folder'],
        archiveName: 'archive.zip',
      }),
      'default',
    );
    expect(downloadMock).toHaveBeenCalledWith('folder/nested.txt');

    downloadZipSpy.mockRestore();
  });

  it('splits mixed file and folder locators', async () => {
    const downloadZipSpy = jest.spyOn(filesService, 'downloadZip');

    getMetadataMock.mockImplementation((locator: string) => {
      if (locator === 'nestfolder') {
        return Promise.resolve(toDirResource('nestfolder', '2024-01-01'));
      }

      return Promise.resolve(
        toFileResource(locator, 7, '2024-01-01'),
      );
    });

    listMock.mockImplementation((locator: string) => {
      if (locator === 'nestfolder') {
        return Promise.resolve([
          toListEntry(toFileResource('nestfolder/inner.txt', 7, '2024-01-01')),
        ]);
      }

      return Promise.resolve([]);
    });

    await filesService.downloadZipFromLocators(
      ['outsider1.txt', 'outsider2.txt', 'nestfolder'],
      'archive.zip',
      'default',
    );

    expect(downloadZipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        locators: ['outsider1.txt', 'outsider2.txt'],
        folderLocators: ['nestfolder'],
        folderZipPaths: ['nestfolder'],
        archiveName: 'archive.zip',
      }),
      'default',
    );

    downloadZipSpy.mockRestore();
  });
});

describe('FilesService compressLocatorsToZipFile', () => {
  let filesService: FilesService;
  let getMetadataMock: jest.Mock;
  let listMock: jest.Mock;
  let downloadMock: jest.Mock;
  let uploadMock: jest.Mock;

  beforeEach(async () => {
    getMetadataMock = jest.fn();
    listMock = jest.fn();
    downloadMock = jest.fn((locator: string) =>
      Promise.resolve({
        stream: Readable.from([Buffer.from(`content:${locator}`)]),
      }),
    );
    uploadMock = jest.fn((_parent, fileName, stream: Readable) =>
      pipeline(
        stream,
        new Writable({
          write(_chunk, _encoding, callback) {
            callback();
          },
        }),
      ).then(() => ({
        path: fileName,
        name: fileName,
        type: 'file' as const,
        size: 10,
        updatedAt: '2024-01-01',
      })),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        ...storageTestProviders(createTestStorageConfig(TEST_STORAGE_ROOT)),
        {
          provide: STORAGE_ADAPTER,
          useValue: {
            forUser: jest.fn(() =>
              createStorageOperationsMock({
                getMetadata: getMetadataMock,
                list: listMock,
                download: downloadMock,
                upload: uploadMock,
              }),
            ),
          } satisfies UnifiedStorageAdapter,
        },
      ],
    }).compile();

    filesService = module.get(FilesService);
  });

  it('saves zip to parent directory with requested name', async () => {
    getMetadataMock.mockImplementation((locator: string) => {
      if (locator === 'archive.zip') {
        return Promise.reject(new NotFoundException());
      }

      return Promise.resolve(
        toFileResource(locator, 7, '2024-01-01'),
      );
    });

    const result = await filesService.compressLocatorsToZipFile(
      '',
      ['a.txt', 'b.txt'],
      'archive.zip',
      'default',
    );

    expect(result).toEqual({
      savedLocator: 'archive.zip',
      savedName: 'archive.zip',
    });
    expect(uploadMock).toHaveBeenCalledWith(
      '',
      'archive.zip',
      expect.any(Readable),
      expect.objectContaining({
        mimeType: 'application/zip',
        overwrite: false,
      }),
    );
  });

  it('uses datetime suffix when archive name already exists', async () => {
    getMetadataMock.mockImplementation((locator: string) => {
      if (locator === 'archive.zip') {
        return Promise.resolve(
          toFileResource('archive.zip', 10, '2024-01-01'),
        );
      }
      if (/^archive_\d{8}-\d{6}(?:-\d+)?\.zip$/.test(locator)) {
        return Promise.reject(new NotFoundException());
      }

      return Promise.resolve(
        toFileResource(locator, 7, '2024-01-01'),
      );
    });

    const result = await filesService.compressLocatorsToZipFile(
      '',
      ['a.txt'],
      'archive.zip',
      'default',
    );

    expect(result.savedName).toMatch(/^archive_\d{8}-\d{6}\.zip$/);
    expect(result.savedLocator).toBe(result.savedName);
    expect(uploadMock).toHaveBeenCalledWith(
      '',
      result.savedName,
      expect.any(Readable),
      expect.objectContaining({ overwrite: false }),
    );
  });

  it('expands folder locators into the zip', async () => {
    const downloadZipSpy = jest.spyOn(filesService, 'downloadZip');

    getMetadataMock.mockImplementation((locator: string) => {
      if (locator === 'archive.zip') {
        return Promise.reject(new NotFoundException());
      }
      if (locator === 'folder') {
        return Promise.resolve(toDirResource('folder', '2024-01-01'));
      }

      return Promise.resolve(
        toFileResource(locator, 7, '2024-01-01'),
      );
    });

    listMock.mockResolvedValue([
      toListEntry(toFileResource('folder/nested.txt', 7, '2024-01-01')),
    ]);

    await filesService.compressLocatorsToZipFile(
      '',
      ['folder'],
      'archive.zip',
      'default',
    );

    expect(downloadZipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        folderLocators: ['folder'],
        folderZipPaths: ['folder'],
      }),
      'default',
    );
    expect(downloadMock).toHaveBeenCalledWith('folder/nested.txt');
    expect(uploadMock).toHaveBeenCalled();

    downloadZipSpy.mockRestore();
  });

  it('preserves folder names when compressing files and folders together', async () => {
    const downloadZipSpy = jest.spyOn(filesService, 'downloadZip');

    getMetadataMock.mockImplementation((locator: string) => {
      if (locator === 'archive.zip') {
        return Promise.reject(new NotFoundException());
      }
      if (locator === 'nestfolder') {
        return Promise.resolve(toDirResource('nestfolder', '2024-01-01'));
      }

      return Promise.resolve(
        toFileResource(locator, 7, '2024-01-01'),
      );
    });

    listMock.mockImplementation((locator: string) => {
      if (locator === 'nestfolder') {
        return Promise.resolve([
          toListEntry(toFileResource('nestfolder/inner.txt', 7, '2024-01-01')),
        ]);
      }

      return Promise.resolve([]);
    });

    await filesService.compressLocatorsToZipFile(
      '',
      ['outsider1.txt', 'outsider2.txt', 'nestfolder'],
      'archive.zip',
      'default',
    );

    expect(downloadZipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        locators: ['outsider1.txt', 'outsider2.txt'],
        folderLocators: ['nestfolder'],
        folderZipPaths: ['nestfolder'],
      }),
      'default',
    );

    downloadZipSpy.mockRestore();
  });
});
