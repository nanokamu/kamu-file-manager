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
}

export interface ApiTemplate {
  menuName: string;
  apiType: string;
  apiUrl: string;
  hasReturnMessage: boolean;
  hasReturnFile: boolean;
  returnMode?: 'envelope' | 'direct';
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

export type ReturnTemplateJson =
  | ReturnTemplateError
  | ReturnTemplateMessage
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
