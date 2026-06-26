import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(status: number, message: string, body: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  },
  apiRequest: vi.fn(),
  buildUrl: vi.fn((path: string) => `/api/${path}`),
}));

import { apiRequest } from '../../../api/client';
import {
  getAddonConfig,
  invokeAddonJson,
  normalizeAddonPath,
} from '../api/addon.api';
import type { ApiTemplate } from '../../../shared/types/addon.types';

const mockApiRequest = vi.mocked(apiRequest);

const template: ApiTemplate = {
  menuName: 'compress as zip',
  apiType: 'POST',
  apiUrl: '/api/addonCompressAsZip',
  hasReturnMessage: true,
  hasReturnFile: false,
  autoParams: [{ name: 'locators', type: 'string[]' }],
  customParams: [],
  filterRule: {
    enabledFile: true,
    filePattern: '.*',
    enabledFolder: true,
    folderPattern: '.*',
  },
};

describe('addon.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeAddonPath', () => {
    it('strips leading /api prefix', () => {
      expect(normalizeAddonPath('/api/addonDownloadAsZip')).toBe('addonDownloadAsZip');
    });

    it('strips api prefix without leading slash', () => {
      expect(normalizeAddonPath('api/addonCompressAsZip')).toBe('addonCompressAsZip');
    });

    it('leaves paths without api prefix unchanged', () => {
      expect(normalizeAddonPath('addon/config')).toBe('addon/config');
    });
  });

  describe('getAddonConfig', () => {
    it('requests addon/config', async () => {
      const config = [template];
      mockApiRequest.mockResolvedValue(config);

      await expect(getAddonConfig()).resolves.toEqual(config);
      expect(mockApiRequest).toHaveBeenCalledWith('addon/config');
    });
  });

  describe('invokeAddonJson', () => {
    it('posts to normalized path with JSON body', async () => {
      const body = { locators: ['/a.txt'], archiveName: 'out.zip' };
      const response = { status: 'ok', message: 'done' };
      mockApiRequest.mockResolvedValue(response);

      await expect(invokeAddonJson(template, body)).resolves.toEqual(response);
      expect(mockApiRequest).toHaveBeenCalledWith('addonCompressAsZip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
  });
});
