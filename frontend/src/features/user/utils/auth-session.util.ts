import { buildLoginPath } from './login-redirect.util';
import { clearToken } from './auth-token.util';

type UnauthorizedHandler = (loginPath: string) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function shouldHandleUnauthorized(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  return normalized !== 'auth/login';
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export function unregisterUnauthorizedHandler(): void {
  unauthorizedHandler = null;
}

export function handleUnauthorized(redirectPath?: string): void {
  clearToken();

  if (window.location.pathname === '/login') {
    return;
  }

  const fullPath =
    redirectPath ?? `${window.location.pathname}${window.location.search}`;
  const questionIndex = fullPath.indexOf('?');
  const pathname =
    questionIndex === -1 ? fullPath : fullPath.slice(0, questionIndex);
  const search = questionIndex === -1 ? '' : fullPath.slice(questionIndex);

  unauthorizedHandler?.(buildLoginPath(pathname || '/', search));
}
