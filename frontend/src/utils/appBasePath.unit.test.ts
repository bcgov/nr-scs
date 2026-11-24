import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApiBasePath, getAppBasePath } from './appBasePath';

/**
 * The production branches read `import.meta.env` and the runtime Amplify config, so each case
 * stubs DEV off and sets the config the deployed app would have been given.
 */
const setRuntimeContext = (context?: string) => {
  (window as unknown as { amplifyConfig?: unknown }).amplifyConfig = context
    ? { Auth: { Cognito: { context } } }
    : undefined;
};

beforeEach(() => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('BASE_URL', '/');
  setRuntimeContext(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  setRuntimeContext(undefined);
});

describe('getAppBasePath', () => {
  it('is always / under the dev server, whatever the build set', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('BASE_URL', '/ext/scs/');

    expect(getAppBasePath()).toBe('/');
  });

  it('prefers the runtime Amplify context over the build-time BASE_URL', () => {
    vi.stubEnv('BASE_URL', '/build-time');
    setRuntimeContext('/ext/scs');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('falls back to BASE_URL when the runtime context is absent or blank', () => {
    vi.stubEnv('BASE_URL', '/ext/scs');
    setRuntimeContext('   ');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('adds a leading slash to a context that lacks one', () => {
    setRuntimeContext('ext/scs');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('strips a trailing slash so callers can concatenate safely', () => {
    setRuntimeContext('/ext/scs/');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('leaves a bare root as / rather than stripping it to empty', () => {
    setRuntimeContext('/');

    expect(getAppBasePath()).toBe('/');
  });
});

describe('getApiBasePath', () => {
  it('is /api under the dev server', () => {
    vi.stubEnv('DEV', true);

    expect(getApiBasePath()).toBe('/api');
  });

  it('is /api at the root, without doubling the slash', () => {
    setRuntimeContext('/');

    expect(getApiBasePath()).toBe('/api');
  });

  it('appends /api to a deployed context path', () => {
    setRuntimeContext('/ext/scs');

    expect(getApiBasePath()).toBe('/ext/scs/api');
  });
});
