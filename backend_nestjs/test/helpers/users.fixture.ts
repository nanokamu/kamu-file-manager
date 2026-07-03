import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as bcrypt from 'bcrypt';

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
