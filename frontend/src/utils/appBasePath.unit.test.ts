import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApiBasePath, getAppBasePath } from './appBasePath';

/** The production branches read `import.meta.env`, so each case stubs DEV off and sets BASE_URL. */
beforeEach(() => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('BASE_URL', '/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getAppBasePath', () => {
  it('is always / under the dev server, whatever the build set', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('BASE_URL', '/ext/scs/');

    expect(getAppBasePath()).toBe('/');
  });

  it('uses the build-time BASE_URL in a production build', () => {
    vi.stubEnv('BASE_URL', '/ext/scs');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('falls back to / when BASE_URL is blank', () => {
    vi.stubEnv('BASE_URL', '   ');

    expect(getAppBasePath()).toBe('/');
  });

  it('adds a leading slash to a base that lacks one', () => {
    vi.stubEnv('BASE_URL', 'ext/scs');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('strips a trailing slash so callers can concatenate safely', () => {
    vi.stubEnv('BASE_URL', '/ext/scs/');

    expect(getAppBasePath()).toBe('/ext/scs');
  });

  it('leaves a bare root as / rather than stripping it to empty', () => {
    expect(getAppBasePath()).toBe('/');
  });
});

describe('getApiBasePath', () => {
  it('is /api under the dev server', () => {
    vi.stubEnv('DEV', true);

    expect(getApiBasePath()).toBe('/api');
  });

  it('is /api at the root, without doubling the slash', () => {
    expect(getApiBasePath()).toBe('/api');
  });

  it('appends /api to a deployed base path', () => {
    vi.stubEnv('BASE_URL', '/ext/scs/');

    expect(getApiBasePath()).toBe('/ext/scs/api');
  });
});
