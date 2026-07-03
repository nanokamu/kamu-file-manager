import { mkdtempSync, writeFileSync } from 'fs';
import { INestApplication } from '@nestjs/common';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { apiPath } from './api-path';

const TEST_JWT_SECRET = 'test-jwt-secret';

export const TEST_USER = {
  id: 'test_user',
  username: 'tester',
  password: 'test-password',
  displayName: 'Test User',
};

export async function createTestUsersConfig(
  rootDir: string,
): Promise<{ configPath: string; passwordHash: string }> {
  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const configPath = join(rootDir, 'users.json');

  writeFileSync(
    configPath,
    JSON.stringify([
      {
        id: TEST_USER.id,
        username: TEST_USER.username,
        passwordHash,
        displayName: TEST_USER.displayName,
      },
    ]),
  );

  return { configPath, passwordHash };
}

export function createTestUsersTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'users-e2e-'));
}

export function createTestAuthEnv(
  configPath: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    JWT_SECRET: TEST_JWT_SECRET,
    JWT_EXPIRES_IN: '1h',
    USERS_CONFIG_PATH: configPath,
  };
}

export async function loginForTest(
  app: INestApplication<App>,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post(apiPath('/auth/login'))
    .send({ username: TEST_USER.username, password: TEST_USER.password })
    .expect(200);

  return response.body.accessToken as string;
}
