/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  readStoredActiveClient,
  writeStoredActiveClient,
} from '@/context/activeClient/activeClientStorage';

import { AuthContext } from './AuthContext';
import { MockAuthProvider } from './MockAuthProvider';
import { MockDevAuthContext, useMockDevAuth } from './MockDevAuthContext';
import { SYS_ADMIN_ROLE } from './types';

type Captured = {
  auth: any;
  dev: any;
};

function renderMock(): () => Captured {
  const captured: Captured = { auth: undefined, dev: undefined };
  render(
    <MockAuthProvider>
      <AuthContext.Consumer>
        {(auth) => (
          <MockDevAuthContext.Consumer>
            {(dev) => {
              captured.auth = auth;
              captured.dev = dev;
              return null;
            }}
          </MockDevAuthContext.Consumer>
        )}
      </AuthContext.Consumer>
    </MockAuthProvider>,
  );
  return () => captured;
}

describe('MockAuthProvider developer controls', () => {
  // The provider persists the mock session to localStorage and the active client to sessionStorage;
  // clear both so tests stay isolated.
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('logs in with the SYS_ADMIN role by default', () => {
    const get = renderMock();

    expect(get().auth.user).toBeUndefined();
    act(() => get().auth.login('IDIR'));

    expect(get().auth.user?.userName).toBe('MOCK_USER');
    expect(get().auth.user?.roles).toEqual([SYS_ADMIN_ROLE]);
    expect(get().auth.user?.privileges).toEqual({ [SYS_ADMIN_ROLE]: null });
    expect(get().auth.user?.isClientRestricted).toBe(false);
    expect(get().dev.roles).toEqual([SYS_ADMIN_ROLE]);
  });

  it('switching roles updates the user roles and privileges', () => {
    const get = renderMock();
    act(() => get().auth.login('IDIR'));

    act(() => get().dev.setRoles(['SCS_EDITOR', 'SCS_VIEWER']));

    expect(get().auth.user?.roles).toEqual(['SCS_EDITOR', 'SCS_VIEWER']);
    expect(get().auth.user?.privileges).toEqual({ SCS_EDITOR: null, SCS_VIEWER: null });
  });

  it('picking a client makes the mock user client-restricted', () => {
    const get = renderMock();
    act(() => get().auth.login('IDIR'));

    act(() => get().dev.setClient({ clientNumbers: ['00001074'] }));

    expect(get().auth.user?.clientNumbers).toEqual(['00001074']);
    expect(get().auth.user?.isClientRestricted).toBe(true);
  });

  it('stores an impersonated client and resets everything on logout', () => {
    const get = renderMock();
    act(() => get().auth.login('IDIR'));

    act(() => {
      get().dev.setClient({ clientNumbers: ['00123456'] });
      get().dev.setRoles([]);
    });

    expect(get().dev.client).toEqual({ clientNumbers: ['00123456'] });
    expect(get().auth.user?.roles).toEqual([]);

    // The active client is persisted outside the in-memory store so it survives a refresh, so logout
    // has to clear it explicitly — otherwise the next user of this tab inherits the scope.
    writeStoredActiveClient('00123456');

    act(() => get().auth.logout());

    expect(get().auth.user).toBeUndefined();
    expect(get().dev.client).toBeUndefined();
    expect(get().dev.roles).toEqual([SYS_ADMIN_ROLE]);
    expect(readStoredActiveClient()).toBeUndefined();
  });

  it('rehydrates the persisted mock session on reload', () => {
    const first = renderMock();
    act(() => first().auth.login('IDIR'));
    act(() => first().dev.setClient({ clientNumbers: ['00001074'] }));

    // Simulate a reload: a fresh provider should read the persisted session from localStorage.
    const second = renderMock();
    expect(second().auth.user?.userName).toBe('MOCK_USER');
    expect(second().auth.user?.clientNumbers).toEqual(['00001074']);
    expect(second().auth.user?.isClientRestricted).toBe(true);
  });
});

describe('useMockDevAuth', () => {
  it('returns undefined when used outside the mock provider', () => {
    let value: unknown = 'unset';
    const Probe = () => {
      value = useMockDevAuth();
      return null;
    };
    render(<Probe />);
    expect(value).toBeUndefined();
  });
});
