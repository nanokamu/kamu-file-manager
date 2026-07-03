// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { RedirectMode, RedirectType } from '../types/addon.types';
import { applyAddonRedirect } from './addon-redirect.util';

describe('applyAddonRedirect', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('sets window.location.href for redirect mode', () => {
    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: '',
        replace: vi.fn(),
        set href(value: string) {
          hrefSetter(value);
        },
      },
    });

    applyAddonRedirect(
      '/editor?locator=test',
      RedirectType.SameSite,
      RedirectMode.Redirect,
    );

    expect(hrefSetter).toHaveBeenCalledWith('/editor?locator=test');
  });

  it('calls window.location.replace for replace mode', () => {
    const replace = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', replace },
    });

    applyAddonRedirect(
      '/editor?locator=test',
      RedirectType.SameSite,
      RedirectMode.Replace,
    );

    expect(replace).toHaveBeenCalledWith('/editor?locator=test');
  });

  it('opens a new tab for new-tab mode', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    applyAddonRedirect(
      '/editor?locator=test',
      RedirectType.SameSite,
      RedirectMode.NewTab,
    );

    expect(open).toHaveBeenCalledWith(
      '/editor?locator=test',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens a new tab for new-window mode', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    applyAddonRedirect(
      'https://example.com',
      RedirectType.CrossSite,
      RedirectMode.NewWindow,
    );

    expect(open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
