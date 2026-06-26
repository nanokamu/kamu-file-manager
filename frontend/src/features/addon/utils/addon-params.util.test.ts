import { describe, expect, it } from 'vitest';
import type { ApiTemplate } from '../../../shared/types/addon.types';
import type { FileItem } from '../../file-manager/types';
import {
  buildAddonRequestBody,
  filterApplicableTemplates,
  getDefaultParamValues,
  snakeToCamel,
} from './addon-params.util';

const baseTemplate: ApiTemplate = {
  menuName: 'download as zip',
  apiType: 'POST',
  apiUrl: '/api/addonDownloadAsZip',
  hasReturnMessage: true,
  hasReturnFile: true,
  returnMode: 'envelope',
  autoParams: [{ name: 'locators', type: 'string[]' }],
  customParams: [
    {
      name: 'archive_name',
      label: 'Archive Name',
      type: 'string',
      inputType: 'text',
      defaultValue: 'archive.zip',
    },
    {
      name: 'archive_type',
      label: 'Archive Type',
      type: 'string',
      inputType: 'dropdown',
      defaultValue: 'zip',
      options: [{ value: 'zip', label: 'ZIP' }],
    },
  ],
  filterRule: { enabledFile: true, enabledFolder: true },
};

function makeItem(id: string, type: FileItem['type']): FileItem {
  return {
    id,
    name: id,
    type,
    updatedAt: '2026-06-01',
    parentId: null,
  };
}

describe('addon-params.util', () => {
  describe('snakeToCamel', () => {
    it('converts snake_case to camelCase', () => {
      expect(snakeToCamel('archive_name')).toBe('archiveName');
      expect(snakeToCamel('archive_type')).toBe('archiveType');
    });

    it('leaves names without underscores unchanged', () => {
      expect(snakeToCamel('locators')).toBe('locators');
    });
  });

  describe('getDefaultParamValues', () => {
    it('maps param names to default values', () => {
      expect(getDefaultParamValues(baseTemplate.customParams)).toEqual({
        archive_name: 'archive.zip',
        archive_type: 'zip',
      });
    });
  });

  describe('filterApplicableTemplates', () => {
    const config = [
      baseTemplate,
      {
        ...baseTemplate,
        menuName: 'files only',
        filterRule: { enabledFile: true, enabledFolder: false },
      },
      {
        ...baseTemplate,
        menuName: 'folders only',
        filterRule: { enabledFile: false, enabledFolder: true },
      },
    ];

    it('returns templates that allow all types in mixed selection', () => {
      const selected = [makeItem('/a.txt', 'document'), makeItem('/folder', 'folder')];
      const names = filterApplicableTemplates(config, selected).map((t) => t.menuName);
      expect(names).toContain('download as zip');
      expect(names).not.toContain('files only');
      expect(names).not.toContain('folders only');
    });

    it('excludes folder-only templates when only files are selected', () => {
      const selected = [makeItem('/a.txt', 'document')];
      const names = filterApplicableTemplates(config, selected).map((t) => t.menuName);
      expect(names).toContain('download as zip');
      expect(names).toContain('files only');
      expect(names).not.toContain('folders only');
    });

    it('excludes file-only templates when only folders are selected', () => {
      const selected = [makeItem('/folder', 'folder')];
      const names = filterApplicableTemplates(config, selected).map((t) => t.menuName);
      expect(names).toContain('download as zip');
      expect(names).toContain('folders only');
      expect(names).not.toContain('files only');
    });
  });

  describe('buildAddonRequestBody', () => {
    it('merges locators and camelCased custom params', () => {
      const body = buildAddonRequestBody(
        baseTemplate,
        ['/a.txt', '/b.txt'],
        { archive_name: 'out.zip', archive_type: 'tar.gz' },
      );

      expect(body).toEqual({
        locators: ['/a.txt', '/b.txt'],
        archiveName: 'out.zip',
        archiveType: 'tar.gz',
      });
    });
  });
});
