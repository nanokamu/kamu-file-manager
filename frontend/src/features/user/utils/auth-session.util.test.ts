// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleUnauthorized,
  registerUnauthorizedHandler,
  shouldHandleUnauthorized,
  unregisterUnauthorizedHandler,
} from './auth-session.util';

const TOKEN_STORAGE_KEY = 'auth.accessToken';

describe('shouldHandleUnauthorized', () => {
  it('returns false for auth/login', () => {
    expect(shouldHandleUnauthorized('auth/login')).toBe(false);
    expect(shouldHandleUnauthorized('/auth/login')).toBe(false);
  });

  it('returns true for other API paths', () => {
    expect(shouldHandleUnauthorized('users/me')).toBe(true);
    expect(shouldHandleUnauthorized('files')).toBe(true);
  });
});

describe('handleUnauthorized', () => {
  const handler = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'test-token');
    registerUnauthorizedHandler(handler);
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    unregisterUnauthorizedHandler();
    localStorage.clear();
    handler.mockReset();
  });

  it('clears token and invokes handler with login path', () => {
    window.history.pushState({}, '', '/editor?locator=foo');

    handleUnauthorized();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(handler).toHaveBeenCalledWith(
      '/login?redirect=%2Feditor%3Flocator%3Dfoo',
    );
  });

  it('uses provided redirect path', () => {
    handleUnauthorized('/files?locator=bar');

    expect(handler).toHaveBeenCalledWith(
      '/login?redirect=%2Ffiles%3Flocator%3Dbar',
    );
  });

  it('skips handler when already on /login', () => {
    window.history.pushState({}, '', '/login');

    handleUnauthorized();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when no handler is registered', () => {
    unregisterUnauthorizedHandler();

    expect(() => handleUnauthorized('/editor')).not.toThrow();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
