import { afterEach, describe, expect, it, vi } from 'vitest';

// isMockMode() reads env.VITE_MOCK_USER (mocked here) and import.meta.env.DEV (stubbed per test).
vi.mock('@/env', () => ({ env: { VITE_MOCK_USER: 'true' } }));

import { MOCK_CLIENT_HEADER, mockClientHeader, setMockClientForHeader } from './mockClientHeader';

afterEach(() => {
  vi.unstubAllEnvs();
  setMockClientForHeader(undefined);
});

describe('mockClientHeader', () => {
  it('emits the comma-joined client header in a dev mock build', () => {
    vi.stubEnv('DEV', true);
    setMockClientForHeader(['00001074', '00002000']);
    expect(mockClientHeader()).toEqual({ [MOCK_CLIENT_HEADER]: '00001074,00002000' });
  });

  it('emits nothing when no client is selected (internal, unrestricted mock)', () => {
    vi.stubEnv('DEV', true);
    setMockClientForHeader([]);
    expect(mockClientHeader()).toEqual({});
  });

  it('emits nothing when the client is unset', () => {
    vi.stubEnv('DEV', true);
    setMockClientForHeader(undefined);
    expect(mockClientHeader()).toEqual({});
  });

  it('emits nothing outside a dev build even when a client is set', () => {
    vi.stubEnv('DEV', false);
    setMockClientForHeader(['00001074']);
    expect(mockClientHeader()).toEqual({});
  });
});
