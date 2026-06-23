import { BadRequestException } from '@nestjs/common';
import { assertValidUserIdForStoragePath } from '../../shared/utils/user-id.util';

/**
 * Maps locators to user-scoped path strings (`{userId}/...`) and back.
 *
 * This operates on logical path segments, not absolute filesystem paths.
 */

/**
 * Prefixes `relativeLocator` with the user id (`{userId}/{relativeLocator}`).
 *
 * Omitted or empty locator returns the user id alone.
 */
export function resolveUserPath(
  userId: string,
  relativeLocator?: string,
): string {
  assertValidUserIdForStoragePath(userId);
  const relative = normalizeRelativeLocator(relativeLocator);
  return relative ? `${userId}/${relative}` : userId;
}

/**
 * Strips the user id prefix from `userPathLocator`.
 *
 * Returns an empty string when the locator is the user root.
 *
 * @throws BadRequestException when `userPathLocator` is not under this user.
 */
export function unresolveUserPath(
  userId: string,
  userPathLocator: string,
): string {
  assertValidUserIdForStoragePath(userId);
  const normalized = userPathLocator.replace(/\\/g, '/');

  if (normalized === userId) {
    return '';
  }

  const prefix = `${userId}/`;
  if (!normalized.startsWith(prefix)) {
    throw new BadRequestException('Invalid user path');
  }

  return normalized.slice(prefix.length);
}

/** Per-user facade over {@link resolveUserPath} and {@link unresolveUserPath}. */
export class UserPathService {
  constructor(private readonly userId: string = 'default') {
    assertValidUserIdForStoragePath(userId);
  }

  get userIdValue(): string {
    return this.userId;
  }

  resolveUserPath(relativeLocator?: string): string {
    return resolveUserPath(this.userId, relativeLocator);
  }

  unresolveUserPath(userPathLocator: string): string {
    return unresolveUserPath(this.userId, userPathLocator);
  }
}

/** Returns a {@link UserPathService} bound to `userId`. */
export function forUser(userId: string): UserPathService {
  return new UserPathService(userId);
}

function normalizeRelativeLocator(locator?: string): string {
  const relative = (locator ?? '').replace(/^[/\\]+/, '').replace(/\\/g, '/');

  if (relative.split('/').some((segment) => segment === '..')) {
    throw new BadRequestException('Invalid path');
  }

  return relative;
}
