import type { RedirectMode, RedirectType } from '../types/addon.types';
import { RedirectMode as RedirectModeValues } from '../types/addon.types';

export function applyAddonRedirect(
  redirectUrl: string,
  _redirectType: RedirectType,
  redirectMode: RedirectMode,
): void {
  switch (redirectMode) {
    case RedirectModeValues.Redirect:
      window.location.href = redirectUrl;
      break;
    case RedirectModeValues.Replace:
      window.location.replace(redirectUrl);
      break;
    case RedirectModeValues.NewTab:
    case RedirectModeValues.NewWindow:
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      break;
  }
}
