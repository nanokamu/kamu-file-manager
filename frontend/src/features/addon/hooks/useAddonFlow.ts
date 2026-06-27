import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiTemplate } from '../../../shared/types/addon.types';
import { isReturnTemplateError } from '../../../shared/types/addon.types';
import {
  parseAddonEnvelope,
  parsedEnvelopeToBlob,
} from '../../../shared/utils/addon-envelope.util';
import { ApiError } from '../../../api/client';
import type { FileItem } from '../../file-manager/types';
import { invokeAddonEnvelopeWithProgress, invokeAddonJson } from '../api/addon.api';
import {
  buildAddonRequestBody,
  filterApplicableTemplates,
  getDefaultParamValues,
} from '../utils/addon-params.util';

export type AddonFlowStep = 'idle' | 'menu' | 'params' | 'downloading' | 'result';

export interface AddonResultMessage {
  title: string;
  description: string;
  variant: 'default' | 'error';
}

interface UseAddonFlowOptions {
  config: ApiTemplate[] | null;
  selectedLocators: string[];
  selectedItems: FileItem[];
  currentFolderId: string | null;
  onFileListRefresh?: () => void;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useAddonFlow({
  config,
  selectedLocators,
  selectedItems,
  currentFolderId,
  onFileListRefresh,
}: UseAddonFlowOptions) {
  const [step, setStep] = useState<AddonFlowStep>('idle');
  const [selectedTemplate, setSelectedTemplate] = useState<ApiTemplate | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<AddonResultMessage | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFolderIdRef = useRef(currentFolderId);
  const scheduledLocatorRef = useRef<string | null>(null);
  const onFileListRefreshRef = useRef(onFileListRefresh);

  currentFolderIdRef.current = currentFolderId;
  onFileListRefreshRef.current = onFileListRefresh;

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleFileListRefresh = useCallback(
    (template: ApiTemplate) => {
      if (!template.hasFileListRefresh || !onFileListRefreshRef.current) {
        return;
      }

      clearRefreshTimeout();
      const locatorAtSchedule = currentFolderIdRef.current;
      scheduledLocatorRef.current = locatorAtSchedule;

      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        if (scheduledLocatorRef.current !== currentFolderIdRef.current) {
          return;
        }
        onFileListRefreshRef.current?.();
      }, template.fileListRefreshDelayMs);
    },
    [clearRefreshTimeout],
  );

  useEffect(() => {
    clearRefreshTimeout();
  }, [currentFolderId, clearRefreshTimeout]);

  useEffect(() => {
    return () => {
      clearRefreshTimeout();
    };
  }, [clearRefreshTimeout]);

  const applicableTemplates = useMemo(() => {
    if (!config) {
      return [];
    }
    return filterApplicableTemplates(config, selectedItems);
  }, [config, selectedItems]);

  const openMenu = useCallback(() => {
    setStep('menu');
    setSelectedTemplate(null);
    setParamValues({});
    setResultMessage(null);
  }, []);

  const closeFlow = useCallback(() => {
    setStep('idle');
    setSelectedTemplate(null);
    setParamValues({});
    setDownloadProgress(0);
    setIsSubmitting(false);
    setResultMessage(null);
  }, []);

  const selectTemplate = useCallback((template: ApiTemplate) => {
    setSelectedTemplate(template);
    setParamValues(getDefaultParamValues(template.customParams));
    setStep('params');
  }, []);

  const goBackToMenu = useCallback(() => {
    setSelectedTemplate(null);
    setStep('menu');
  }, []);

  const updateParamValue = useCallback((name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const closeResult = useCallback(() => {
    setResultMessage(null);
    closeFlow();
  }, [closeFlow]);

  const confirmParams = useCallback(async () => {
    if (!selectedTemplate) {
      return;
    }

    const body = buildAddonRequestBody(
      selectedTemplate,
      selectedLocators,
      paramValues,
    );

    const isEnvelope =
      selectedTemplate.hasReturnFile &&
      selectedTemplate.returnMode === 'envelope';

    setIsSubmitting(true);

    try {
      if (isEnvelope) {
        setStep('downloading');
        setDownloadProgress(0);

        const buffer = await invokeAddonEnvelopeWithProgress(
          selectedTemplate,
          body,
          (loaded, total) => {
            setDownloadProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
          },
        );

        setDownloadProgress(100);

        const parsed = parseAddonEnvelope(buffer);
        const blob = parsedEnvelopeToBlob(parsed);
        triggerBrowserDownload(blob, parsed.meta.filename);

        setResultMessage({
          title: 'Download complete',
          description: parsed.meta.message ?? `Downloaded ${parsed.meta.filename}`,
          variant: 'default',
        });
        scheduleFileListRefresh(selectedTemplate);
        setStep('result');
        return;
      }

      const response = await invokeAddonJson(selectedTemplate, body);

      if (isReturnTemplateError(response)) {
        setResultMessage({
          title: 'Addon failed',
          description: response.message,
          variant: 'error',
        });
      } else {
        const description =
          'message' in response && typeof response.message === 'string'
            ? response.message
            : 'Operation completed successfully';
        setResultMessage({
          title: 'Success',
          description,
          variant: 'default',
        });
        scheduleFileListRefresh(selectedTemplate);
      }
      setStep('result');
    } catch (error) {
      const description =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'An unexpected error occurred';

      setResultMessage({
        title: 'Addon failed',
        description,
        variant: 'error',
      });
      setStep('result');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTemplate, selectedLocators, paramValues, scheduleFileListRefresh]);

  return {
    step,
    applicableTemplates,
    selectedTemplate,
    paramValues,
    downloadProgress,
    isSubmitting,
    resultMessage,
    openMenu,
    closeFlow,
    selectTemplate,
    goBackToMenu,
    updateParamValue,
    confirmParams,
    closeResult,
  };
}
