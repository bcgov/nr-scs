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

const win = window as unknown as { amplifyConfig?: unknown };
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  env.current = {};
  delete win.amplifyConfig;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => consoleError.mockRestore());

describe('validateEnv', () => {
  it('says nothing in mock-user mode, whatever else is missing', () => {
    env.current = { VITE_MOCK_USER: 'true' };

    validateEnv();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('accepts a runtime amplify configuration', () => {
    win.amplifyConfig = { Auth: {} };

    validateEnv();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('accepts build-time user pool variables', () => {
    env.current = { VITE_USER_POOLS_ID: ' pool ', VITE_USER_POOLS_WEB_CLIENT_ID: 'client' };

    validateEnv();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('complains when neither source is present, including blank variables', () => {
    env.current = { VITE_USER_POOLS_ID: '  ', VITE_USER_POOLS_WEB_CLIENT_ID: '' };

    validateEnv();

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('No Cognito auth configuration found'));
  });

  it('complains when only one of the two build-time variables is set', () => {
    env.current = { VITE_USER_POOLS_ID: 'pool' };

    validateEnv();

    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
