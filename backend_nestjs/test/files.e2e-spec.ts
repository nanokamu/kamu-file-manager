import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { STORAGE_CONFIG } from '../src/core/config/storage.config';
import { StoragePathService } from '../src/core/services/storage-path.service';
import { AppModule } from '../src/app.module';
import { UnifiedResource } from '../src/modules/files/interfaces/resource.interface';
import { apiPath } from './helpers/api-path';
import {
  buildMockFile,
  clearDefaultStorageFixture,
  createTestStorageConfig,
  seedDefaultStorageFixtureNew,
  TEST_STORAGE_ROOT,
} from './helpers/storage.fixture';

function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

describe('FilesController (e2e)', () => {
  let app: INestApplication<App>;
  let storagePathService: StoragePathService;
  let rootDataDir: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STORAGE_CONFIG)
      .useValue(createTestStorageConfig(TEST_STORAGE_ROOT))
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    storagePathService = moduleFixture.get(StoragePathService);
    rootDataDir = storagePathService.resolveStoragePath();

    if (existsSync(rootDataDir)) {
      clearDefaultStorageFixture(rootDataDir);
    }
    seedDefaultStorageFixtureNew(rootDataDir);
  });

  afterEach(async () => {
    clearDefaultStorageFixture(rootDataDir);
    await app.close();
  });

  describe('GET /api/filelist', () => {
    it('lists all fixture files', async () => {
      const expectedFiles = Object.values(buildMockFile())
        .map((template) => template.path)
        .sort();

      const response = await request(app.getHttpServer()).get(
        apiPath('/filelist'),
      );
      const body = response.body as { files: string[] };

      expect(response.status).toBe(200);
      expect([...body.files].sort()).toEqual(expectedFiles);
    });
  });

  describe('GET /api/files', () => {
    it('returns root-level entries', async () => {
      const response = await request(app.getHttpServer()).get(
        apiPath('/files'),
      );
      const body = response.body as UnifiedResource[];

      expect(response.status).toBe(200);
      expect(body.map((entry) => entry.path).sort()).toEqual(
        expect.arrayContaining([
          'mockfile_text_01.txt',
          'mockfile_text_02.txt',
          'mockfile_text_03.txt',
          'nestitems',
          'nestitems_add',
        ]),
      );
    });

    it('returns nested entries when locator is provided', async () => {
      const response = await request(app.getHttpServer())
        .get(apiPath('/files'))
        .query({
          locator: 'nestitems',
        });
      const body = response.body as UnifiedResource[];

      expect(response.status).toBe(200);
      expect(body.map((entry) => entry.path).sort()).toEqual([
        'nestitems/mockfile_textnest_01.txt',
        'nestitems/mockfile_textnest_02.txt',
      ]);
    });
  });

  describe('GET /api/files/metadata', () => {
    it('returns metadata for a file', async () => {
      const response = await request(app.getHttpServer())
        .get(apiPath('/files/metadata'))
        .query({ locator: 'mockfile_text_01.txt' });
      const body = response.body as UnifiedResource;

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        path: 'mockfile_text_01.txt',
        name: 'mockfile_text_01.txt',
        type: 'file',
      });
      expect(body.size).toBeGreaterThan(0);
      expect(body.updatedAt).toBeDefined();
    });

    it('returns 404 when locator does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get(apiPath('/files/metadata'))
        .query({ locator: 'missing-file.txt' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/files/download', () => {
    it('returns file bytes and checksum headers', async () => {
      const template = buildMockFile()['mockfile_text_01.txt'];

      const response = await request(app.getHttpServer())
        .get(apiPath('/files/download'))
        .query({ locator: 'mockfile_text_01.txt' })
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
      expect(response.headers['x-checksum-algorithm']).toBe('sha256');
      expect(response.headers['x-checksum-value']).toBeDefined();
      expect(Buffer.from(response.body as Buffer)).toEqual(template.toBytes());
    });
  });

  describe('POST /api/files/download/zip', () => {
    it('returns a valid zip archive', async () => {
      const response = await request(app.getHttpServer())
        .post(apiPath('/files/download/zip'))
        .send({
          locators: [
            'mockfile_text_01.txt',
            'nestitems/mockfile_textnest_01.txt',
          ],
          archiveName: 'download.zip',
        })
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/zip/);
      expect(isZipBuffer(Buffer.from(response.body as Buffer))).toBe(true);
    });
  });

  describe('POST /api/files/upload', () => {
    it('uploads a file and allows downloading it', async () => {
      const fileName = 'upload_test.txt';
      const bytes = Buffer.from('my upload text', 'utf8');
      const checksumValue = createHash('sha256').update(bytes).digest('hex');

      const uploadResponse = await request(app.getHttpServer())
        .post(apiPath('/files/upload'))
        .query({
          locator: '',
          fileName,
          size: bytes.length,
          checksumAlgorithm: 'sha256',
          checksumValue,
        })
        .set('Content-Type', 'application/octet-stream')
        .send(bytes);

      expect(uploadResponse.status).toBe(201);
      expect(uploadResponse.body).toMatchObject({
        path: fileName,
        name: fileName,
        type: 'file',
        size: bytes.length,
      });

      const downloadResponse = await request(app.getHttpServer())
        .get(apiPath('/files/download'))
        .query({ locator: fileName })
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(downloadResponse.status).toBe(200);
      expect(Buffer.from(downloadResponse.body as Buffer)).toEqual(bytes);
    });

    it('returns 400 when required upload query params are missing', async () => {
      const bytes = Buffer.from('invalid upload', 'utf8');

      const response = await request(app.getHttpServer())
        .post(apiPath('/files/upload'))
        .query({
          locator: '',
          fileName: 'invalid_upload.txt',
          size: bytes.length,
        })
        .set('Content-Type', 'application/octet-stream')
        .send(bytes);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/files/folders', () => {
    it('creates a folder visible in listing', async () => {
      const folderName = `new-folder-${Date.now()}`;

      const createResponse = await request(app.getHttpServer())
        .post(apiPath('/files/folders'))
        .send({
          parentLocator: '',
          folderName,
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toMatchObject({
        path: folderName,
        name: folderName,
        type: 'directory',
      });

      const listResponse = await request(app.getHttpServer()).get(
        apiPath('/files'),
      );
      const listBody = listResponse.body as UnifiedResource[];

      expect(listResponse.status).toBe(200);
      expect(listBody.map((entry) => entry.path)).toContain(folderName);
    });

    it('returns 409 when folder already exists', async () => {
      const folderName = `duplicate-folder-${Date.now()}`;

      await request(app.getHttpServer())
        .post(apiPath('/files/folders'))
        .send({
          parentLocator: '',
          folderName,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(apiPath('/files/folders'))
        .send({
          parentLocator: '',
          folderName,
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/files/copy', () => {
    it('copies a file to a new path', async () => {
      const destinationLocator = `mockfile-copy-${Date.now()}.txt`;

      const copyResponse = await request(app.getHttpServer())
        .post(apiPath('/files/copy'))
        .send({
          sourceLocator: 'mockfile_text_01.txt',
          destinationLocator,
        });

      expect(copyResponse.status).toBe(201);
      expect(copyResponse.body).toMatchObject({
        path: destinationLocator,
        name: destinationLocator,
        type: 'file',
      });

      const metadataResponse = await request(app.getHttpServer())
        .get(apiPath('/files/metadata'))
        .query({ locator: destinationLocator });

      expect(metadataResponse.status).toBe(200);
    });
  });

  describe('POST /api/files/move', () => {
    it('moves a file to a new path', async () => {
      const sourceLocator = `move-src-${Date.now()}.txt`;
      const destinationLocator = `move-dest-${Date.now()}.txt`;

      await request(app.getHttpServer())
        .post(apiPath('/files/copy'))
        .send({
          sourceLocator: 'mockfile_text_01.txt',
          destinationLocator: sourceLocator,
        })
        .expect(201);

      const moveResponse = await request(app.getHttpServer())
        .post(apiPath('/files/move'))
        .send({
          sourceLocator,
          destinationLocator,
        });

      expect(moveResponse.status).toBe(201);
      expect(moveResponse.body).toMatchObject({
        path: destinationLocator,
        name: destinationLocator,
        type: 'file',
      });

      await request(app.getHttpServer())
        .get(apiPath('/files/metadata'))
        .query({ locator: destinationLocator })
        .expect(200);

      await request(app.getHttpServer())
        .get(apiPath('/files/metadata'))
        .query({ locator: sourceLocator })
        .expect(404);
    });
  });

  describe('DELETE /api/files', () => {
    it('deletes a file', async () => {
      const deleteResponse = await request(app.getHttpServer())
        .delete(apiPath('/files'))
        .query({ locator: 'mockfile_text_01.txt' });

      expect(deleteResponse.status).toBe(200);

      const metadataResponse = await request(app.getHttpServer())
        .get(apiPath('/files/metadata'))
        .query({ locator: 'mockfile_text_01.txt' });

      expect(metadataResponse.status).toBe(404);
    });
  });
});
