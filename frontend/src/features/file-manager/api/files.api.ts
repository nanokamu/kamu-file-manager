import { ApiError, apiRequest, apiRequestBlob, apiRequestBlobPost, applyXHRAuthHeader, buildUrl } from '../../../api/client';
import {
  handleUnauthorized,
  shouldHandleUnauthorized,
} from '../../user/utils/auth-session.util';
import { detectFileEncoding } from '../../../shared/utils/encoding.util';
import type {
  CopyMoveFileOptions,
  CreateFolderOptions,
  DownloadResult,
  FileListResponse,
  UnifiedResource,
  UploadFileOptions,
} from '../../../api/types';

function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) {
    return undefined;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = header.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim();
}

export function listAllFilePaths(): Promise<FileListResponse> {
  return apiRequest<FileListResponse>('filelist');
}

export function listFiles(locator?: string): Promise<UnifiedResource[]> {
  // eslint-disable-next-line no-constant-condition
  if (false) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}${month}${day} ${hours}${minutes}${seconds}`;
    console.log(`listfiles: ${formattedDateTime}`);
  }
  return apiRequest<UnifiedResource[]>('files', {}, { locator });
}

export function getFileMetadata(locator: string): Promise<UnifiedResource> {
  return apiRequest<UnifiedResource>('files/metadata', {}, { locator });
}

export async function downloadFile(locator: string): Promise<DownloadResult> {
  const response = await apiRequestBlob('files/download', { locator });
  const blob = await response.blob();
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
  const checksumAlgorithm = response.headers.get('x-checksum-algorithm');
  const checksumValue = response.headers.get('x-checksum-value');
  const fileName =
    parseContentDispositionFilename(response.headers.get('content-disposition')) ??
    locator.split('/').pop() ??
    'download';
  // const encoding = await detectFileEncoding(blob, mimeType);
  // Prefer auto detection of encoding
  const encoding = await detectFileEncoding(blob);

  return {
    blob,
    fileName,
    mimeType,
    encoding,
    checksum:
      checksumAlgorithm && checksumValue
        ? { algorithm: checksumAlgorithm, value: checksumValue }
        : undefined,
  };
}

export function uploadFileWithProgress(
  options: UploadFileOptions,
  onProgress?: (loaded: number, total: number) => void,
): Promise<UnifiedResource> {
  const {
    locator,
    fileName,
    file,
    mimeType,
    size,
    overwrite,
    visibility,
    checksumAlgorithm,
    checksumValue,
  } = options;

  const contentType = mimeType ?? file.type ?? 'application/octet-stream';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = buildUrl('files/upload', {
      locator,
      fileName,
      mimeType: mimeType ?? (file instanceof File ? file.type : undefined),
      size: size ?? file.size,
      overwrite,
      visibility,
      checksumAlgorithm,
      checksumValue,
    });

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UnifiedResource);
        } catch {
          reject(new Error('Invalid response from server'));
        }
        return;
      }

      if (xhr.status === 401 && shouldHandleUnauthorized('files/upload')) {
        handleUnauthorized(`${window.location.pathname}${window.location.search}`);
      }

      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = xhr.responseText || undefined;
      }

      const message =
        typeof body === 'object' &&
          body !== null &&
          'message' in body &&
          typeof body.message === 'string'
          ? body.message
          : `Request failed with status ${xhr.status}`;

      reject(new ApiError(xhr.status, message, body));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to a network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', contentType);
    applyXHRAuthHeader(xhr);
    xhr.send(file);
  });
}

export function uploadFile(options: UploadFileOptions): Promise<UnifiedResource> {
  const {
    locator,
    fileName,
    file,
    mimeType,
    size,
    overwrite,
    visibility,
    checksumAlgorithm,
    checksumValue,
  } = options;

  return apiRequest<UnifiedResource>(
    'files/upload',
    {
      method: 'POST',
      headers: {
        'Content-Type': mimeType ?? file.type ?? 'application/octet-stream',
      },
      body: file,
    },
    {
      locator,
      fileName,
      mimeType: mimeType ?? file.type,
      size: size ?? file.size,
      overwrite,
      visibility,
      checksumAlgorithm,
      checksumValue,
    },
  );
}

export function createFolder(options: CreateFolderOptions): Promise<UnifiedResource> {
  return apiRequest<UnifiedResource>('files/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
}

export function deleteFile(locator: string): Promise<void> {
  return apiRequest<void>('files', { method: 'DELETE' }, { locator });
}

export function copyFile(options: CopyMoveFileOptions): Promise<UnifiedResource> {
  return apiRequest<UnifiedResource>('files/copy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
}

export function moveFile(options: CopyMoveFileOptions): Promise<UnifiedResource> {
  return apiRequest<UnifiedResource>('files/move', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
}

export async function downloadFolderAsZip(locator: string, archiveName: string = "archive.zip"): Promise<DownloadResult> {
  const normalizedLocator = locator.replace(/^\/+/, '');
  const folderName = normalizedLocator.split('/').pop() ?? 'archive';

  const response = await apiRequestBlobPost('files/download/zip', {
    folderLocators: [normalizedLocator],
    folderZipPaths: [folderName],
    archiveName: archiveName,
  });

  const blob = await response.blob();
  const mimeType = response.headers.get('content-type') ?? 'application/zip';
  const fileName =
    parseContentDispositionFilename(response.headers.get('content-disposition')) ??
    archiveName;
  const encoding = await detectFileEncoding(blob);

  return {
    blob,
    fileName,
    mimeType,
    encoding,
  };
}
