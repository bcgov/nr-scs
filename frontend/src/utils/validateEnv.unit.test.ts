import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({
  current: {} as Record<string, string | undefined>,
}));
vi.mock('@/env', () => ({
  get env() {
    return env.current;
  },
}));

import { validateEnv } from './validateEnv';

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  env.current = {};
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => consoleError.mockRestore());

describe('validateEnv', () => {
  it('says nothing in mock-user mode, whatever else is missing', () => {
    env.current = { VITE_MOCK_USER: 'true' };

    validateEnv();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('accepts the Keycloak issuer and client id', () => {
    env.current = {
      VITE_KEYCLOAK_URL: ' https://dev.loginproxy.gov.bc.ca/auth/realms/standard ',
      VITE_KEYCLOAK_CLIENT_ID: 'scs-client',
    };

    validateEnv();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('complains when neither is present, including blank values', () => {
    env.current = { VITE_KEYCLOAK_URL: '  ', VITE_KEYCLOAK_CLIENT_ID: '' };

    validateEnv();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('VITE_KEYCLOAK_URL and VITE_KEYCLOAK_CLIENT_ID not set'),
    );
  });

  it('complains when only one of the two is set', () => {
    env.current = { VITE_KEYCLOAK_URL: 'https://issuer' };

    validateEnv();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('VITE_KEYCLOAK_CLIENT_ID not set'),
    );
  });
});
