import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/configure-app';
import { AppModule } from './../src/app.module';
import { apiPath } from './helpers/api-path';

describe('AddonController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/addonDownloadAsZip (POST)', () => {
    return request(app.getHttpServer())
      .post(apiPath('/addonDownloadAsZip'))
      .send({
        locators: ['a.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
      })
      .expect(201)
      .expect({
        status: 'ok',
        message: 'addonDownloadAsZip dummy endpoint',
        locators: ['a.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
      });
  });

  it('/api/addonDownloadAsZip (POST) with custom archive options', () => {
    return request(app.getHttpServer())
      .post(apiPath('/addonDownloadAsZip'))
      .send({
        locators: ['docs/readme.txt'],
        archiveName: 'bundle.zip',
        archiveType: 'tar',
      })
      .expect(201)
      .expect({
        status: 'ok',
        message: 'addonDownloadAsZip dummy endpoint',
        locators: ['docs/readme.txt'],
        archiveName: 'bundle.zip',
        archiveType: 'tar',
      });
  });

  describe('validation', () => {
    it('returns 400 when archiveName is missing', () => {
      return request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .send({ locators: ['a.txt'], archiveType: 'zip' })
        .expect(400);
    });

    it('returns 400 when archiveType is missing', () => {
      return request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .send({ locators: ['a.txt'], archiveName: 'archive.zip' })
        .expect(400);
    });

    it('returns 400 when archiveType is invalid', () => {
      return request(app.getHttpServer())
        .post(apiPath('/addonDownloadAsZip'))
        .send({
          locators: ['a.txt'],
          archiveName: 'x.zip',
          archiveType: 'rar',
        })
        .expect(400);
    });
  });
});
