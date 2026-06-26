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

export function filterApplicableTemplates(
  config: AddonConfig,
  selectedItems: FileItem[],
): ApiTemplate[] {
  const hasFiles = selectedItems.some((item) => item.type !== 'folder');
  const hasFolders = selectedItems.some((item) => item.type === 'folder');

  return config.filter((template) => {
    const { enabledFile, enabledFolder } = template.filterRule;
    return (!hasFiles || enabledFile) && (!hasFolders || enabledFolder);
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
