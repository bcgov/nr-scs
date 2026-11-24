import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/auth/useAuth';

/**
 * Lazy data fetch for a record detail-page tab. Runs `queryFn` (passing the current auth token)
 * only when `enabled` — typically `isActive && Boolean(id)` so a tab fetches just once it is opened
 * for a valid record — and exposes the rows plus loading/error state. Centralizes the
 * `useQuery` + token-fetch + `data ?? []` boilerplate the list tabs all repeat.
 */
export function useLazyTabQuery<T>(
  queryKey: unknown[],
  queryFn: (token?: string) => Promise<T[]>,
  enabled: boolean,
  options?: { staleTime?: number },
) {
  const { userToken } = useAuth();
  const query = useQuery({
    queryKey,
    queryFn: async () => queryFn(await userToken()),
    enabled,
    staleTime: options?.staleTime,
  });

  return {
    rows: (query.data ?? []) as T[],
    isPending: query.isPending,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
