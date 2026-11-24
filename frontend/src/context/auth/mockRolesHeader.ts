import { env } from '@/env';

/**
 * Dev-only bridge that forwards the mock user's roles to the backend so local API
 * authorization mirrors the role chosen in the frontend mock picker.
 *
 * The value is set by {@link MockAuthProvider} and read by the shared request-header
 * builders. Outside mock mode (real auth / production build) nothing is emitted, so real
 * requests are never affected. The backend only honours this header when it is running in
 * local/dev mock mode (see the backend `MockRequestFilter`).
 */
export const MOCK_ROLES_HEADER = 'X-Mock-Roles';

/**
 * Sentinel sent when the mock user has no roles. Sending an explicit non-empty value (rather than an
 * empty header) ensures a "no role" selection cannot be lost to header stripping and mistaken for an
 * absent header — which the backend treats as the full-access default. Kept in sync with the backend
 * `MockRequestFilter.MOCK_ROLES_NONE`.
 */
export const MOCK_ROLES_NONE = 'none';

let currentMockRoles: string[] | undefined;

/** Mirror the current mock roles here so the request layer can forward them. `undefined` clears it. */
export const setMockRolesForHeader = (roles: string[] | undefined): void => {
  currentMockRoles = roles;
};

const isMockMode = (): boolean => import.meta.env.DEV && env.VITE_MOCK_USER === 'true';

/**
 * The mock-roles header to merge into an API request, or an empty object when not applicable.
 * An empty role list is sent as the {@link MOCK_ROLES_NONE} sentinel so selecting "no role" reliably
 * produces a 403 on secured endpoints instead of silently falling back to admin.
 */
export const mockRolesHeader = (): Record<string, string> => {
  if (!isMockMode() || currentMockRoles === undefined) {
    return {};
  }
  return { [MOCK_ROLES_HEADER]: currentMockRoles.length ? currentMockRoles.join(',') : MOCK_ROLES_NONE };
};
