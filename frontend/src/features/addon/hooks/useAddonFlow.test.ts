// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiTemplate } from '../../../shared/types/addon.types';
import { ReturnStatus } from '../../../shared/types/addon.types';
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
  autoParams: [{ name: 'locators', type: 'string[]' }],
  customParams: [],
  filterRule: {
    enabledFile: true,
    filePattern: '.*',
    enabledFolder: true,
    folderPattern: '.*',
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
