import { describe, expect, it } from 'vitest';
import { sanitizeRedirectPath } from './redirect.util';

describe('sanitizeRedirectPath', () => {
  it('returns / when value is null or empty', () => {
    expect(sanitizeRedirectPath(null)).toBe('/');
    expect(sanitizeRedirectPath('')).toBe('/');
    expect(sanitizeRedirectPath('   ')).toBe('/');
  });

  it('allows same-origin relative paths', () => {
    expect(sanitizeRedirectPath('/editor')).toBe('/editor');
    expect(sanitizeRedirectPath('/')).toBe('/');
  });

  it('rejects protocol-relative and external URLs', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/');
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/');
  });
});
