import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { createTestStorageConfig } from '../../../test/helpers/storage.fixture';
import { StoragePathService } from './storage-path.service';
import { STORAGE_CONFIG } from '../config/storage.config';

describe('StoragePathService', () => {
  let service: StoragePathService;
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'storage-path-test-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoragePathService,
        {
          provide: STORAGE_CONFIG,
          useValue: createTestStorageConfig(tempRoot),
        },
      ],
    }).compile();

    service = module.get(StoragePathService);
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('resolves different data roots for different users', () => {
    const defaultRoot = service.resolveStoragePath(undefined, 'default');
    const userBRoot = service.resolveStoragePath(undefined, 'user-b');

    expect(defaultRoot).toBe(resolve(tempRoot, 'default', 'data'));
    expect(userBRoot).toBe(resolve(tempRoot, 'user-b', 'data'));
    expect(defaultRoot).not.toBe(userBRoot);
  });

  it('resolves different temp roots for different users', () => {
    const defaultTemp = service.resolveTempStoragePath(undefined, 'default');
    const userBTemp = service.resolveTempStoragePath(undefined, 'user-b');

    expect(defaultTemp).toBe(resolve(tempRoot, 'default', 'temp'));
    expect(userBTemp).toBe(resolve(tempRoot, 'user-b', 'temp'));
    expect(defaultTemp).not.toBe(userBTemp);
  });

  it('forUser binds userId to path helpers', () => {
    const userPaths = service.forUser('user-b');

    expect(userPaths.resolveStoragePath()).toBe(
      resolve(tempRoot, 'user-b', 'data'),
    );
    expect(userPaths.resolveTempStoragePath()).toBe(
      resolve(tempRoot, 'user-b', 'temp'),
    );
  });

  it('toRelativePath is scoped per user', () => {
    const defaultAbsolute = join(
      service.resolveStoragePath(undefined, 'default'),
      'docs',
      'file.txt',
    );
    const userBAbsolute = join(
      service.resolveStoragePath(undefined, 'user-b'),
      'docs',
      'file.txt',
    );

    expect(service.toRelativePath(defaultAbsolute, 'default')).toBe(
      'docs/file.txt',
    );
    expect(service.toRelativePath(userBAbsolute, 'user-b')).toBe(
      'docs/file.txt',
    );
  });

  it('throws for invalid userId', () => {
    expect(() => service.resolveStoragePath(undefined, '../evil')).toThrow(
      BadRequestException,
    );
    expect(() => service.resolveStoragePath(undefined, '')).toThrow(
      BadRequestException,
    );
    expect(() => service.forUser('bad/user')).toThrow(BadRequestException);
  });

  it('rejects directory traversal per user', () => {
    expect(() =>
      service.resolveStoragePath('../outside', 'default'),
    ).toThrow(BadRequestException);
    expect(() =>
      service.resolveStoragePath('../outside', 'user-b'),
    ).toThrow(BadRequestException);
  });
});
