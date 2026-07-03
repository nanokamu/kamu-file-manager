import type { AddonConfig, ApiTemplate, CustomParam } from '../../../shared/types/addon.types';
import type { FileItem } from '../../file-manager/types';

export function getDefaultParamValues(
  customParams: CustomParam[],
): Record<string, string> {
  return Object.fromEntries(
    customParams.map((param) => [param.name, param.defaultValue]),
  );
}

export function matchesLocatorPattern(pattern: string, locator: string): boolean {
  try {
    return new RegExp(pattern).test(locator);
  } catch {
    return false;
  }
}

export function filterApplicableTemplates(
  config: AddonConfig,
  selectedItems: FileItem[],
  currentFolderId: string | null,
): ApiTemplate[] {
  const currentLocator = toCurrentFolderLocator(currentFolderId);

  if (selectedItems.length === 0) {
    return config.filter(
      (template) =>
        template.allowBlankAutoParams &&
        matchesLocatorPattern(template.filterRule.folderIdPattern, currentLocator),
    );
  }

  const files = selectedItems.filter((item) => item.type !== 'folder');
  const folders = selectedItems.filter((item) => item.type === 'folder');

  return config.filter((template) => {
    const { enabledFile, filePattern, enabledFolder, folderPattern, folderIdPattern } =
      template.filterRule;

    const folderIdOk = matchesLocatorPattern(folderIdPattern, currentLocator);

    const filesOk =
      files.length === 0 ||
      (enabledFile && files.every((file) => matchesLocatorPattern(filePattern, file.id)));

    const foldersOk =
      folders.length === 0 ||
      (enabledFolder &&
        folders.every((folder) => matchesLocatorPattern(folderPattern, folder.id)));

    return folderIdOk && filesOk && foldersOk;
  });
}

export function toCurrentFolderLocator(currentFolderId: string | null): string {
  return currentFolderId ?? '';
}

export function buildAddonRequestBody(
  template: ApiTemplate,
  locators: string[],
  customValues: Record<string, string>,
  currentFolderLocator: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const autoParam of template.autoParams) {
    if (autoParam.type === 'string[]' && autoParam.name === 'locators') {
      body.locators = locators;
    } else if (autoParam.type === 'string' && autoParam.name === 'currentFolderLocator') {
      body.currentFolderLocator = currentFolderLocator;
    }
  }

  for (const [name, value] of Object.entries(customValues)) {
    body[name] = value;
  }

  return body;
}
