export const apiPath = (path: string) =>
  `/api${path.startsWith('/') ? path : `/${path}`}`;
