import { getToken } from '../features/user/utils/auth-token.util';
import {
  handleUnauthorized,
  shouldHandleUnauthorized,
} from '../features/user/utils/auth-session.util';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  let urlString = /^https?:\/\//i.test(base)
    ? new URL(`${base}${normalizedPath}`).toString()
    : `${base}${normalizedPath}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    if (queryString) {
      urlString += `?${queryString}`;
    }
  }

  return urlString;
}

function applyAuthHeaders(headers: Headers): void {
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
}

export function applyXHRAuthHeader(xhr: XMLHttpRequest): void {
  const token = getToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }
}

function handleResponseUnauthorized(path: string): void {
  if (shouldHandleUnauthorized(path)) {
    handleUnauthorized(`${window.location.pathname}${window.location.search}`);
  }
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  applyAuthHeaders(headers);

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleResponseUnauthorized(path);
    }

    const body = await parseErrorBody(response);
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return undefined as T;
}

export async function apiRequestBlob(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Response> {
  const headers = new Headers();
  applyAuthHeaders(headers);

  const response = await fetch(buildUrl(path, query), { headers });

  if (!response.ok) {
    if (response.status === 401) {
      handleResponseUnauthorized(path);
    }

    const body = await parseErrorBody(response);
    throw new ApiError(
      response.status,
      `Request failed with status ${response.status}`,
      body,
    );
  }

  return response;
}

export async function apiRequestBlobPost(path: string, body: unknown): Promise<Response> {
  const headers = new Headers({
    Accept: 'application/octet-stream',
    'Content-Type': 'application/json',
  });
  applyAuthHeaders(headers);

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleResponseUnauthorized(path);
    }

    const errorBody = await parseErrorBody(response);
    throw new ApiError(
      response.status,
      `Request failed with status ${response.status}`,
      errorBody,
    );
  }

  return response;
}

export { API_BASE_URL, buildUrl };
