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
  TEST_USER,
} from './helpers/users.fixture';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
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
  });

  afterEach(async () => {
    delete process.env.USERS_CONFIG_PATH;
    delete process.env.JWT_SECRET;
    await app.close();
  });

  it('POST /api/auth/login returns access token for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ username: TEST_USER.username, password: TEST_USER.password })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toEqual({
      id: TEST_USER.id,
      username: TEST_USER.username,
      displayName: TEST_USER.displayName,
    });
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ username: TEST_USER.username, password: 'wrong-password' })
      .expect(401);
  });
});
