export function buildLoginPath(pathname: string, search = ''): string {
  return `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
}
