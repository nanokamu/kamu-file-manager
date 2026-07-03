import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../user/utils/auth-token.util', () => ({
  getToken: vi.fn(() => 'test-token'),
}));

vi.mock('../../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/client')>();
  return {
    ...actual,
    apiRequest: vi.fn(),
    apiRequestBlob: vi.fn(),
    apiRequestBlobPost: vi.fn(),
  };
});

import { apiRequest, apiRequestBlob, apiRequestBlobPost } from '../../../api/client';
import { decodeBlobAsText } from '../../../shared/utils/encoding.util';
import {
  createFolder,
  deleteFile,
  downloadFile,
  downloadFolderAsZip,
  getFileMetadata,
  listAllFilePaths,
  listFiles,
  uploadFile,
  uploadFileWithProgress,
} from './files.api';

const mockApiRequest = vi.mocked(apiRequest);
const mockApiRequestBlob = vi.mocked(apiRequestBlob);
const mockApiRequestBlobPost = vi.mocked(apiRequestBlobPost);

function mockFetchResponse(options: {
  blobContent?: string;
  headers?: Record<string, string>;
} = {}) {
  const headers = new Headers(options.headers);
  const blob = new Blob([options.blobContent ?? 'file-bytes']);

  return {
    blob: vi.fn().mockResolvedValue(blob),
    headers: {
      get: (name: string) => headers.get(name),
    },
  } as unknown as Response;
}

describe('files.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAllFilePaths', () => {
    it('calls apiRequest with filelist path', async () => {
      const response = { files: ['a.txt', 'b.txt'] };
      mockApiRequest.mockResolvedValue(response);

      await expect(listAllFilePaths()).resolves.toEqual(response);
      expect(mockApiRequest).toHaveBeenCalledWith('filelist');
    });
  });

  describe('listFiles', () => {
    it('passes locator as query param', async () => {
      const files = [{ path: '/docs', name: 'docs', type: 'directory' as const }];
      mockApiRequest.mockResolvedValue(files);

      await expect(listFiles('/docs')).resolves.toEqual(files);
      expect(mockApiRequest).toHaveBeenCalledWith('files', {}, { locator: '/docs' });
    });

    it('omits locator when undefined', async () => {
      mockApiRequest.mockResolvedValue([]);

      await listFiles();
      expect(mockApiRequest).toHaveBeenCalledWith('files', {}, { locator: undefined });
    });
  });

  describe('getFileMetadata', () => {
    it('requests metadata for locator', async () => {
      const resource = { path: '/a.txt', name: 'a.txt', type: 'file' as const };
      mockApiRequest.mockResolvedValue(resource);

      await expect(getFileMetadata('/a.txt')).resolves.toEqual(resource);
      expect(mockApiRequest).toHaveBeenCalledWith(
        'files/metadata',
        {},
        { locator: '/a.txt' },
      );
    });
  });

  describe('downloadFile', () => {
    it('maps response headers and blob into DownloadResult', async () => {
      const response = mockFetchResponse({
        blobContent: 'hello',
        headers: {
          'content-type': 'text/plain',
          'content-disposition': 'attachment; filename="report.txt"',
          'x-checksum-algorithm': 'sha256',
          'x-checksum-value': 'abc123',
        },
      });
      mockApiRequestBlob.mockResolvedValue(response);

      const result = await downloadFile('/folder/report.txt');

      expect(mockApiRequestBlob).toHaveBeenCalledWith('files/download', {
        locator: '/folder/report.txt',
      });
      expect(result.mimeType).toBe('text/plain');
      expect(result.fileName).toBe('report.txt');
      expect(result.encoding).toBe('utf-8');
      expect(result.checksum).toEqual({ algorithm: 'sha256', value: 'abc123' });
      expect(await decodeBlobAsText(result.blob, result.encoding)).toBe('hello');
    });

    it('parses UTF-8 filename from content-disposition', async () => {
      mockApiRequestBlob.mockResolvedValue(
        mockFetchResponse({
          headers: {
            'content-disposition': "attachment; filename*=UTF-8''my%20file.txt",
          },
        }),
      );

      const result = await downloadFile('/x');
      expect(result.fileName).toBe('my file.txt');
    });

    it('parses plain filename from content-disposition', async () => {
      mockApiRequestBlob.mockResolvedValue(
        mockFetchResponse({
          headers: {
            'content-disposition': 'attachment; filename=plain.txt',
          },
        }),
      );

      const result = await downloadFile('/x');
      expect(result.fileName).toBe('plain.txt');
    });

    it('falls back to locator basename when no filename header', async () => {
      mockApiRequestBlob.mockResolvedValue(mockFetchResponse());

      const result = await downloadFile('/path/to/fallback.txt');
      expect(result.fileName).toBe('fallback.txt');
    });

    it('omits checksum when headers are missing', async () => {
      mockApiRequestBlob.mockResolvedValue(mockFetchResponse());

      const result = await downloadFile('/file.bin');
      expect(result.checksum).toBeUndefined();
      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('downloadFolderAsZip', () => {
    it('posts folderLocators, folderZipPaths, and archiveName to download/zip', async () => {
      mockApiRequestBlobPost.mockResolvedValue(mockFetchResponse());

      await downloadFolderAsZip('nestitems');

      expect(mockApiRequestBlobPost).toHaveBeenCalledWith('files/download/zip', {
        folderLocators: ['nestitems'],
        folderZipPaths: ['nestitems'],
        archiveName: 'archive.zip',
      });
    });

    it('strips leading slashes from locator', async () => {
      mockApiRequestBlobPost.mockResolvedValue(mockFetchResponse());

      await downloadFolderAsZip('/nestitems');

      expect(mockApiRequestBlobPost).toHaveBeenCalledWith('files/download/zip', {
        folderLocators: ['nestitems'],
        folderZipPaths: ['nestitems'],
        archiveName: 'archive.zip',
      });
    });

    it('maps response headers and blob into DownloadResult', async () => {
      const response = mockFetchResponse({
        blobContent: 'zip-bytes',
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="nestitems.zip"',
        },
      });
      mockApiRequestBlobPost.mockResolvedValue(response);

      const result = await downloadFolderAsZip('nestitems');

      expect(result.mimeType).toBe('application/zip');
      expect(result.fileName).toBe('nestitems.zip');
      expect(await decodeBlobAsText(result.blob, result.encoding)).toBe('zip-bytes');
    });

    it('falls back to folder-based archive name when no filename header', async () => {
      mockApiRequestBlobPost.mockResolvedValue(mockFetchResponse());

      const result = await downloadFolderAsZip('parent/nestitems');
      expect(result.fileName).toBe('archive.zip');
      expect(result.mimeType).toBe('application/zip');
    });
  });

  describe('uploadFile', () => {
    it('sends file body and query params', async () => {
      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const created = { path: '/photo.png', name: 'photo.png', type: 'file' as const };
      mockApiRequest.mockResolvedValue(created);

      await expect(
        uploadFile({
          locator: '/',
          fileName: 'photo.png',
          file,
          size: file.size,
          overwrite: true,
          visibility: 'private',
          checksumAlgorithm: 'md5',
          checksumValue: 'mockchecksum',
        }),
      ).resolves.toEqual(created);

      expect(mockApiRequest).toHaveBeenCalledWith(
        'files/upload',
        {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: file,
        },
        {
          locator: '/',
          fileName: 'photo.png',
          mimeType: 'image/png',
          size: file.size,
          overwrite: true,
          visibility: 'private',
          checksumAlgorithm: 'md5',
          checksumValue: 'mockchecksum',
        },
      );
    });

    it('uses explicit mimeType and size over file defaults', async () => {
      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      mockApiRequest.mockResolvedValue({ path: '/x', name: 'x', type: 'file' as const });

      await uploadFile({
        locator: '/',
        fileName: 'photo.png',
        file,
        mimeType: 'application/custom',
        size: 999,
        checksumAlgorithm: 'md5',
        checksumValue: 'mockchecksum',
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        'files/upload',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/custom' },
        }),
        expect.objectContaining({
          mimeType: 'application/custom',
          size: 999,
        }),
      );
    });
  });

  describe('uploadFileWithProgress', () => {
    const OriginalXHR = globalThis.XMLHttpRequest;

    afterEach(() => {
      globalThis.XMLHttpRequest = OriginalXHR;
    });

    it('sets Authorization header and POSTs to files/upload', async () => {
      const headers = new Map<string, string>();
      let openedMethod = '';
      let openedUrl = '';

      class MockXHR {
        upload = { addEventListener: vi.fn() };
        status = 200;
        responseText = JSON.stringify({
          path: 'sample.txt',
          name: 'sample.txt',
          type: 'file',
        });

        open(method: string, url: string) {
          openedMethod = method;
          openedUrl = url;
        }

        setRequestHeader(name: string, value: string) {
          headers.set(name, value);
        }

        send = vi.fn(() => {
          for (const listener of this.loadListeners) {
            listener();
          }
        });

        private loadListeners: Array<() => void> = [];

        addEventListener(event: string, listener: () => void) {
          if (event === 'load') {
            this.loadListeners.push(listener);
          }
        }
      }

      globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;

      const file = new File(['data'], 'sample.txt', { type: 'text/plain' });
      const result = await uploadFileWithProgress({
        locator: 'folder',
        fileName: 'sample.txt',
        file,
        size: file.size,
        checksumAlgorithm: 'sha256',
        checksumValue: 'abc',
      });

      expect(openedMethod).toBe('POST');
      expect(openedUrl).toContain('files/upload');
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('Content-Type')).toBe('text/plain');
      expect(result).toEqual({
        path: 'sample.txt',
        name: 'sample.txt',
        type: 'file',
      });
    });
  });

  describe('createFolder', () => {
    it('POSTs JSON body', async () => {
      const options = { parentLocator: '', folderName: 'docs' };
      const created = { path: 'docs', name: 'docs', type: 'directory' as const };
      mockApiRequest.mockResolvedValue(created);

      await expect(createFolder(options)).resolves.toEqual(created);
      expect(mockApiRequest).toHaveBeenCalledWith('files/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
    });
  });

  describe('deleteFile', () => {
    it('sends DELETE with locator', async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await deleteFile('/old.txt');
      expect(mockApiRequest).toHaveBeenCalledWith(
        'files',
        { method: 'DELETE' },
        { locator: '/old.txt' },
      );
    });
  });
});
