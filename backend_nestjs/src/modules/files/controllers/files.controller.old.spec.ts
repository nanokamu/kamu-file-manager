import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { execSync } from 'child_process';
// import { createHash } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Response } from 'express';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { FilesController } from './files.controller';
import { FilesService } from '../services/files.service';
import { STORAGE_ADAPTER } from '../../../core/config/storage.config';
import {
  createTestStorageConfig,
  seedDefaultStorageFixture,
  storageTestProviders,
} from '../../../../test/helpers/storage.fixture';

async function readStreamableFile(file: StreamableFile): Promise<Buffer> {
  const stream = file.getStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    // chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    // chunks.push(Buffer.from(chunk as string | Uint8Array));

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

function createMockResponse(): Response {
  return { set: jest.fn() } as unknown as Response;
}

describe('FilesController', () => {
  let filesController: FilesController;
  let filesService: FilesService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'files-controller-'));
    const config = createTestStorageConfig(tempDir);
    seedDefaultStorageFixture(tempDir);

    const app: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        FilesService,
        ...storageTestProviders(config),
        {
          provide: STORAGE_ADAPTER,
          useClass: LocalStorageAdapter,
        },
      ],
    }).compile();

    filesController = app.get<FilesController>(FilesController);
    filesService = app.get<FilesService>(FilesService);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('listFiles', () => {
    it('should return all files with full paths from storage', async () => {
      const result = await filesController.listFiles();
      expect(result.files).toEqual([
        'nestitems/textnest1.txt',
        'nestitems/textnest2.txt',
        'text1.txt',
        'text2.txt',
        'text3.txt',
      ]);
    });
  });

  describe('list', () => {
    it('should return root-level entries', async () => {
      const result = await filesController.list({});
      expect(result.map((entry) => entry.path).sort()).toEqual([
        'nestitems',
        'text1.txt',
        'text2.txt',
        'text3.txt',
      ]);
    });

    it('should return entries inside a folder', async () => {
      const result = await filesController.list({ locator: 'nestitems' });
      expect(result.map((entry) => entry.path).sort()).toEqual([
        'nestitems/textnest1.txt',
        'nestitems/textnest2.txt',
        'nestitems/video',
      ]);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for a file', async () => {
      const result = await filesController.getMetadata('text1.txt');
      expect(result).toMatchObject({
        path: 'text1.txt',
        name: 'text1.txt',
        type: 'file',
      });
      expect(result.size).toBeGreaterThan(0);
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(new Date(result.updatedAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('download', () => {
    it('should include sha256 checksum metadata', async () => {
      const setHeader = jest.fn();
      const mockRes = { set: setHeader } as unknown as Response;
      const file = await filesController.download('text1.txt', mockRes);

      expect(file).toBeInstanceOf(StreamableFile);
      await readStreamableFile(file);
      expect(setHeader).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Checksum-Algorithm': 'sha256',
        }),
      );
    });
  });

  describe('downloadZip', () => {
    let mockRes: Response;

    beforeEach(() => {
      mockRes = createMockResponse();
    });

    it('should return a valid ZIP containing the requested files', async () => {
      const file = await filesController.downloadZip(
        {
          locators: ['text1.txt', 'nestitems/textnest1.txt'],
          archiveName: 'download.zip',
        },
        mockRes,
      );

      expect(file).toBeInstanceOf(StreamableFile);

      const buffer = await readStreamableFile(file);
      expect(buffer.subarray(0, 4).toString()).toBe('PK\x03\x04');
    });

    it('should default archiveName to archive.zip', async () => {
      const result = await filesService.downloadZip({
        locators: ['text1.txt'],
      });

      expect(result.archiveName).toBe('archive.zip');
    });

    it('should place entries at custom zipPaths inside the archive', async () => {
      const file = await filesController.downloadZip(
        {
          locators: ['text1.txt', 'nestitems/textnest1.txt'],
          zipPaths: ['custom/text1.txt', 'nested/textnest1.txt'],
        },
        mockRes,
      );

      const buffer = await readStreamableFile(file);
      const listing = listZipEntries(buffer);

      expect(listing).toContain('custom/text1.txt');
      expect(listing).toContain('nested/textnest1.txt');
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
      expect(listing).toContain('textnest1.txt');
      expect(listing).toContain('textnest2.txt');
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

      expect(listing).toContain('export/nestitems/textnest1.txt');
      expect(listing).toContain('export/nestitems/textnest2.txt');
    });

    it('should combine file locators and folder locators in one archive', async () => {
      const file = await filesController.downloadZip(
        {
          locators: ['text1.txt'],
          folderLocators: ['nestitems'],
        },
        mockRes,
      );

      const buffer = await readStreamableFile(file);
      const listing = listZipEntries(buffer);

      expect(listing).toContain('text1.txt');
      expect(listing).toContain('textnest1.txt');
      expect(listing).toContain('textnest2.txt');
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
            folderLocators: ['text1.txt'],
          },
          mockRes,
        ),
      ).rejects.toThrow(new BadRequestException('Not a directory'));
    });

    it('should reject zipPaths length mismatch', async () => {
      await expect(
        filesController.downloadZip(
          {
            locators: ['text1.txt', 'text2.txt'],
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
      const destinationLocator = `text1-copy-${Date.now()}.txt`;
      const result = await filesController.copy({
        sourceLocator: 'text1.txt',
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
          `${destinationLocator}/textnest1.txt`,
          `${destinationLocator}/textnest2.txt`,
          `${destinationLocator}/video`,
        ]),
      );
      expect(copiedEntries).toHaveLength(3);
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
          sourceLocator: 'text1.txt',
          destinationLocator: 'text2.txt',
        }),
      ).rejects.toThrow(new ConflictException('File already exists'));
    });
  });

  describe('move', () => {
    it('should move a file to a new path', async () => {
      const sourceLocator = `move-src-${Date.now()}.txt`;
      await filesController.copy({
        sourceLocator: 'text1.txt',
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
          `${destinationLocator}/textnest1.txt`,
          `${destinationLocator}/textnest2.txt`,
          `${destinationLocator}/video`,
        ]),
      );
      expect(movedEntries).toHaveLength(3);

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
        sourceLocator: 'text1.txt',
        destinationLocator: sourceLocator,
      });

      await expect(
        filesController.move({
          sourceLocator,
          destinationLocator: 'text2.txt',
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
          folderName: 'text1.txt',
        }),
      ).rejects.toThrow(new ConflictException('Folder already exists'));
    });
  });
});
