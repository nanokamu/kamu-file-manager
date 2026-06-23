import { join } from 'path';

export const STORAGE_ADAPTER = 'STORAGE_ADAPTER';
export const STORAGE_CONFIG = 'STORAGE_CONFIG';

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100 MiB

export const MAX_ZIP_DOWNLOAD_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GiB

export interface StorageConfig {
  localStoragePath: string;
  maxUploadSizeBytes: number;
  maxZipDownloadSizeBytes: number;
}

export function createStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): StorageConfig {
  return {
    localStoragePath:
      env.STORAGE_PATH ?? join(__dirname, '../../../../file_items'),
    maxUploadSizeBytes: parseMaxUploadSize(env.MAX_UPLOAD_SIZE_BYTES),
    maxZipDownloadSizeBytes: MAX_ZIP_DOWNLOAD_SIZE_BYTES,
  };
}

function parseMaxUploadSize(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid MAX_UPLOAD_SIZE_BYTES: expected a positive number, got "${raw}"`,
    );
  }

  return parsed;
}
