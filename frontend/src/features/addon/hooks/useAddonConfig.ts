import { useEffect, useState } from 'react';
import type { AddonConfig } from '../../../shared/types/addon.types';
import { getAddonConfig } from '../api/addon.api';

let cachedConfig: AddonConfig | null = null;
let configPromise: Promise<AddonConfig> | null = null;

function fetchAddonConfigOnce(): Promise<AddonConfig> {
  if (cachedConfig) {
    return Promise.resolve(cachedConfig);
  }

  if (!configPromise) {
    configPromise = getAddonConfig()
      .then((config) => {
        cachedConfig = config;
        return config;
      })
      .catch((error: unknown) => {
        configPromise = null;
        throw error;
      });
  }

  return configPromise;
}

export function useAddonConfig() {
  const [config, setConfig] = useState<AddonConfig | null>(cachedConfig);
  const [isLoading, setIsLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedConfig) {
      return;
    }

    let cancelled = false;

    void fetchAddonConfigOnce()
      .then((loaded) => {
        if (!cancelled) {
          setConfig(loaded);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load addon config');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, isLoading, error };
}
