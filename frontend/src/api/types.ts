export interface UnifiedResource {
  path: string;
  name: string;
  type: 'file' | 'directory';
  mimeType?: string;
  size?: number;
  updatedAt: string;
}

export interface FileListResponse {
  files: string[];
}

export interface DownloadResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
  encoding: string;
  checksum?: {
    algorithm: string;
    value: string;
  };
}

export interface UploadFileOptions {
  locator: string;
  fileName: string;
  file: Blob | File;
  mimeType?: string;
  size: number;
  overwrite?: boolean;
  visibility?: 'public' | 'private';
  checksumAlgorithm: 'md5' | 'sha256' | 'crc32c';
  checksumValue: string;
}

export interface CreateFolderOptions {
  parentLocator: string;
  folderName: string;
}

export interface CopyMoveFileOptions {
  sourceLocator: string;
  destinationLocator: string;
  overwrite?: boolean;
  recursive?: boolean;
}
