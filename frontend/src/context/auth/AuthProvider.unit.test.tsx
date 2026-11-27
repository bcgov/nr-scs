/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthContext } from './AuthContext';
import { AuthProvider } from './AuthProvider';

const manager = vi.hoisted(() => ({
  getUser: vi.fn(),
  signinCallback: vi.fn(),
}));
vi.mock('@/services/keycloak', () => ({
  getUserManager: () => manager,
  decodeTokenClaims: vi.fn((token: string) => ({ token })),
  ensureFreshUser: vi.fn(),
  signIn: vi.fn(),
  signOutRedirect: vi.fn(),
}));
vi.mock('@/env', () => ({ env: { VITE_ZONE: 'TEST', NODE_ENV: 'test' } }));
vi.mock('./authUtils', () => ({
  parseToken: vi.fn((claims) => (claims ? { userName: 'user', claims } : undefined)),
}));

function renderAuth(): () => any {
  let context: any;
  render(
    <AuthProvider>
      <AuthContext.Consumer>
        {(value) => {
          context = value;
          return null;
        }}
      </AuthContext.Consumer>
    </AuthProvider>,
  );
  return () => context;
}

beforeEach(() => {
  vi.clearAllMocks();
  manager.getUser.mockResolvedValue(null);
});

describe('AuthProvider (Keycloak)', () => {
  it('starts signed out when there is no stored session', async () => {
    const getCtx = renderAuth();
    await waitFor(() => expect(getCtx().isLoading).toBe(false));
    expect(getCtx().isLoggedIn).toBe(false);
  });

  it('hydrates the user from the stored ACCESS token', async () => {
    manager.getUser.mockResolvedValue({ access_token: 'stored-access' });
    const getCtx = renderAuth();
    await waitFor(() => expect(getCtx().isLoggedIn).toBe(true));
    expect(getCtx().user.claims).toEqual({ token: 'stored-access' });
  });

  it('sends each login button to its provider', async () => {
    const { signIn } = await import('@/services/keycloak');
    const getCtx = renderAuth();
    await waitFor(() => expect(getCtx()).toBeDefined());
    await act(() => getCtx().login('IDIR'));
    expect(signIn).toHaveBeenCalledWith('IDIR');
    await act(() => getCtx().login('BCEIDBUSINESS'));
    expect(signIn).toHaveBeenCalledWith('BCEIDBUSINESS');
  });

  it('completes the sign-in callback and sets the user', async () => {
    manager.signinCallback.mockResolvedValue({ access_token: 'new-access' });
    const getCtx = renderAuth();
    await waitFor(() => expect(getCtx().isLoading).toBe(false));
    await act(() => getCtx().completeSignIn());
    expect(getCtx().user.claims).toEqual({ token: 'new-access' });
  });

  it('logs out through the realm', async () => {
    const { signOutRedirect } = await import('@/services/keycloak');
    const getCtx = renderAuth();
    await waitFor(() => expect(getCtx()).toBeDefined());
    await act(() => getCtx().logout());
    expect(signOutRedirect).toHaveBeenCalled();
  });

  it('returns the fresh ACCESS token for API calls', async () => {
    const { ensureFreshUser } = await import('@/services/keycloak');
    (ensureFreshUser as any).mockResolvedValue({ access_token: 'fresh-access' });
    const getCtx = renderAuth();
    await waitFor(() => expect(getCtx()).toBeDefined());
    await expect(getCtx().userToken()).resolves.toBe('fresh-access');
  });
});
