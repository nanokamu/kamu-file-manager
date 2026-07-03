import { BadRequestException } from '@nestjs/common';
import {
  RedirectMode,
  RedirectType,
  ReturnStatus,
  type ReturnTemplateRedirect,
} from '../config/addon.types';

function redirectError(message: string): never {
  throw new BadRequestException({
    status: ReturnStatus.Error,
    message,
  });
}

export function validateRedirectUrl(
  redirectUrl: string,
  redirectType: RedirectType,
): void {
  if (!redirectUrl.trim()) {
    redirectError('redirectUrl is required');
  }

  if (redirectType === RedirectType.SameSite) {
    if (!redirectUrl.startsWith('/') || redirectUrl.startsWith('//')) {
      redirectError(
        'Same-site redirectUrl must be a relative path starting with /',
      );
    }
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectUrl);
  } catch {
    redirectError('Cross-site redirectUrl must be a valid absolute URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    redirectError('Cross-site redirectUrl must use http or https');
  }
}

export function buildRedirectResponse(
  redirectUrl: string,
  redirectType: RedirectType,
  redirectMode: RedirectMode,
  message?: string,
): ReturnTemplateRedirect {
  validateRedirectUrl(redirectUrl, redirectType);

  return {
    status: ReturnStatus.Ok,
    redirectUrl,
    redirectType,
    redirectMode,
    ...(message !== undefined ? { message } : {}),
  };
}
