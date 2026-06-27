/** Supported auto param names: locators (string[]), currentFolderLocator (string). */
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
  filePattern: string; // Regex pattern for file locator
  enabledFolder: boolean;
  folderPattern: string; // Regex pattern for folder locator
}

export interface ApiTemplate {
  menuName: string; // Menu name for display in addon menu
  apiType: string; // API type (GET, POST, PUT, DELETE)
  apiUrl: string; // API URL
  hasReturnMessage: boolean; // Whether to return a message
  hasReturnFile: boolean; // Whether to return a file
  // returnMode:
  // direct: return json,
  // envelope: return envelope with file,
  // redirect: redirect to another url
  returnMode: 'envelope' | 'direct' | 'redirect';
  hasFileListRefresh: boolean; // Whether to refresh the file list
  fileListRefreshDelayMs: number; // Delay time in milliseconds to refresh the file list
  allowBlankAutoParams: boolean; // When true, locators auto param may be []
  autoParams: AutoParam[];
  customParams: CustomParam[]; // Custom parameters for the API
  filterRule: FilterRule; // Filter rules for the API
}

export enum ReturnStatus {
  Ok = 'ok',
  Error = 'error',
}

export interface ReturnTemplateError {
  status: ReturnStatus.Error;
  message: string;
}

export interface ReturnTemplateMessage {
  status: ReturnStatus.Ok;
  message: string;
}

export enum RedirectType {
  SameSite = 'same-site', // /editor, /editor?locator=x
  CrossSite = 'cross-site', // https://external.com/...
}

export enum RedirectMode {
  Redirect = 'redirect', // window.location.href = redirectUrl;
  Replace = 'replace', // window.location.replace(redirectUrl);
  NewTab = 'new-tab', // window.open(redirectUrl, '_blank', 'noopener,noreferrer');
  NewWindow = 'new-window', // window.open(redirectUrl, '_blank', 'noopener,noreferrer');
}

export interface ReturnTemplateRedirect {
  status: ReturnStatus.Ok;
  redirectUrl: string;
  redirectType: RedirectType; // same-site or cross-site
  redirectMode: RedirectMode; // redirect, replace, new-tab, new-window
  message?: string; // optional toast before navigate
}

export interface ReturnTemplateWithFile {
  status: ReturnStatus.Ok;
  filename: string;
  mimeType: string;
  message?: string;
}

export type ReturnTemplateJson =
  | ReturnTemplateError
  | ReturnTemplateMessage
  | ReturnTemplateRedirect
  | ReturnTemplateWithFile;

export type AddonConfig = ApiTemplate[];
