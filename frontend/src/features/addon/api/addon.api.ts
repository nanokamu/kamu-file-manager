import { ApiError, apiRequest, applyXHRAuthHeader, buildUrl } from '../../../api/client';
import {
  handleUnauthorized,
  shouldHandleUnauthorized,
} from '../../user/utils/auth-session.util';
import type { AddonConfig, ApiTemplate, ReturnTemplateJson } from '../../../shared/types/addon.types';

export function normalizeAddonPath(apiUrl: string): string {
  const trimmed = apiUrl.trim();
  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  if (withoutLeadingSlash.startsWith('api/')) {
    return withoutLeadingSlash.slice(4);
  }
  return withoutLeadingSlash;
}

export function getAddonConfig(): Promise<AddonConfig> {
  return apiRequest<AddonConfig>('addon/config');
}

export function invokeAddonJson(
  template: ApiTemplate,
  body: Record<string, unknown>,
): Promise<ReturnTemplateJson> {
  const path = normalizeAddonPath(template.apiUrl);
  return apiRequest<ReturnTemplateJson>(path, {
    method: template.apiType,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function invokeAddonEnvelopeWithProgress(
  template: ApiTemplate,
  body: Record<string, unknown>,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const path = normalizeAddonPath(template.apiUrl);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = buildUrl(path);

    xhr.open(template.apiType, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/octet-stream');
    applyXHRAuthHeader(xhr);
    xhr.responseType = 'arraybuffer';

    xhr.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as ArrayBuffer);
        return;
      }

      if (xhr.status === 401 && shouldHandleUnauthorized(path)) {
        handleUnauthorized(`${window.location.pathname}${window.location.search}`);
      }

      let errorBody: unknown;
      try {
        const text = new TextDecoder().decode(xhr.response as ArrayBuffer);
        errorBody = text ? JSON.parse(text) : undefined;
      } catch {
        errorBody = undefined;
      }

      const message =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'message' in errorBody &&
        typeof errorBody.message === 'string'
          ? errorBody.message
          : `Request failed with status ${xhr.status}`;

      reject(new ApiError(xhr.status, message, errorBody));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Download failed due to a network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Download was aborted'));
    });

    xhr.send(JSON.stringify(body));
  });
}
