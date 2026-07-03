import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { AppModule } from '../src/app.module';
import { apiPath } from './helpers/api-path';
import {
  createTestAuthEnv,
  createTestUsersConfig,
  createTestUsersTempDir,
  loginForTest,
  TEST_USER,
} from './helpers/users.fixture';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
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
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    accessToken = await loginForTest(app);
  });

  afterEach(async () => {
    delete process.env.USERS_CONFIG_PATH;
    delete process.env.JWT_SECRET;
    await app.close();
  });

  it('GET /api/users/me returns profile when authorized', async () => {
    const response = await request(app.getHttpServer())
      .get(apiPath('/users/me'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      id: TEST_USER.id,
      username: TEST_USER.username,
      displayName: TEST_USER.displayName,
    });
  });

  it('GET /api/users/me rejects missing token', async () => {
    await request(app.getHttpServer()).get(apiPath('/users/me')).expect(401);
  });
});
