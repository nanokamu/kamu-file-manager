import { readFileSync } from 'fs';
import { isAbsolute, join } from 'path';
import { isValidUserIdForStoragePath } from '../../../shared/utils/user-id.util';
import bundledUsersConfig from './users.default.json';
import type { UserConfigEntry, UsersConfig } from './users.types';

export const USERS_CONFIG_PATH = 'USERS_CONFIG_PATH';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export function resolveUsersConfigPath(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const configuredPath = env.USERS_CONFIG_PATH?.trim();
  if (!configuredPath) {
    return undefined;
  }

  return isAbsolute(configuredPath)
    ? configuredPath
    : join(process.cwd(), configuredPath);
}

export function loadUsersConfig(
  env: NodeJS.ProcessEnv = process.env,
): UsersConfig {
  const configPath = resolveUsersConfigPath(env);

  if (!configPath) {
    return validateUsersConfig(bundledUsersConfig as UsersConfig);
  }

  const raw = readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return validateUsersConfig(parsed);
}

export function validateUsersConfig(config: unknown): UsersConfig {
  if (!Array.isArray(config) || config.length === 0) {
    throw new Error('Users config must be a non-empty array');
  }

  const ids = new Set<string>();
  const usernames = new Set<string>();
  const validated: UserConfigEntry[] = [];

  for (const entry of config) {
    const user = entry as Partial<UserConfigEntry>;

    if (
      typeof user.id !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.passwordHash !== 'string' ||
      typeof user.displayName !== 'string'
    ) {
      throw new Error(
        'Each user entry must include id, username, passwordHash, and displayName',
      );
    }

    if (!isValidUserIdForStoragePath(user.id)) {
      throw new Error(`Invalid user id: "${user.id}"`);
    }

    if (!BCRYPT_HASH_PATTERN.test(user.passwordHash)) {
      throw new Error(`Invalid passwordHash for user "${user.id}"`);
    }

    if (ids.has(user.id)) {
      throw new Error(`Duplicate user id: "${user.id}"`);
    }

    if (usernames.has(user.username)) {
      throw new Error(`Duplicate username: "${user.username}"`);
    }

    ids.add(user.id);
    usernames.add(user.username);
    validated.push({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
    });
  }

  return validated;
}
