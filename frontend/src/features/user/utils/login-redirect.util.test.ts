import { describe, expect, it } from 'vitest';
import { buildLoginPath } from './login-redirect.util';

describe('buildLoginPath', () => {
  it('encodes root path', () => {
    expect(buildLoginPath('/')).toBe('/login?redirect=%2F');
  });

  it('encodes editor path', () => {
    expect(buildLoginPath('/editor')).toBe('/login?redirect=%2Feditor');
  });

  it('preserves query string in redirect param', () => {
    expect(buildLoginPath('/editor', '?locator=foo')).toBe(
      '/login?redirect=%2Feditor%3Flocator%3Dfoo',
    );
  });
});
