import { inject, vi } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    apiManifest: Record<string, string[]>;
  }
}

/**
 * A stand-in for `@/services/APIs` for component tests.
 *
 * Rendering a page runs its data loading, which would otherwise reach the network and leave the
 * suite dependent on a backend. Rather than enumerate 33 services and their methods — a list that
 * would rot the moment a service gained a method — every property access is resolved lazily and
 * memoised, so `API.<anything>.<anything>` is a `vi.fn` that resolves to an empty list.
 *
 * Use it from a test file with:
 *
 *     vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
 *
 * Then override the calls a test cares about:
 *
 *     apiMock.scalers.getScaler.mockResolvedValue({ scalerLicenceNo: 'S1' });
 *
 * An empty array is the default because most calls back a list that the page maps over; a page
 * expecting a single record should say so explicitly, which also documents what it needs.
 */

type AnyFn = ReturnType<typeof vi.fn>;

/**
 * Service and method names of the real `@/services/APIs`, gathered once by `apiManifest.globalSetup.ts`
 * (importing the real module from inside this mock would deadlock, since it is the module being
 * mocked). Every name a test or the page under test touches is checked against it: without that,
 * `API.<typo>.<anything>` would mint a mock resolving to an empty list and a wrong or removed method
 * name could never fail a test.
 */
const manifest = inject('apiManifest');

const assertKnown = (service: string, method?: string): void => {
  const methods = manifest[service];
  if (!methods) {
    throw new Error(`apiMock: "${service}" is not a service on @/services/APIs`);
  }
  if (method !== undefined && !methods.includes(method)) {
    throw new Error(`apiMock: "${service}.${method}" is not a method on @/services/APIs`);
  }
};

const services = new Map<string, Record<string, AnyFn>>();

/** Every mock handed out so far, so `resetApiMock` can clear them all. */
const allMethods: AnyFn[] = [];

const makeService = (serviceName: string): Record<string, AnyFn> => {
  const methods = new Map<string, AnyFn>();

  return new Proxy({} as Record<string, AnyFn>, {
    get(_target, property) {
      if (typeof property !== 'string') {
        return undefined;
      }
      // Vitest and assertion libraries probe for these; answering with a mock confuses them.
      if (property === 'then' || property === 'constructor') {
        return undefined;
      }

      let method = methods.get(property);
      if (!method) {
        assertKnown(serviceName, property);
        method = vi.fn().mockResolvedValue([]);
        methods.set(property, method);
        allMethods.push(method);
      }
      return method;
    },
    has: () => true,
  });
};

export const apiMock = new Proxy({} as Record<string, Record<string, AnyFn>>, {
  get(_target, property) {
    if (typeof property !== 'string') {
      return undefined;
    }
    if (property === 'then') {
      return undefined;
    }

    let service = services.get(property);
    if (!service) {
      assertKnown(property);
      service = makeService(property);
      services.set(property, service);
    }
    return service;
  },
  has: () => true,
});

/**
 * Clears call history and restores the default empty-list resolution. Call it in `beforeEach`, or
 * one test's `mockResolvedValue` leaks into the next.
 */
export const resetApiMock = (): void => {
  allMethods.forEach((method) => {
    method.mockReset();
    method.mockResolvedValue([]);
  });
};

export const BackendApiConfig = {
  BASE: '/api',
  VERSION: '0',
  WITH_CREDENTIALS: true,
  CREDENTIALS: 'include',
  TOKEN: async () => 'test-token',
  USERNAME: undefined,
  PASSWORD: undefined,
  HEADERS: undefined,
  ENCODE_PATH: undefined,
};

export default apiMock;
