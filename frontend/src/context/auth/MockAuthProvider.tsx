import React, { useEffect, useMemo, useState } from 'react';

import { clearStoredActiveClient } from '@/context/activeClient/activeClientStorage';
import { clearAllPersistentState } from '@/hooks/usePersistentState';

import { AuthContext, type AuthContextType, type AuthProviderProps } from './AuthContext';
import { setMockClientForHeader } from './mockClientHeader';
import { MockDevAuthContext, type MockDevAuthContextType, type MockDevClient } from './MockDevAuthContext';
import { setMockRolesForHeader } from './mockRolesHeader';
import { type FamLoginUser, type IdpProviderType, SYS_ADMIN_ROLE, type USER_PRIVILEGE_TYPE } from './types';

/**
 * Build a privileges map from a flat list of roles. Every role maps to `null`
 * (no scoped privilege values), matching how the single recognized SYS_ADMIN
 * role is represented today.
 */
const privilegesForRoles = (roles: string[]): USER_PRIVILEGE_TYPE =>
  Object.fromEntries(roles.map((role) => [role, null])) as USER_PRIVILEGE_TYPE;

// Dev-only: persist the mock session so it survives a page reload / deep-link (real auth uses cookies).
const MOCK_STATE_STORAGE_KEY = 'scs.mock.state';

type StoredMockState = {
  provider?: IdpProviderType;
  roles: string[];
  client?: MockDevClient;
};

const readStoredMockState = (): StoredMockState | undefined => {
  try {
    const raw = localStorage.getItem(MOCK_STATE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredMockState) : undefined;
  } catch {
    return undefined;
  }
};

export const MockAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [initialMockState] = useState(readStoredMockState);
  const [provider, setProvider] = useState<IdpProviderType | undefined>(initialMockState?.provider);
  // Developer-controllable mock state (see MockRoleClientPicker in the header profile).
  // Defaults to the only recognized role so the mock user is authorized out of the box.
  const [roles, setRoles] = useState<string[]>(initialMockState?.roles ?? [SYS_ADMIN_ROLE]);
  const [client, setClient] = useState<MockDevClient | undefined>(initialMockState?.client);

  // Mirror the current roles + client into the request headers so backend authorization and client
  // scoping track the picker selections; clear them when this provider unmounts.
  useEffect(() => {
    setMockRolesForHeader(roles);
    setMockClientForHeader(client?.clientNumbers);
    return () => {
      setMockRolesForHeader(undefined);
      setMockClientForHeader(undefined);
    };
  }, [roles, client]);

  // Persist the session (or clear it on logout) so a reload / deep-link keeps the mock user.
  useEffect(() => {
    try {
      if (provider) {
        localStorage.setItem(MOCK_STATE_STORAGE_KEY, JSON.stringify({ provider, roles, client }));
      } else {
        localStorage.removeItem(MOCK_STATE_STORAGE_KEY);
      }
    } catch {
      /* storage unavailable — mock still works for this session */
    }
  }, [provider, roles, client]);

  const login = (loginProvider: IdpProviderType) => {
    console.log('Mock login triggered', { provider: loginProvider });
    setProvider(loginProvider);
  };

  const logout = () => {
    console.log('Mock logout triggered');
    clearAllPersistentState();
    // Persisted separately (it must survive a refresh), so it needs clearing separately.
    clearStoredActiveClient();
    setProvider(undefined);
    // Reset developer selections so the next mock login starts from a clean, authorized state.
    setRoles([SYS_ADMIN_ROLE]);
    setClient(undefined);
  };

  const userToken = async () => {
    return 'mock-jwt-token';
  };

  // Derive the mock user from the current provider + developer-selected roles/client so switching
  // them live-updates authorization and client scoping (e.g. dropping SCS_SYS_ADMIN redirects to
  // /unauthorized; picking a client locks the search filter — exactly as real auth would).
  const user = useMemo<FamLoginUser | undefined>(() => {
    if (!provider) {
      return undefined;
    }
    const clientNumbers = client?.clientNumbers ?? [];
    return {
      userName: 'MOCK_USER',
      displayName: 'Mock Clerical User',
      email: 'mock.user@example.com',
      idpProvider: provider,
      roles,
      firstName: 'Mock',
      lastName: 'User',
      privileges: privilegesForRoles(roles),
      clientNumbers,
      isClientRestricted: clientNumbers.length > 0,
    };
  }, [provider, roles, client]);

  const mockContextValue: AuthContextType = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading: false,
      login,
      logout,
      userToken,
    }),
    [user],
  );

  const devContextValue: MockDevAuthContextType = useMemo(
    () => ({ roles, setRoles, client, setClient }),
    [roles, client],
  );

  return (
    <AuthContext.Provider value={mockContextValue}>
      <MockDevAuthContext.Provider value={devContextValue}>{children}</MockDevAuthContext.Provider>
    </AuthContext.Provider>
  );
};
