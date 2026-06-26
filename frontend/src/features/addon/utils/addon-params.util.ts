import type { AddonConfig, ApiTemplate, CustomParam } from '../../../shared/types/addon.types';
import type { FileItem } from '../../file-manager/types';

export function snakeToCamel(name: string): string {
  return name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

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
): ApiTemplate[] {
  const files = selectedItems.filter((item) => item.type !== 'folder');
  const folders = selectedItems.filter((item) => item.type === 'folder');

  return config.filter((template) => {
    const { enabledFile, filePattern, enabledFolder, folderPattern } = template.filterRule;

    const filesOk =
      files.length === 0 ||
      (enabledFile && files.every((file) => matchesLocatorPattern(filePattern, file.id)));

    const foldersOk =
      folders.length === 0 ||
      (enabledFolder &&
        folders.every((folder) => matchesLocatorPattern(folderPattern, folder.id)));

    return filesOk && foldersOk;
  });
}

export function buildAddonRequestBody(
  template: ApiTemplate,
  locators: string[],
  customValues: Record<string, string>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const autoParam of template.autoParams) {
    if (autoParam.type === 'string[]' && autoParam.name === 'locators') {
      body.locators = locators;
    } else {
      body[autoParam.name] = locators;
    }
  }

  for (const [name, value] of Object.entries(customValues)) {
    body[snakeToCamel(name)] = value;
  }

  return body;
}
