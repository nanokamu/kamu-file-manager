import { BadRequestException } from '@nestjs/common';
import {
  assertValidUserIdForStoragePath,
  isValidUserIdForStoragePath,
} from './user-id.util';

describe('user-id.util', () => {
  describe('isValidUserIdForStoragePath', () => {
    it.each(['user-1', 'abc_123', '550e8400-e29b-41d4-a716-446655440000'])(
      'accepts valid userId %s',
      (userId) => {
        expect(isValidUserIdForStoragePath(userId)).toBe(true);
      },
    );

    it.each([
      '',
      '..',
      'a/b',
      'a\\b',
      ' a',
      '.',
      'user\x00id',
      'a'.repeat(256),
    ])('rejects invalid userId %j', (userId) => {
      expect(isValidUserIdForStoragePath(userId)).toBe(false);
    });
  });

  describe('assertValidUserIdForStoragePath', () => {
    it('does not throw for valid userId', () => {
      expect(() => assertValidUserIdForStoragePath('user-1')).not.toThrow();
    });

    it('throws BadRequestException for invalid userId', () => {
      expect(() => assertValidUserIdForStoragePath('..')).toThrow(
        BadRequestException,
      );
      expect(() => assertValidUserIdForStoragePath('..')).toThrow(
        'Invalid userId',
      );
    });
  });
});
