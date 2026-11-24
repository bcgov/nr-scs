/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { AuthContext } from './AuthContext';
import { AuthProvider } from './AuthProvider';

// Mock mode is selected by `import.meta.env.DEV && env.VITE_MOCK_USER === 'true'`. These tests pin
// the security-critical behaviour: the VITE_MOCK_USER flag must only enable the mock (SYS_ADMIN)
// user in a development build, never in a production build — even when the flag is set to 'true'.
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/env', () => ({ env: { VITE_MOCK_USER: 'true', VITE_ZONE: 'TEST' } }));
vi.mock('./authUtils', () => ({
  parseToken: vi.fn((token) => ({ id: 'user', name: 'Test User', token })),
  getUserTokenFromCookie: vi.fn(() => undefined),
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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('AuthProvider mock-mode gating (security)', () => {
  it('uses MOCK auth in a development build when VITE_MOCK_USER=true', async () => {
    vi.stubEnv('DEV', true);
    const { signInWithRedirect } = await import('aws-amplify/auth');
    const getCtx = renderAuth();

    await waitFor(() => expect(getCtx()).toBeDefined());
    await act(() => getCtx().login('IDIR'));

    expect(getCtx().user?.userName).toBe('MOCK_USER');
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  it('ignores VITE_MOCK_USER=true in a production build and uses REAL auth', async () => {
    vi.stubEnv('DEV', false);
    const { signInWithRedirect } = await import('aws-amplify/auth');
    const getCtx = renderAuth();

    await waitFor(() => expect(getCtx()).toBeDefined());
    await act(() => getCtx().login('IDIR'));

    expect(getCtx().user?.userName).not.toBe('MOCK_USER');
    expect(signInWithRedirect).toHaveBeenCalledWith({ provider: { custom: 'TEST-IDIR' } });
  });
});
