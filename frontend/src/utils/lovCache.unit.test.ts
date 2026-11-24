import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLovCache,
  GRADING_CODE_APPOINTMENT_TYPE_LOV,
  lovQueryKey,
  purgeLovCache,
} from '@/utils/lovCache';

const storageKey = (name: string) => `lov-cache:${name}`;

describe('purgeLovCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    sessionStorage.clear();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('drops the React Query entry so a remount cannot serve the pre-mutation list', () => {
    queryClient.setQueryData(lovQueryKey(GRADING_CODE_APPOINTMENT_TYPE_LOV), [{ code: 'CF' }]);

    purgeLovCache(queryClient, GRADING_CODE_APPOINTMENT_TYPE_LOV);

    // removeQueries, not invalidateQueries: the app sets `refetchOnMount: false`, so an
    // invalidated-but-present entry would still be served on remount. Nothing must remain.
    expect(queryClient.getQueryData(lovQueryKey(GRADING_CODE_APPOINTMENT_TYPE_LOV))).toBeUndefined();
    expect(queryClient.getQueryCache().find({ queryKey: lovQueryKey(GRADING_CODE_APPOINTMENT_TYPE_LOV) })).toBeUndefined();
  });

  it('leaves unrelated LOVs cached', () => {
    queryClient.setQueryData(lovQueryKey('appointment-type-lov'), [{ code: 'F' }]);
    queryClient.setQueryData(['lov', 'static-lov', 'SCALE_GRADING_SYSTEM_CODE'], [{ code: 'B' }]);

    purgeLovCache(queryClient, GRADING_CODE_APPOINTMENT_TYPE_LOV);

    expect(queryClient.getQueryData(lovQueryKey('appointment-type-lov'))).toEqual([{ code: 'F' }]);
    expect(queryClient.getQueryData(['lov', 'static-lov', 'SCALE_GRADING_SYSTEM_CODE'])).toEqual([{ code: 'B' }]);
  });

  it('drops the sessionStorage copy, which a page reload would otherwise restore', () => {
    sessionStorage.setItem(storageKey(GRADING_CODE_APPOINTMENT_TYPE_LOV), JSON.stringify([{ code: 'CF' }]));

    purgeLovCache(queryClient, GRADING_CODE_APPOINTMENT_TYPE_LOV);

    expect(sessionStorage.getItem(storageKey(GRADING_CODE_APPOINTMENT_TYPE_LOV))).toBeNull();
  });
});

describe('clearLovCache', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('removes only the named key', () => {
    sessionStorage.setItem(storageKey('a-lov'), '[]');
    sessionStorage.setItem(storageKey('b-lov'), '[]');

    clearLovCache('a-lov');

    expect(sessionStorage.getItem(storageKey('a-lov'))).toBeNull();
    expect(sessionStorage.getItem(storageKey('b-lov'))).toBe('[]');
  });

  it('survives a throwing sessionStorage (private mode / blocked site data)', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => clearLovCache('a-lov')).not.toThrow();

    spy.mockRestore();
  });
});
