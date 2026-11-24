import { useEffect, useState } from 'react';

import { lovCacheInternals } from '@/utils/lovCache';

// The cache itself lives in `@/utils/lovCache` so a maintenance screen can purge a LOV without
// importing this hook — see `clearLovCache` / `purgeLovCache` there.
const { lovCache, lovInFlight, storagePrefix } = lovCacheInternals;

/**
 * Generic helper for loading small list-of-values (LOV) arrays used in dropdowns.
 */
export type UseLovOptionsResult<T> = {
  data: T[];
  isLoading: boolean;
  error: string | null;
};

export function useLovOptions<T>(
  loader: () => Promise<T[]>,
  options?: {
    /**
     * If false, the loader won't run.
     */
    enabled?: boolean;
    /**
     * Friendly error message shown to the user.
     */
    errorMessage?: string;
    /**
     * Cache key for sharing LOV results across callers.
     */
    cacheKey?: string;
  },
): UseLovOptionsResult<T> {
  const enabled = options?.enabled ?? true;
  const cacheKey = options?.cacheKey;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      if (cacheKey && lovCache.has(cacheKey)) {
        setData((lovCache.get(cacheKey) as T[]) ?? []);
        return;
      }

      if (cacheKey) {
        try {
          const cachedRaw = sessionStorage.getItem(`${storagePrefix}${cacheKey}`);
          if (cachedRaw) {
            const cachedValue = JSON.parse(cachedRaw);
            if (Array.isArray(cachedValue)) {
              lovCache.set(cacheKey, cachedValue as unknown[]);
              setData(cachedValue as T[]);
              return;
            }
          }
        } catch {
          // ignore storage errors
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        const cachedPromise = cacheKey ? lovInFlight.get(cacheKey) : undefined;
        const requestPromise = cachedPromise ?? loader();
        if (cacheKey && !cachedPromise) {
          lovInFlight.set(cacheKey, requestPromise as Promise<unknown[]>);
        }
        const result = await requestPromise;
        if (!isMounted) {
          return;
        }
        const normalized = Array.isArray(result) ? result : [];
        if (cacheKey) {
          lovCache.set(cacheKey, normalized as unknown[]);
          lovInFlight.delete(cacheKey);
          try {
            sessionStorage.setItem(`${storagePrefix}${cacheKey}`, JSON.stringify(normalized));
          } catch {
            // ignore storage errors
          }
        }
        setData(normalized as T[]);
      } catch {
        if (!isMounted) {
          return;
        }
        setData([]);
        setError(options?.errorMessage ?? 'Could not load options.');
        if (cacheKey) {
          lovInFlight.delete(cacheKey);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
    // loader is expected to be stable (useCallback) or referential changes will refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled, loader]);

  return { data, isLoading, error };
}

