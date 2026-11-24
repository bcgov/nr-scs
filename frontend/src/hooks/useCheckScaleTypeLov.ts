import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';

export interface CheckScaleTypeLovResult {
  /** LOV entries with a non-empty code, for building filter options. */
  options: StaticLov[];
  /** Code → description map for rendering type codes in tables. */
  descriptions: Map<string, string>;
}

/**
 * Loads the CHECK_SCALE_TYPE_CODE LOV once (shared React Query cache) and exposes it
 * both as option entries and as a code→description lookup.
 */
export function useCheckScaleTypeLov(enabled: boolean): CheckScaleTypeLovResult {
  const { userToken } = useAuth();

  const lovQuery = useQuery({
    queryKey: ['lov', 'static-lov', 'CHECK_SCALE_TYPE_CODE'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov({ tableKey: 'CHECK_SCALE_TYPE_CODE' }, token);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo(
    () => (lovQuery.data ?? []).filter((item) => item.code),
    [lovQuery.data],
  );

  const descriptions = useMemo(
    () =>
      new Map(options.map((item) => [String(item.code), String(item.description ?? item.code)])),
    [options],
  );

  return { options, descriptions };
}
