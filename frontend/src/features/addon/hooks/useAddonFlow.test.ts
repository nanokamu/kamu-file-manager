// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiTemplate } from '../../../shared/types/addon.types';
import { RedirectMode, RedirectType, ReturnStatus } from '../../../shared/types/addon.types';
import { invokeAddonJson } from '../api/addon.api';
import { useAddonFlow } from './useAddonFlow';

vi.mock('../api/addon.api', () => ({
  invokeAddonJson: vi.fn(),
  invokeAddonEnvelopeWithProgress: vi.fn(),
}));

const mockInvokeAddonJson = vi.mocked(invokeAddonJson);

const baseTemplate: ApiTemplate = {
  menuName: 'compress as zip',
  apiType: 'POST',
  apiUrl: '/api/addonCompressAsZip',
  hasReturnMessage: true,
  hasReturnFile: false,
  returnMode: 'direct',
  hasFileListRefresh: true,
  fileListRefreshDelayMs: 2000,
  allowBlankAutoParams: false,
  autoParams: [{ name: 'locators', type: 'string[]' }],
  customParams: [],
  filterRule: {
    enabledFile: true,
    filePattern: '.*',
    enabledFolder: true,
    folderPattern: '.*',
    folderIdPattern: '.*',
  },
};

describe('useAddonFlow file list refresh', () => {
  let container: HTMLDivElement;
  let root: Root;
  let hookResult: ReturnType<typeof useAddonFlow>;

  function HookWrapper({
    config,
    currentFolderId = null,
    onFileListRefresh,
  }: {
    config: ApiTemplate[];
    currentFolderId?: string | null;
    onFileListRefresh?: () => void;
  }) {
    hookResult = useAddonFlow({
      config,
      selectedLocators: ['a.txt'],
      selectedItems: [],
      currentFolderId,
      onFileListRefresh,
    });
    return null;
  }

  function renderHook(
    onFileListRefresh?: () => void,
    currentFolderId: string | null = null,
  ) {
    act(() => {
      root.render(
        createElement(HookWrapper, {
          config: [baseTemplate],
          currentFolderId,
          onFileListRefresh,
        }),
      );
    });
  }

  function rerenderHook(
    onFileListRefresh?: () => void,
    currentFolderId: string | null = null,
  ) {
    act(() => {
      root.render(
        createElement(HookWrapper, {
          config: [baseTemplate],
          currentFolderId,
          onFileListRefresh,
        }),
      );
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockInvokeAddonJson.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('schedules refresh after success when hasFileListRefresh is true', async () => {
    const onFileListRefresh = vi.fn();
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      message: 'done',
    });

    renderHook(onFileListRefresh);

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(baseTemplate);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    expect(onFileListRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(onFileListRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onFileListRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not schedule refresh when hasFileListRefresh is false', async () => {
    const onFileListRefresh = vi.fn();
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      message: 'done',
    });

    renderHook(onFileListRefresh);

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate({
        ...baseTemplate,
        hasFileListRefresh: false,
      });
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onFileListRefresh).not.toHaveBeenCalled();
  });

  it('does not schedule refresh on API error response', async () => {
    const onFileListRefresh = vi.fn();
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Error,
      message: 'failed',
    });

    renderHook(onFileListRefresh);

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(baseTemplate);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onFileListRefresh).not.toHaveBeenCalled();
  });

  it('still refreshes when closeResult runs before delay elapses', async () => {
    const onFileListRefresh = vi.fn();
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      message: 'done',
    });

    renderHook(onFileListRefresh);

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(baseTemplate);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    act(() => {
      hookResult.closeResult();
    });

    expect(onFileListRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onFileListRefresh).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled refresh when currentFolderId changes before delay elapses', async () => {
    const onFileListRefresh = vi.fn();
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      message: 'done',
    });

    renderHook(onFileListRefresh, 'folder-a');

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(baseTemplate);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    rerenderHook(onFileListRefresh, 'folder-b');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onFileListRefresh).not.toHaveBeenCalled();
  });
});

describe('useAddonFlow currentFolderLocator', () => {
  let container: HTMLDivElement;
  let root: Root;
  let hookResult: ReturnType<typeof useAddonFlow>;

  const templateWithFolderLocator: ApiTemplate = {
    ...baseTemplate,
    autoParams: [
      { name: 'locators', type: 'string[]' },
      { name: 'currentFolderLocator', type: 'string' },
    ],
  };

  function HookWrapper({ currentFolderId }: { currentFolderId: string | null }) {
    hookResult = useAddonFlow({
      config: [templateWithFolderLocator],
      selectedLocators: ['a.txt'],
      selectedItems: [],
      currentFolderId,
    });
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockInvokeAddonJson.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('sends currentFolderLocator in request body when template declares it', async () => {
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      message: 'done',
    });

    act(() => {
      root.render(createElement(HookWrapper, { currentFolderId: 'projects/design' }));
    });

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(templateWithFolderLocator);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    expect(mockInvokeAddonJson).toHaveBeenCalledWith(templateWithFolderLocator, {
      locators: ['a.txt'],
      currentFolderLocator: 'projects/design',
    });
  });
});

describe('useAddonFlow redirect', () => {
  let container: HTMLDivElement;
  let root: Root;
  let hookResult: ReturnType<typeof useAddonFlow>;

  const redirectTemplate: ApiTemplate = {
    ...baseTemplate,
    menuName: 'Redirect to Another URL',
    apiUrl: '/api/addonCallWithRedirect',
    hasReturnMessage: true,
    returnMode: 'redirect',
    hasFileListRefresh: false,
    allowBlankAutoParams: true,
    customParams: [
      {
        name: 'archiveName',
        label: 'Archive Name',
        type: 'string',
        inputType: 'text',
        defaultValue: 'archive.zip',
      },
    ],
  };

  function HookWrapper({ config }: { config: ApiTemplate[] }) {
    hookResult = useAddonFlow({
      config,
      selectedLocators: [],
      selectedItems: [],
      currentFolderId: null,
    });
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockInvokeAddonJson.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('opens a new tab and shows success message for redirect response', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      redirectUrl: '/editor?locator=docs%2Fbinary_test.txt',
      redirectType: RedirectType.SameSite,
      redirectMode: RedirectMode.NewTab,
      message: 'Call with Redirect Success: 0, archive.zip',
    });

    act(() => {
      root.render(createElement(HookWrapper, { config: [redirectTemplate] }));
    });

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(redirectTemplate);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    expect(open).toHaveBeenCalledWith(
      '/editor?locator=docs%2Fbinary_test.txt',
      '_blank',
      'noopener,noreferrer',
    );
    expect(hookResult.step).toBe('result');
    expect(hookResult.resultMessage).toEqual({
      title: 'Success',
      description: 'Call with Redirect Success: 0, archive.zip',
      variant: 'default',
    });
  });

  it('opens a new tab without success message when hasReturnMessage is false', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      redirectUrl: '/editor?locator=docs%2Fbinary_test.txt',
      redirectType: RedirectType.SameSite,
      redirectMode: RedirectMode.NewTab,
      message: 'Call with Redirect Success: 0, archive.zip',
    });

    const templateWithoutMessage: ApiTemplate = {
      ...redirectTemplate,
      hasReturnMessage: false,
    };

    act(() => {
      root.render(createElement(HookWrapper, { config: [templateWithoutMessage] }));
    });

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(templateWithoutMessage);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    expect(open).toHaveBeenCalledWith(
      '/editor?locator=docs%2Fbinary_test.txt',
      '_blank',
      'noopener,noreferrer',
    );
    expect(hookResult.step).toBe('idle');
    expect(hookResult.resultMessage).toBeNull();
  });

  it('closes flow without success message when hasReturnMessage is false on direct response', async () => {
    mockInvokeAddonJson.mockResolvedValue({
      status: ReturnStatus.Ok,
      message: 'done',
    });

    const templateWithoutMessage: ApiTemplate = {
      ...baseTemplate,
      hasReturnMessage: false,
    };

    act(() => {
      root.render(createElement(HookWrapper, { config: [templateWithoutMessage] }));
    });

    act(() => {
      hookResult.openMenu();
      hookResult.selectTemplate(templateWithoutMessage);
    });

    await act(async () => {
      await hookResult.confirmParams();
    });

    expect(hookResult.step).toBe('idle');
    expect(hookResult.resultMessage).toBeNull();
  });
});
