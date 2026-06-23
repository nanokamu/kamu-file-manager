import { BadRequestException } from '@nestjs/common';

const MAX_USER_ID_LENGTH = 255;
const VALID_USER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidUserIdForStoragePath(userId: string): boolean {
  return (
    userId.length > 0 &&
    userId.length <= MAX_USER_ID_LENGTH &&
    VALID_USER_ID_PATTERN.test(userId)
  );
}

export function assertValidUserIdForStoragePath(userId: string): void {
  if (!isValidUserIdForStoragePath(userId)) {
    throw new BadRequestException('Invalid userId');
  }
}
