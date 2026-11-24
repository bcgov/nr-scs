import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerBackgroundSync, registerPeriodicSync } from './utils';

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
const originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions');

const install = ({
  managers = ['SyncManager', 'PeriodicSyncManager'],
  permission = 'granted',
  queryThrows = false,
  noPermissionsApi = false,
  registerThrows = false,
}: {
  managers?: string[];
  permission?: string;
  queryThrows?: boolean;
  noPermissionsApi?: boolean;
  registerThrows?: boolean;
} = {}) => {
  const register = vi.fn(async () => {
    if (registerThrows) {
      throw new Error('nope');
    }
  });
  const registration = { sync: { register }, periodicSync: { register } };
  Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve(registration) }, configurable: true });
  for (const m of managers) {(window as unknown as Record<string, unknown>)[m] = function Manager() {};}
  if (noPermissionsApi) {
    // happy-dom exposes navigator.permissions on the prototype, so it is shadowed rather than removed.
    Object.defineProperty(navigator, 'permissions', { value: undefined, configurable: true });
  } else {
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn(async () => {
          if (queryThrows) {
            throw new Error('unsupported');
          }
          return { state: permission };
        }),
      },
      configurable: true,
    });
  }
  return { register };
};

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SyncManager;
  delete (window as unknown as Record<string, unknown>).PeriodicSyncManager;
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
  } else {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  }
  if (originalPermissions) {
    Object.defineProperty(navigator, 'permissions', originalPermissions);
  } else {
    delete (navigator as unknown as Record<string, unknown>).permissions;
  }
});

describe('registerBackgroundSync', () => {
  it('registers the tag when the browser allows it', async () => {
    const { register } = install();

    await expect(registerBackgroundSync('sync-mutations')).resolves.toBe(true);
    expect(register).toHaveBeenCalledWith('sync-mutations');
  });

  it('declines when the browser has no sync manager', async () => {
    install({ managers: [] });

    await expect(registerBackgroundSync('t')).resolves.toBe(false);
  });

  it('declines when permission is denied, or cannot be asked', async () => {
    install({ permission: 'denied' });
    await expect(registerBackgroundSync('t')).resolves.toBe(false);

    install({ queryThrows: true });
    await expect(registerBackgroundSync('t')).resolves.toBe(false);

    install({ noPermissionsApi: true });
    await expect(registerBackgroundSync('t')).resolves.toBe(false);
  });

  it('declines when registration itself fails', async () => {
    install({ registerThrows: true });

    await expect(registerBackgroundSync('t')).resolves.toBe(false);
  });
});

describe('registerPeriodicSync', () => {
  it('registers with the requested interval', async () => {
    const { register } = install();

    await expect(registerPeriodicSync('refresh', 60_000)).resolves.toBe(true);
    expect(register).toHaveBeenCalledWith('refresh', { minInterval: 60_000 });
  });

  it('declines without a periodic sync manager, without permission, or when registration fails', async () => {
    install({ managers: ['SyncManager'] });
    await expect(registerPeriodicSync('t', 1)).resolves.toBe(false);

    install({ permission: 'denied' });
    await expect(registerPeriodicSync('t', 1)).resolves.toBe(false);

    install({ registerThrows: true });
    await expect(registerPeriodicSync('t', 1)).resolves.toBe(false);
  });
});
