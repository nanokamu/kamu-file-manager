import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/configure-app';
import { AppModule } from './../src/app.module';
import { STORAGE_CONFIG } from '../src/core/config/storage.config';
import { StoragePathService } from '../src/core/services/storage-path.service';
import { ADDON_ENVELOPE_CONTENT_TYPE } from '../src/modules/addon/config/addon.constants';
import { ReturnStatus } from '../src/modules/addon/config/addon.types';
import { parseEnvelope } from '../src/modules/addon/utils/addon-envelope.util';
import { apiPath } from './helpers/api-path';
import {
  buildMockFile,
  clearDefaultStorageFixture,
  createTestStorageConfig,
  seedDefaultStorageFixtureNew,
  TEST_STORAGE_ROOT,
} from './helpers/storage.fixture';
import {
  createTestAuthEnv,
  createTestUsersConfig,
  createTestUsersTempDir,
  loginForTest,
} from './helpers/users.fixture';

function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

async function fetchEnvelope(
  app: INestApplication<App>,
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
): Promise<{
  status: number;
  contentType: string | undefined;
  contentLength: string | undefined;
  buffer: Buffer;
}> {
  const response = await request(app.getHttpServer())
    .post(apiPath(path))
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body)
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

  return {
    status: response.status,
    contentType: response.headers['content-type'],
    contentLength: response.headers['content-length'],
    buffer: response.body as Buffer,
  };
}

describe('AddonController (e2e)', () => {
  let app: INestApplication<App>;
  let rootDataDir: string;
  let accessToken: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = createTestUsersTempDir();
    const { configPath } = await createTestUsersConfig(tempDir);
    const testEnv = createTestAuthEnv(configPath);
    process.env.JWT_SECRET = testEnv.JWT_SECRET!;
    process.env.JWT_EXPIRES_IN = testEnv.JWT_EXPIRES_IN!;
    process.env.USERS_CONFIG_PATH = configPath;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STORAGE_CONFIG)
      .useValue(createTestStorageConfig(TEST_STORAGE_ROOT))
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    accessToken = await loginForTest(app);

    const storagePathService = moduleFixture.get(StoragePathService);
    rootDataDir = storagePathService.resolveStoragePath();

    if (existsSync(rootDataDir)) {
      clearDefaultStorageFixture(rootDataDir);
    }
    seedDefaultStorageFixtureNew(rootDataDir);
  });

  afterEach(async () => {
    delete process.env.USERS_CONFIG_PATH;
    delete process.env.JWT_SECRET;
    clearDefaultStorageFixture(rootDataDir);
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .post(apiPath('/addonDownloadAsZip'))
      .send({
        locators: ['mockfile_text_01.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
        currentFolderLocator: '',
      })
      .expect(401);
  });

  it('/api/addonDownloadAsZip (POST) returns envelope with zip payload', async () => {
    const { status, contentType, contentLength, buffer } = await fetchEnvelope(
      app,
      accessToken,
      '/addonDownloadAsZip',
      {
        locators: ['mockfile_text_01.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
        currentFolderLocator: '',
      },
    );

    expect(status).toBe(200);
    expect(contentType).toBe(ADDON_ENVELOPE_CONTENT_TYPE);
    expect(contentLength).toBe(String(buffer.length));

    const { meta, fileBytes } = parseEnvelope(buffer);
    expect(meta.status).toBe(ReturnStatus.Ok);
    expect(meta.filename).toBe('archive.zip');
    expect(meta.mimeType).toBe('application/octet-stream');
    expect(isZipBuffer(fileBytes)).toBe(true);
  });

  it('/api/addonDownloadAsZip (POST) returns envelope with folder contents', async () => {
    const { status, contentType, contentLength, buffer } = await fetchEnvelope(
      app,
      accessToken,
      '/addonDownloadAsZip',
      {
        locators: ['nestitems'],
        archiveName: 'folder-archive.zip',
        archiveType: 'zip',
        currentFolderLocator: '',
      },
    );

    expect(status).toBe(200);
    expect(contentType).toBe(ADDON_ENVELOPE_CONTENT_TYPE);
    expect(contentLength).toBe(String(buffer.length));

    const { meta, fileBytes } = parseEnvelope(buffer);
    expect(meta.status).toBe(ReturnStatus.Ok);
    expect(meta.filename).toBe('folder-archive.zip');
    expect(meta.mimeType).toBe('application/octet-stream');
    expect(isZipBuffer(fileBytes)).toBe(true);
  });

  it('/api/addonCompressAsZip (POST) saves zip locally and returns JSON', async () => {
    const response = await request(app.getHttpServer())
      .post(apiPath('/addonCompressAsZip'))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        locators: ['mockfile_text_01.txt', 'mockfile_text_02.txt'],
        archiveName: 'compressed.zip',
        currentFolderLocator: '',
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      status: ReturnStatus.Ok,
      message: 'Created compressed.zip in root',
    });

    const savedPath = join(rootDataDir, 'compressed.zip');
    expect(existsSync(savedPath)).toBe(true);
    expect(isZipBuffer(readFileSync(savedPath))).toBe(true);
  });

  it('/api/addonCompressAsZip (POST) uses datetime suffix when archive exists', async () => {
    const existingPath = join(rootDataDir, 'archive.zip');
    writeFileSync(existingPath, 'existing');

    const response = await request(app.getHttpServer())
      .post(apiPath('/addonCompressAsZip'))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        locators: ['mockfile_text_01.txt'],
        archiveName: 'archive.zip',
        currentFolderLocator: '',
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ReturnStatus.Ok);
    expect(response.body.message).toMatch(
      /^Created archive_\d{8}-\d{6}\.zip in root$/,
    );

    const savedName = response.body.message
      .replace('Created ', '')
      .replace(' in root', '');
    const savedPath = join(rootDataDir, savedName);
    expect(existsSync(savedPath)).toBe(true);
    expect(isZipBuffer(readFileSync(savedPath))).toBe(true);
    expect(readFileSync(existingPath).toString()).toBe('existing');
  });

  it('/api/addonCompressAsZip (POST) rejects mixed-level locators', async () => {
    const response = await request(app.getHttpServer())
      .post(apiPath('/addonCompressAsZip'))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        locators: ['mockfile_text_01.txt', 'nestitems/mockfile_textnest_01.txt'],
        archiveName: 'mixed.zip',
        currentFolderLocator: '',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: ReturnStatus.Error,
      message: 'All locators must be in the same directory',
    });
  });

  describe('validation', () => {
    it('returns 400 when archiveName is missing', () => {
      return request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locators: ['a.txt'],
          archiveType: 'zip',
          currentFolderLocator: '',
        })
        .expect(400);
    });

    it('returns 400 when archiveType is missing', () => {
      return request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locators: ['a.txt'],
          archiveName: 'archive.zip',
          currentFolderLocator: '',
        })
        .expect(400);
    });

    it('returns 400 when archiveType is invalid', () => {
      return request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locators: ['a.txt'],
          archiveName: 'x.zip',
          archiveType: 'rar',
          currentFolderLocator: '',
        })
        .expect(400);
    });

    it('returns 400 for unsupported archive types', async () => {
      const response = await request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locators: [buildMockFile()['mockfile_text_01.txt'].path],
          archiveName: 'bundle.tar',
          archiveType: 'tar',
          currentFolderLocator: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        status: ReturnStatus.Error,
      });
    });
  });
});
