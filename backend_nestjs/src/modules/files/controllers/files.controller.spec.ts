import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { FilesController } from './files.controller';
import { FilesService } from '../services/files.service';
import { STORAGE_ADAPTER } from '../../../core/config/storage.config';
import {
  buildMockFile,
  clearDefaultStorageFixture,
  createTestStorageConfig,
  FileTemplate,
  MockFileMap,
  seedDefaultStorageFixtureNew,
  storageTestProviders,
  TEST_STORAGE_ROOT,
} from '../../../../test/helpers/storage.fixture';
import { StoragePathService } from '../../../core/services/storage-path.service';

async function readStreamableFile(file: StreamableFile): Promise<Buffer> {
  const stream = file.getStream();
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

function listZipEntries(buffer: Buffer): string {
  const tmpDir = mkdtempSync(join(tmpdir(), 'zip-test-'));
  const zipPath = join(tmpDir, 'test.zip');
  writeFileSync(zipPath, buffer);
  return execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });
}

function createUploadRequest(
  body: Buffer,
  headers: Record<string, string> = {},
): Request {
  const stream = Readable.from([body]);
  return Object.assign(stream, { headers }) as unknown as Request;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createMockResponse(): Response {
  return { set: jest.fn() } as unknown as Response;
}

describe('FilesController', () => {
  let filesController: FilesController;
  let storagePathService: StoragePathService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        FilesService,
        ...storageTestProviders(createTestStorageConfig(TEST_STORAGE_ROOT)),
        {
          provide: STORAGE_ADAPTER,
          useClass: LocalStorageAdapter,
        },
      ],
    }).compile();

    filesController = app.get<FilesController>(FilesController);
    storagePathService = app.get<StoragePathService>(StoragePathService);

    const rootDataDir = storagePathService.resolveStoragePath();
    if (existsSync(rootDataDir)) {
      clearDefaultStorageFixture(rootDataDir);
    }
    seedDefaultStorageFixtureNew(rootDataDir);
  });

  afterEach(() => {
    clearDefaultStorageFixture(storagePathService.resolveStoragePath());
  });

  describe('listFiles', () => {
    it('should return all files with full paths from storage', async () => {
      const fileTemplates: MockFileMap = buildMockFile();
      const result = await filesController.listFiles();
      const expectedFiles = Object.values(fileTemplates)
        .map((t) => t.path)
        .sort();
      expect(result.files).toEqual(expectedFiles);
    });
  });

  describe('list', () => {
    it('should return root-level entries', async () => {
      const result = await filesController.list({});
      expect(result.map((entry) => entry.path).sort()).toEqual([
        'mockfile_text_01.txt',
        'mockfile_text_02.txt',
        'mockfile_text_03.txt',
        'nestitems',
        'nestitems_add',
      ]);
    });

    it('should return entries inside a folder', async () => {
      const result = await filesController.list({ locator: 'nestitems' });
      expect(result.map((entry) => entry.path).sort()).toEqual([
        'nestitems/mockfile_textnest_01.txt',
        'nestitems/mockfile_textnest_02.txt',
      ]);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for a file', async () => {
      const fileTemplates = buildMockFile();
      const template = fileTemplates['mockfile_text_01.txt'];

      const result = await filesController.getMetadata('mockfile_text_01.txt');

      expect(result).toMatchObject({
        path: 'mockfile_text_01.txt',
        name: 'mockfile_text_01.txt',
        type: 'file',
        size: template.toBytes().length,
      });
      expect(result.updatedAt).toEqual(expect.any(String));
    });

    it('should return metadata for a folder', async () => {
      const result = await filesController.getMetadata('nestitems');

      expect(result).toMatchObject({
        path: 'nestitems',
        name: 'nestitems',
        type: 'directory',
      });
      expect(result.size).toBeUndefined();
      expect(result.updatedAt).toEqual(expect.any(String));
    });

    it('should return metadata for a nested file', async () => {
      const fileTemplates = buildMockFile();
      const template = fileTemplates['nestitems/mockfile_textnest_01.txt'];

      const result = await filesController.getMetadata(
        'nestitems/mockfile_textnest_01.txt',
      );

      expect(result).toMatchObject({
        path: 'nestitems/mockfile_textnest_01.txt',
        name: 'mockfile_textnest_01.txt',
        type: 'file',
        size: template.toBytes().length,
      });
      expect(result.updatedAt).toEqual(expect.any(String));
    });

    it('should return metadata for a nested folder', async () => {
      const result = await filesController.getMetadata(
        'nestitems_add/nestnest',
      );

      expect(result).toMatchObject({
        path: 'nestitems_add/nestnest',
        name: 'nestnest',
        type: 'directory',
      });
      expect(result.size).toBeUndefined();
      expect(result.updatedAt).toEqual(expect.any(String));
    });
  });

  describe('download', () => {
    let setHeader: jest.Mock;
    let mockRes: Response;

    beforeEach(() => {
      setHeader = jest.fn();
      mockRes = { set: setHeader } as unknown as Response;
    });

    it('should include sha256 checksum metadata', async () => {
      // const setHeader = jest.fn();
      // const mockRes = { set: setHeader } as unknown as Response;
      const file = await filesController.download(
        'mockfile_text_01.txt',
        mockRes,
      );

      expect(file).toBeInstanceOf(StreamableFile);
      await readStreamableFile(file);
      expect(setHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Checksum-Algorithm': 'sha256',
        }),
      );
    });

    it('should return stream content matching fixture', async () => {
      const fileTemplates = buildMockFile();
      const template = fileTemplates['mockfile_text_01.txt'];
      // const mockRes = { set: jest.fn() } as unknown as Response;

      const file = await filesController.download(
        'mockfile_text_01.txt',
        mockRes,
      );
      const buffer = await readStreamableFile(file);

      expect(buffer).toEqual(template.toBytes());
    });
  });

  describe('downloadZip', () => {
    let mockRes: Response;
    let setHeader: jest.Mock;

    beforeEach(() => {
      // mockRes = createMockResponse();
      setHeader = jest.fn();
      mockRes = { set: setHeader } as unknown as Response;
    });

    it('should include sha256 checksum metadata', async () => {
      // setHeader = mockRes.set as jest.Mock;
      // setHeader = jest.fn();
      const file = await filesController.downloadZip(
        {
          locators: ['mockfile_text_01.txt'],
          archiveName: 'download.zip',
        },
        mockRes,
      );

      expect(file).toBeInstanceOf(StreamableFile);
      const buffer = await readStreamableFile(file);
      expect(setHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Checksum-Algorithm': 'sha256',
          'X-Checksum-Value': createHash('sha256').update(buffer).digest('hex'),
        }),
      );
    });

    it('should return a valid ZIP containing the requested files', async () => {
      const file = await filesController.downloadZip(
        {
          locators: [
            'mockfile_text_01.txt',
            'nestitems/mockfile_textnest_01.txt',
          ],
          archiveName: 'download.zip',
        },
        mockRes,
      );

      expect(file).toBeInstanceOf(StreamableFile);

      const buffer = await readStreamableFile(file);
      expect(buffer.subarray(0, 4).toString()).toBe('PK\x03\x04');
    });

    it('should default archiveName to archive.zip', async () => {
      const file = await filesController.downloadZip(
        {
          locators: ['mockfile_text_01.txt'],
        },
        mockRes,
      );

      expect(file.getHeaders().disposition).toContain('archive.zip');
    });

    it('should place entries at custom zipPaths inside the archive', async () => {
      const file = await filesController.downloadZip(
        {
          locators: [
            'mockfile_text_01.txt',
            'nestitems/mockfile_textnest_01.txt',
          ],
          zipPaths: [
            'custom/mockfile_text_01.txt',
            'nested/mockfile_textnest_01.txt',
          ],
        },
        mockRes,
      );

      const buffer = await readStreamableFile(file);
      const listing = listZipEntries(buffer);

      expect(listing).toContain('custom/mockfile_text_01.txt');
      expect(listing).toContain('nested/mockfile_textnest_01.txt');
    });

    it('should return a valid ZIP containing all files from a folder', async () => {
      const file = await filesController.downloadZip(
        {
          folderLocators: ['nestitems'],
        },
        mockRes,
      );

      expect(file).toBeInstanceOf(StreamableFile);

      const buffer = await readStreamableFile(file);
      expect(buffer.subarray(0, 4).toString()).toBe('PK\x03\x04');

      const listing = listZipEntries(buffer);
      expect(listing).toContain('mockfile_textnest_01.txt');
      expect(listing).toContain('mockfile_textnest_02.txt');
    });

    it('should place folder entries under custom folderZipPaths prefixes', async () => {
      const file = await filesController.downloadZip(
        {
          folderLocators: ['nestitems'],
          folderZipPaths: ['export/nestitems'],
        },
        mockRes,
      );

      const buffer = await readStreamableFile(file);
      const listing = listZipEntries(buffer);

      expect(listing).toContain('export/nestitems/mockfile_textnest_01.txt');
      expect(listing).toContain('export/nestitems/mockfile_textnest_02.txt');
    });

    it('should combine file locators and folder locators in one archive', async () => {
      const file = await filesController.downloadZip(
        {
          locators: ['mockfile_text_01.txt'],
          folderLocators: ['nestitems'],
        },
        mockRes,
      );

      const buffer = await readStreamableFile(file);
      const listing = listZipEntries(buffer);

      expect(listing).toContain('mockfile_text_01.txt');
      expect(listing).toContain('mockfile_textnest_01.txt');
      expect(listing).toContain('mockfile_textnest_02.txt');
    });

    it('should reject folderZipPaths length mismatch', async () => {
      await expect(
        filesController.downloadZip(
          {
            folderLocators: ['nestitems', 'nestitems'],
            folderZipPaths: ['only-one-prefix'],
          },
          mockRes,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file locators in folderLocators', async () => {
      await expect(
        filesController.downloadZip(
          {
            folderLocators: ['mockfile_text_01.txt'],
          },
          mockRes,
        ),
      ).rejects.toThrow(new BadRequestException('Not a directory'));
    });

    it('should reject zipPaths length mismatch', async () => {
      await expect(
        filesController.downloadZip(
          {
            locators: ['mockfile_text_01.txt', 'mockfile_text_02.txt'],
            zipPaths: ['only-one.txt'],
          },
          mockRes,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject directory locators', async () => {
      await expect(
        filesController.downloadZip(
          {
            locators: ['nestitems'],
          },
          mockRes,
        ),
      ).rejects.toThrow(new BadRequestException('Not a file'));
    });

    it('should reject missing locators', async () => {
      await expect(
        filesController.downloadZip(
          {
            locators: ['does-not-exist.txt'],
          },
          mockRes,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('copy', () => {
    it('should copy a file to a new path', async () => {
      const destinationLocator = `mockfile-copy-${Date.now()}.txt`;
      const result = await filesController.copy({
        sourceLocator: 'mockfile_text_01.txt',
        destinationLocator,
      });

      expect(result).toMatchObject({
        path: destinationLocator,
        name: destinationLocator,
        type: 'file',
      });
      expect(result.size).toBeGreaterThan(0);

      const rootEntries = await filesController.list({});
      expect(rootEntries.map((entry) => entry.path)).toContain(
        destinationLocator,
      );
    });

    it('should copy a folder when recursive is true', async () => {
      const destinationLocator = `nestitems-copy-${Date.now()}`;
      const result = await filesController.copy({
        sourceLocator: 'nestitems',
        destinationLocator,
        recursive: true,
      });

      expect(result).toMatchObject({
        path: destinationLocator,
        name: destinationLocator,
        type: 'directory',
      });

      const copiedEntries = await filesController.list({
        locator: destinationLocator,
      });
      expect(copiedEntries.map((entry) => entry.path).sort()).toEqual(
        expect.arrayContaining([
          `${destinationLocator}/mockfile_textnest_01.txt`,
          `${destinationLocator}/mockfile_textnest_02.txt`,
        ]),
      );
      expect(copiedEntries).toHaveLength(2);
    });

    it('should reject folder copy without recursive', async () => {
      await expect(
        filesController.copy({
          sourceLocator: 'nestitems',
          destinationLocator: `nestitems-copy-no-recursive-${Date.now()}`,
        }),
      ).rejects.toThrow(
        new BadRequestException('Recursive copy is required for folders'),
      );
    });

    it('should reject copy when destination exists without overwrite', async () => {
      await expect(
        filesController.copy({
          sourceLocator: 'mockfile_text_01.txt',
          destinationLocator: 'mockfile_text_02.txt',
        }),
      ).rejects.toThrow(new ConflictException('File already exists'));
    });
  });

  describe('move', () => {
    it('should move a file to a new path', async () => {
      const sourceLocator = `move-src-${Date.now()}.txt`;
      await filesController.copy({
        sourceLocator: 'mockfile_text_01.txt',
        destinationLocator: sourceLocator,
      });

      const destinationLocator = `move-dest-${Date.now()}.txt`;
      const result = await filesController.move({
        sourceLocator,
        destinationLocator,
      });

      expect(result).toMatchObject({
        path: destinationLocator,
        name: destinationLocator,
        type: 'file',
      });
      expect(result.size).toBeGreaterThan(0);

      const rootEntries = await filesController.list({});
      expect(rootEntries.map((entry) => entry.path)).toContain(
        destinationLocator,
      );
      expect(rootEntries.map((entry) => entry.path)).not.toContain(
        sourceLocator,
      );
    });

    it('should move a folder when recursive is true', async () => {
      const sourceLocator = `nestitems-move-src-${Date.now()}`;
      await filesController.copy({
        sourceLocator: 'nestitems',
        destinationLocator: sourceLocator,
        recursive: true,
      });

      const destinationLocator = `nestitems-move-dest-${Date.now()}`;
      const result = await filesController.move({
        sourceLocator,
        destinationLocator,
        recursive: true,
      });

      expect(result).toMatchObject({
        path: destinationLocator,
        name: destinationLocator,
        type: 'directory',
      });

      const movedEntries = await filesController.list({
        locator: destinationLocator,
      });
      expect(movedEntries.map((entry) => entry.path).sort()).toEqual(
        expect.arrayContaining([
          `${destinationLocator}/mockfile_textnest_01.txt`,
          `${destinationLocator}/mockfile_textnest_02.txt`,
        ]),
      );
      expect(movedEntries).toHaveLength(2);

      const rootEntries = await filesController.list({});
      expect(rootEntries.map((entry) => entry.path)).not.toContain(
        sourceLocator,
      );
    });

    it('should reject folder move without recursive', async () => {
      const sourceLocator = `nestitems-move-no-recursive-src-${Date.now()}`;
      await filesController.copy({
        sourceLocator: 'nestitems',
        destinationLocator: sourceLocator,
        recursive: true,
      });

      await expect(
        filesController.move({
          sourceLocator,
          destinationLocator: `nestitems-move-no-recursive-dest-${Date.now()}`,
        }),
      ).rejects.toThrow(
        new BadRequestException('Recursive move is required for folders'),
      );
    });

    it('should reject move when destination exists without overwrite', async () => {
      const sourceLocator = `move-conflict-src-${Date.now()}.txt`;
      await filesController.copy({
        sourceLocator: 'mockfile_text_01.txt',
        destinationLocator: sourceLocator,
      });

      await expect(
        filesController.move({
          sourceLocator,
          destinationLocator: 'mockfile_text_02.txt',
        }),
      ).rejects.toThrow(new ConflictException('File already exists'));
    });
  });

  describe('createFolder', () => {
    it('should create a folder', async () => {
      const folderName = `new-folder-${Date.now()}`;

      const result = await filesController.createFolder({
        parentLocator: '',
        folderName,
      });

      expect(result).toMatchObject({
        path: folderName,
        name: folderName,
        type: 'directory',
      });

      const rootEntries = await filesController.list({});
      expect(rootEntries.map((entry) => entry.path)).toContain(folderName);
    });

    it('should reject duplicate folder creation', async () => {
      const folderName = `duplicate-folder-${Date.now()}`;

      await filesController.createFolder({
        parentLocator: '',
        folderName,
      });

      await expect(
        filesController.createFolder({
          parentLocator: '',
          folderName,
        }),
      ).rejects.toThrow(new ConflictException('Folder already exists'));
    });

    it('should reject folder creation when a file with the same name exists', async () => {
      await expect(
        filesController.createFolder({
          parentLocator: '',
          folderName: 'mockfile_text_01.txt',
        }),
      ).rejects.toThrow(new ConflictException('Folder already exists'));
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      await filesController.delete('mockfile_text_01.txt');

      const rootEntries = await filesController.list({});
      expect(rootEntries.map((entry) => entry.path)).not.toContain(
        'mockfile_text_01.txt',
      );
      await expect(
        filesController.getMetadata('mockfile_text_01.txt'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete a folder recursively', async () => {
      await filesController.delete('nestitems');

      const rootEntries = await filesController.list({});
      expect(rootEntries.map((entry) => entry.path)).not.toContain('nestitems');
      await expect(
        filesController.list({ locator: 'nestitems' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        filesController.getMetadata('nestitems/mockfile_textnest_01.txt'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject delete when path does not exist', async () => {
      await expect(filesController.delete('not_a_resource')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upload', () => {
    it('should upload a file', async () => {
      const fileTemplate = new FileTemplate(
        'upload_text_01.txt',
        'my upload text',
        'utf16le',
      );
      const bytes = fileTemplate.toBytes();

      const result = await filesController.upload(
        {
          locator: '',
          fileName: fileTemplate.basename,
          size: bytes.length,
          checksumAlgorithm: 'sha256',
          checksumValue: createHash('sha256').update(bytes).digest('hex'),
          overwrite: false,
        },
        createUploadRequest(bytes),
      );

      expect(result).toMatchObject({
        path: fileTemplate.path,
        name: fileTemplate.basename,
        type: 'file',
        size: bytes.length,
      });

      const mockRes = { set: jest.fn() } as unknown as Response;
      const file = await filesController.download(fileTemplate.path, mockRes);
      const downloaded = await readStreamableFile(file);
      expect(downloaded).toEqual(bytes);
    });

    it('should upload with overwrite', async () => {
      const fileTemplate = new FileTemplate(
        'mockfile_text_01.txt',
        'my upload text',
        'utf16le',
      );
      const bytes = fileTemplate.toBytes();

      const result = await filesController.upload(
        {
          locator: '',
          fileName: fileTemplate.basename,
          size: bytes.length,
          checksumAlgorithm: 'sha256',
          checksumValue: createHash('sha256').update(bytes).digest('hex'),
          overwrite: true,
        },
        createUploadRequest(bytes),
      );

      expect(result).toMatchObject({
        path: fileTemplate.path,
        name: fileTemplate.basename,
        type: 'file',
        size: bytes.length,
      });

      const mockRes = { set: jest.fn() } as unknown as Response;
      const file = await filesController.download(fileTemplate.path, mockRes);
      const downloaded = await readStreamableFile(file);
      expect(downloaded).toEqual(bytes);
    });

    it('should reject upload without overwrite when file exists', async () => {
      const fileTemplates = buildMockFile();
      const fileTemplate = new FileTemplate(
        'mockfile_text_01.txt',
        'my upload text',
        'utf16le',
      );
      const bytes = fileTemplate.toBytes();

      await expect(
        filesController.upload(
          {
            locator: '',
            fileName: fileTemplate.basename,
            size: bytes.length,
            checksumAlgorithm: 'sha256',
            checksumValue: createHash('sha256').update(bytes).digest('hex'),
            overwrite: false,
          },
          createUploadRequest(bytes),
        ),
      ).rejects.toThrow(ConflictException);

      const mockRes = { set: jest.fn() } as unknown as Response;
      const file = await filesController.download(fileTemplate.path, mockRes);
      const downloaded = await readStreamableFile(file);
      expect(downloaded).toEqual(
        fileTemplates['mockfile_text_01.txt'].toBytes(),
      );
    });
  });
});
