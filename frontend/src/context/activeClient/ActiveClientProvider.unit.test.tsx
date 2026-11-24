import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getActiveClientForHeader, setActiveClientForHeader } from '@/context/auth/activeClientHeader';
import type { FamLoginUser } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import { ActiveClientContext, type ActiveClientContextType } from './ActiveClientContext';
import { ActiveClientProvider } from './ActiveClientProvider';
import { clearStoredActiveClient, readStoredActiveClient } from './activeClientStorage';

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(authModule.useAuth);

const signedInWith = (clientNumbers?: string[]) => {
  const user: FamLoginUser = { privileges: {}, roles: ['SCS_INDUSTRY_SCALER'], clientNumbers };
  mockUseAuth.mockReturnValue({
    user,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn(),
  });
};

/** Renders the provider and returns an accessor for its current context value. */
function renderProvider(): { get: () => ActiveClientContextType; queryClient: QueryClient } {
  const captured = { value: undefined as unknown as ActiveClientContextType };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <ActiveClientProvider>
        <ActiveClientContext.Consumer>
          {(value) => {
            captured.value = value;
            return null;
          }}
        </ActiveClientContext.Consumer>
      </ActiveClientProvider>
    </QueryClientProvider>,
  );

  return { get: () => captured.value, queryClient };
}

describe('ActiveClientProvider', () => {
  beforeEach(() => {
    clearStoredActiveClient();
    setActiveClientForHeader(undefined);
    mockUseAuth.mockReset();
  });

  describe('resolving the active client', () => {
    it('has no active client and no switcher for an internal user', () => {
      signedInWith(undefined);

      const { get } = renderProvider();

      expect(get().activeClient).toBeUndefined();
      expect(get().canSwitch).toBe(false);
      expect(getActiveClientForHeader()).toBeUndefined();
    });

    it('resolves a single-client user to that client, with no switcher', () => {
      signedInWith(['00001074']);

      const { get } = renderProvider();

      expect(get().activeClient).toBe('00001074');
      expect(get().canSwitch).toBe(false);
    });

    /**
     * The default must match the backend's, which takes the lowest-numbered client when no header is
     * sent. If they disagreed, the first requests of a session — made before the provider mirrors the
     * value into the request layer — would be scoped to a different client than the UI claims.
     */
    it('defaults a multi-client user to the lowest-numbered client, regardless of token order', () => {
      signedInWith(['00003111', '00001074', '00002000']);

      const { get } = renderProvider();

      expect(get().activeClient).toBe('00001074');
      expect(get().clientNumbers).toEqual(['00001074', '00002000', '00003111']);
      expect(get().canSwitch).toBe(true);
    });

    it('mirrors the active client into the request headers', () => {
      signedInWith(['00002000', '00001074']);

      renderProvider();

      expect(getActiveClientForHeader()).toBe('00001074');
    });
  });

  describe('switching', () => {
    it('switches to another entitled client and forwards it', () => {
      signedInWith(['00001074', '00002000']);
      const { get } = renderProvider();

      act(() => get().setActiveClient('00002000'));

      expect(get().activeClient).toBe('00002000');
      expect(getActiveClientForHeader()).toBe('00002000');
    });

    /**
     * Every cached response was scoped to the previous client, so it is dropped rather than
     * invalidated — a screen must not be able to render the old client's rows while its refetch is in
     * flight.
     */
    it('clears cached query data when the client changes', () => {
      signedInWith(['00001074', '00002000']);
      const { get, queryClient } = renderProvider();
      queryClient.setQueryData(['scaler-summary', '001A'], { scalerLicenceNo: '001A' });

      act(() => get().setActiveClient('00002000'));

      expect(queryClient.getQueryData(['scaler-summary', '001A'])).toBeUndefined();
    });

    it('ignores a client the user is not entitled to, keeping the current scope', () => {
      signedInWith(['00001074', '00002000']);
      const { get } = renderProvider();

      act(() => get().setActiveClient('00009999'));

      expect(get().activeClient).toBe('00001074');
      expect(getActiveClientForHeader()).toBe('00001074');
    });

    it('does not clear the cache when re-selecting the client already active', () => {
      signedInWith(['00001074', '00002000']);
      const { get, queryClient } = renderProvider();
      queryClient.setQueryData(['scaler-summary', '001A'], { scalerLicenceNo: '001A' });

      act(() => get().setActiveClient('00001074'));

      expect(queryClient.getQueryData(['scaler-summary', '001A'])).toEqual({
        scalerLicenceNo: '001A',
      });
    });
  });

  describe('persistence across reloads', () => {
    /**
     * A remount with the storage intact is what a page refresh looks like: the module-level state is
     * gone, so the selection has to come back from storage or the user silently reverts to the default.
     */
    it('restores the selection after a remount', () => {
      signedInWith(['00001074', '00002000', '00003111']);
      const first = renderProvider();
      act(() => first.get().setActiveClient('00003111'));

      const afterReload = renderProvider();

      expect(afterReload.get().activeClient).toBe('00003111');
      expect(getActiveClientForHeader()).toBe('00003111');
    });

    it('writes the selection to storage when it changes', () => {
      signedInWith(['00001074', '00002000']);
      const { get } = renderProvider();

      act(() => get().setActiveClient('00002000'));

      expect(readStoredActiveClient()).toBe('00002000');
    });

    /**
     * The default is never written, only resolved. Storing it would make the first client look like a
     * deliberate choice and would survive a change of entitlements as if the user had picked it.
     */
    it('does not write anything for a user who has not chosen', () => {
      signedInWith(['00001074', '00002000']);
      renderProvider();

      expect(readStoredActiveClient()).toBeUndefined();
    });

    it('falls back to the default once the selection is cleared, as on logout', () => {
      signedInWith(['00001074', '00002000']);
      const first = renderProvider();
      act(() => first.get().setActiveClient('00002000'));

      clearStoredActiveClient();
      const nextSession = renderProvider();

      expect(nextSession.get().activeClient).toBe('00001074');
    });
  });

  /**
   * Entitlements come from the token, so they change between sessions — a client revoked, or a
   * different user in the same tab. A selection that is no longer entitled must fall back rather than
   * be sent and rejected with a 403. This matters more now the value outlives a reload.
   */
  it('falls back to the default when a stored selection is no longer entitled', () => {
    signedInWith(['00001074', '00002000']);
    const first = renderProvider();
    act(() => first.get().setActiveClient('00002000'));
    expect(first.get().activeClient).toBe('00002000');

    // Same stored selection, but the user is now entitled to a different set.
    signedInWith(['00003111', '00004000']);
    const second = renderProvider();

    expect(second.get().activeClient).toBe('00003111');
    expect(getActiveClientForHeader()).toBe('00003111');
  });
});
