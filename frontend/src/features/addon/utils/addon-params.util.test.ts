import { describe, expect, it } from 'vitest';
import type { ApiTemplate } from '../../../shared/types/addon.types';
import type { FileItem } from '../../file-manager/types';
import {
  buildAddonRequestBody,
  filterApplicableTemplates,
  getDefaultParamValues,
  toCurrentFolderLocator,
} from './addon-params.util';

const baseTemplate: ApiTemplate = {
  menuName: 'download as zip',
  apiType: 'POST',
  apiUrl: '/api/addonDownloadAsZip',
  hasReturnMessage: true,
  hasReturnFile: true,
  returnMode: 'envelope',
  hasFileListRefresh: false,
  fileListRefreshDelayMs: 0,
  allowBlankAutoParams: false,
  autoParams: [{ name: 'locators', type: 'string[]' }],
  customParams: [
    {
      name: 'archiveName',
      label: 'Archive Name',
      type: 'string',
      inputType: 'text',
      defaultValue: 'archive.zip',
    },
    {
      name: 'archiveType',
      label: 'Archive Type',
      type: 'string',
      inputType: 'dropdown',
      defaultValue: 'zip',
      options: [{ value: 'zip', label: 'ZIP' }],
    },
  ],
  filterRule: {
    enabledFile: true,
    filePattern: '.*',
    enabledFolder: true,
    folderPattern: '.*',
    folderIdPattern: '.*',
  },
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
  describe('getDefaultParamValues', () => {
    it('maps param names to default values', () => {
      expect(getDefaultParamValues(baseTemplate.customParams)).toEqual({
        archiveName: 'archive.zip',
        archiveType: 'zip',
      });
    });
  });

  describe('filterApplicableTemplates', () => {
    const config = [
      baseTemplate,
      {
        ...baseTemplate,
        menuName: 'files only',
        filterRule: {
          enabledFile: true,
          filePattern: '.*',
          enabledFolder: false,
          folderPattern: '.*',
          folderIdPattern: '.*',
        },
      },
      {
        ...baseTemplate,
        menuName: 'folders only',
        filterRule: {
          enabledFile: false,
          filePattern: '.*',
          enabledFolder: true,
          folderPattern: '.*',
          folderIdPattern: '.*',
        },
      },
    ];

    it('returns templates that allow all types in mixed selection', () => {
      const selected = [makeItem('/a.txt', 'document'), makeItem('/folder', 'folder')];
      const names = filterApplicableTemplates(config, selected, null).map((t) => t.menuName);
      expect(names).toContain('download as zip');
      expect(names).not.toContain('files only');
      expect(names).not.toContain('folders only');
    });

    it('excludes folder-only templates when only files are selected', () => {
      const selected = [makeItem('/a.txt', 'document')];
      const names = filterApplicableTemplates(config, selected, null).map((t) => t.menuName);
      expect(names).toContain('download as zip');
      expect(names).toContain('files only');
      expect(names).not.toContain('folders only');
    });

    it('excludes file-only templates when only folders are selected', () => {
      const selected = [makeItem('/folder', 'folder')];
      const names = filterApplicableTemplates(config, selected, null).map((t) => t.menuName);
      expect(names).toContain('download as zip');
      expect(names).toContain('folders only');
      expect(names).not.toContain('files only');
    });

    it('returns no templates when selection is empty and none allow blank auto params', () => {
      expect(filterApplicableTemplates(config, [], null)).toEqual([]);
    });

    it('returns only allowBlankAutoParams templates when selection is empty', () => {
      const blankTemplate: ApiTemplate = {
        ...baseTemplate,
        menuName: 'blank locator call',
        allowBlankAutoParams: true,
      };
      const mixedConfig = [baseTemplate, blankTemplate];

      const names = filterApplicableTemplates(mixedConfig, [], null).map((t) => t.menuName);
      expect(names).toEqual(['blank locator call']);
    });

    it('excludes templates when file locators do not match filePattern', () => {
      const patternConfig = [
        {
          ...baseTemplate,
          menuName: 'txt files only',
          filterRule: {
            enabledFile: true,
            filePattern: '\\.txt$',
            enabledFolder: true,
            folderPattern: '.*',
            folderIdPattern: '.*',
          },
        },
      ];
      const matching = [makeItem('report.txt', 'document')];
      const nonMatching = [makeItem('report.pdf', 'pdf')];

      expect(filterApplicableTemplates(patternConfig, matching, null).map((t) => t.menuName)).toContain(
        'txt files only',
      );
      expect(
        filterApplicableTemplates(patternConfig, nonMatching, null).map((t) => t.menuName),
      ).not.toContain('txt files only');
    });

    it('excludes templates when folder locators do not match folderPattern', () => {
      const patternConfig = [
        {
          ...baseTemplate,
          menuName: 'projects folder only',
          filterRule: {
            enabledFile: true,
            filePattern: '.*',
            enabledFolder: true,
            folderPattern: '^projects/',
            folderIdPattern: '.*',
          },
        },
      ];
      const matching = [makeItem('projects/design', 'folder')];
      const nonMatching = [makeItem('assets/icons', 'folder')];

      expect(filterApplicableTemplates(patternConfig, matching, null).map((t) => t.menuName)).toContain(
        'projects folder only',
      );
      expect(
        filterApplicableTemplates(patternConfig, nonMatching, null).map((t) => t.menuName),
      ).not.toContain('projects folder only');
    });

    it('includes templates when current folder id matches folderIdPattern', () => {
      const patternConfig = [
        {
          ...baseTemplate,
          menuName: 'vat folder only',
          filterRule: {
            enabledFile: true,
            filePattern: '.*',
            enabledFolder: true,
            folderPattern: '.*',
            folderIdPattern: '^VAT.*',
          },
        },
      ];
      const selected = [makeItem('report.zip', 'document')];

      expect(
        filterApplicableTemplates(patternConfig, selected, 'VAT/invoices').map((t) => t.menuName),
      ).toContain('vat folder only');
    });

    it('excludes templates when current folder id does not match folderIdPattern', () => {
      const patternConfig = [
        {
          ...baseTemplate,
          menuName: 'vat folder only',
          filterRule: {
            enabledFile: true,
            filePattern: '.*',
            enabledFolder: true,
            folderPattern: '.*',
            folderIdPattern: '^VAT.*',
          },
        },
      ];
      const selected = [makeItem('report.zip', 'document')];

      expect(
        filterApplicableTemplates(patternConfig, selected, null).map((t) => t.menuName),
      ).not.toContain('vat folder only');
      expect(
        filterApplicableTemplates(patternConfig, selected, 'projects/design').map(
          (t) => t.menuName,
        ),
      ).not.toContain('vat folder only');
    });

    it('applies folderIdPattern when selection is empty and allowBlankAutoParams is true', () => {
      const blankTemplate: ApiTemplate = {
        ...baseTemplate,
        menuName: 'blank in vat folder',
        allowBlankAutoParams: true,
        filterRule: {
          ...baseTemplate.filterRule,
          folderIdPattern: '^VAT.*',
        },
      };

      expect(
        filterApplicableTemplates([blankTemplate], [], 'VAT/invoices').map((t) => t.menuName),
      ).toEqual(['blank in vat folder']);
      expect(filterApplicableTemplates([blankTemplate], [], null).map((t) => t.menuName)).toEqual(
        [],
      );
    });
  });

  describe('toCurrentFolderLocator', () => {
    it('returns empty string for null', () => {
      expect(toCurrentFolderLocator(null)).toBe('');
    });

    it('returns the folder id unchanged', () => {
      expect(toCurrentFolderLocator('projects/design')).toBe('projects/design');
    });
  });

  describe('buildAddonRequestBody', () => {
    it('merges locators and custom params', () => {
      const body = buildAddonRequestBody(
        baseTemplate,
        ['/a.txt', '/b.txt'],
        { archiveName: 'out.zip', archiveType: 'tar.gz' },
        '',
      );

      expect(body).toEqual({
        locators: ['/a.txt', '/b.txt'],
        archiveName: 'out.zip',
        archiveType: 'tar.gz',
      });
    });

    it('includes currentFolderLocator when declared in autoParams', () => {
      const template: ApiTemplate = {
        ...baseTemplate,
        autoParams: [
          { name: 'locators', type: 'string[]' },
          { name: 'currentFolderLocator', type: 'string' },
        ],
      };

      const body = buildAddonRequestBody(
        template,
        ['/a.txt'],
        { archiveName: 'out.zip', archiveType: 'zip' },
        'projects/design',
      );

      expect(body).toEqual({
        locators: ['/a.txt'],
        currentFolderLocator: 'projects/design',
        archiveName: 'out.zip',
        archiveType: 'zip',
      });
    });

    it('omits currentFolderLocator when not declared in autoParams', () => {
      const body = buildAddonRequestBody(
        baseTemplate,
        ['/a.txt'],
        {},
        'projects/design',
      );

      expect(body).toEqual({ locators: ['/a.txt'] });
    });
  });
});
