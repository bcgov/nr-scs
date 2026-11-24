import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserToken = vi.fn().mockResolvedValue('token');
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: mockUserToken }),
}));

import { useLazyTabQuery } from './useLazyTabQuery';

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('useLazyTabQuery', () => {
  beforeEach(() => {
    mockUserToken.mockClear();
  });

  it('does not run queryFn until enabled, exposing empty rows and pending state', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: 1 }]);

    const { result } = renderHook(() => useLazyTabQuery(['k', 'off'], queryFn, false), {
      wrapper: makeWrapper(),
    });

    expect(result.current.rows).toEqual([]);
    expect(result.current.isPending).toBe(true);
    // Give any (erroneous) fetch a chance to fire, then confirm it never did.
    await new Promise((r) => setTimeout(r, 20));
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('runs queryFn with the auth token and returns its rows when enabled', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const { result } = renderHook(() => useLazyTabQuery(['k', 'on'], queryFn, true), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.rows).toEqual([{ id: 1 }, { id: 2 }]));
    expect(queryFn).toHaveBeenCalledWith('token');
    expect(result.current.isError).toBe(false);
  });

  it('exposes the error when queryFn rejects', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useLazyTabQuery(['k', 'err'], queryFn, true), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.rows).toEqual([]);
  });
});
