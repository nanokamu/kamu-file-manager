import { BadRequestException } from '@nestjs/common';
import { ReturnStatus } from '../config/addon.types';
import { assertSameParentLevel } from './locator-path.util';
import {
  formatParentForMessage,
  joinLocator,
  parentLocator,
  resolveUniqueArchiveName,
} from '../../../shared/utils/locator-path.util';

describe('locator-path.util (addon)', () => {
  describe('assertSameParentLevel', () => {
    it('returns shared parent when all locators match', () => {
      expect(assertSameParentLevel(['a.txt', 'b.txt'])).toBe('');
      expect(assertSameParentLevel(['folder/a.txt', 'folder/b.txt'])).toBe(
        'folder',
      );
    });

    it('rejects locators from different directories', () => {
      expect(() => assertSameParentLevel(['a.txt', 'folder/b.txt'])).toThrow(
        BadRequestException,
      );

      try {
        assertSameParentLevel(['a.txt', 'folder/b.txt']);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual({
          status: ReturnStatus.Error,
          message: 'All locators must be in the same directory',
        });
      }
    });

    it('rejects empty locator list', () => {
      expect(() => assertSameParentLevel([])).toThrow(BadRequestException);
    });
  });
});

describe('locator-path.util (shared)', () => {
  describe('parentLocator', () => {
    it('returns empty string for root-level files', () => {
      expect(parentLocator('file.txt')).toBe('');
      expect(parentLocator('/file.txt')).toBe('');
    });

    it('returns parent directory for nested paths', () => {
      expect(parentLocator('folder/file.txt')).toBe('folder');
      expect(parentLocator('folder\\nested\\file.txt')).toBe('folder/nested');
    });
  });

  describe('resolveUniqueArchiveName', () => {
    it('returns original name when it does not exist', async () => {
      const name = await resolveUniqueArchiveName(
        () => Promise.resolve(false),
        'archive.zip',
      );
      expect(name).toBe('archive.zip');
    });

    it('appends datetime suffix when name exists', async () => {
      const existing = new Set(['archive.zip']);
      const name = await resolveUniqueArchiveName(
        (candidate) => Promise.resolve(existing.has(candidate)),
        'archive.zip',
      );

      expect(name).toMatch(/^archive_\d{8}-\d{6}\.zip$/);
      expect(name).not.toBe('archive.zip');
    });

    it('retries with numeric suffix when datetime name also exists', async () => {
      const name = await resolveUniqueArchiveName((candidate) => {
        if (candidate === 'archive.zip') {
          return Promise.resolve(true);
        }
        if (/^archive_\d{8}-\d{6}\.zip$/.test(candidate)) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }, 'archive.zip');

      expect(name).toMatch(/^archive_\d{8}-\d{6}-\d+\.zip$/);
    });
  });

  describe('joinLocator', () => {
    it('joins parent and file name', () => {
      expect(joinLocator('folder', 'archive.zip')).toBe('folder/archive.zip');
      expect(joinLocator('', 'archive.zip')).toBe('archive.zip');
    });
  });

  describe('formatParentForMessage', () => {
    it('maps empty parent to root', () => {
      expect(formatParentForMessage('')).toBe('root');
      expect(formatParentForMessage('folder')).toBe('folder');
    });
  });
});
