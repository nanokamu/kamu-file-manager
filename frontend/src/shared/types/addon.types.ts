// Keep in sync with backend_nestjs/src/modules/addon/config/addon.types.ts

export const ReturnStatus = {
  Ok: 'ok',
  Error: 'error',
} as const;

export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export interface AutoParam {
  name: string;
  type: string;
}

export interface ParamOption {
  value: string;
  label: string;
}

export interface CustomParam {
  name: string;
  label: string;
  type: string;
  inputType: string;
  defaultValue: string;
  options?: ParamOption[];
}

export interface FilterRule {
  enabledFile: boolean;
  filePattern: string;
  enabledFolder: boolean;
  folderPattern: string;
  folderIdPattern: string;
}

export interface ApiTemplate {
  menuName: string;
  apiType: string;
  apiUrl: string;
  hasReturnMessage: boolean;
  hasReturnFile: boolean;
  returnMode: 'envelope' | 'direct' | 'redirect';
  hasFileListRefresh: boolean;
  fileListRefreshDelayMs: number;
  allowBlankAutoParams: boolean; // When true, locators auto param may be []
  autoParams: AutoParam[];
  customParams: CustomParam[];
  filterRule: FilterRule;
}

export interface ReturnTemplateError {
  status: typeof ReturnStatus.Error;
  message: string;
}

export interface ReturnTemplateMessage {
  status: typeof ReturnStatus.Ok;
  message: string;
}

export interface ReturnTemplateWithFile {
  status: typeof ReturnStatus.Ok;
  filename: string;
  mimeType: string;
  message?: string;
}

export const RedirectType = {
  SameSite: 'same-site',
  CrossSite: 'cross-site',
} as const;

export type RedirectType = (typeof RedirectType)[keyof typeof RedirectType];

export const RedirectMode = {
  Redirect: 'redirect',
  Replace: 'replace',
  NewTab: 'new-tab',
  NewWindow: 'new-window',
} as const;

export type RedirectMode = (typeof RedirectMode)[keyof typeof RedirectMode];

export interface ReturnTemplateRedirect {
  status: typeof ReturnStatus.Ok;
  redirectUrl: string;
  redirectType: RedirectType;
  redirectMode: RedirectMode;
  message?: string;
}

export type ReturnTemplateJson =
  | ReturnTemplateError
  | ReturnTemplateMessage
  | ReturnTemplateRedirect
  | ReturnTemplateWithFile;

export type AddonConfig = ApiTemplate[];

export function isReturnTemplateError(body: unknown): body is ReturnTemplateError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === ReturnStatus.Error &&
    'message' in body &&
    typeof body.message === 'string'
  );
}

export function isReturnTemplateRedirect(body: unknown): body is ReturnTemplateRedirect {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === ReturnStatus.Ok &&
    'redirectUrl' in body &&
    typeof body.redirectUrl === 'string' &&
    'redirectType' in body &&
    typeof body.redirectType === 'string' &&
    'redirectMode' in body &&
    typeof body.redirectMode === 'string'
  );
}
