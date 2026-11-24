import { afterEach, describe, expect, it, vi } from 'vitest';

// isMockMode() reads env.VITE_MOCK_USER (mocked here) and import.meta.env.DEV (stubbed per test).
vi.mock('@/env', () => ({ env: { VITE_MOCK_USER: 'true' } }));

import { MOCK_ROLES_HEADER, MOCK_ROLES_NONE, mockRolesHeader, setMockRolesForHeader } from './mockRolesHeader';

afterEach(() => {
  vi.unstubAllEnvs();
  setMockRolesForHeader(undefined);
});

describe('mockRolesHeader', () => {
  it('emits the comma-joined roles header in a dev mock build', () => {
    vi.stubEnv('DEV', true);
    setMockRolesForHeader(['SCS_SYS_ADMIN', 'SCS_OWNER']);
    expect(mockRolesHeader()).toEqual({ [MOCK_ROLES_HEADER]: 'SCS_SYS_ADMIN,SCS_OWNER' });
  });

  it('sends the none sentinel for an empty role list so it cannot be lost', () => {
    vi.stubEnv('DEV', true);
    setMockRolesForHeader([]);
    expect(mockRolesHeader()).toEqual({ [MOCK_ROLES_HEADER]: MOCK_ROLES_NONE });
  });

  it('emits nothing when the roles are unset', () => {
    vi.stubEnv('DEV', true);
    setMockRolesForHeader(undefined);
    expect(mockRolesHeader()).toEqual({});
  });

  it('emits nothing outside a dev build even when roles are set', () => {
    vi.stubEnv('DEV', false);
    setMockRolesForHeader(['SCS_SYS_ADMIN']);
    expect(mockRolesHeader()).toEqual({});
  });
});
