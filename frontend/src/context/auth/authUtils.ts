import { env } from '@/env';

import {
  AVAILABLE_ROLES,
  EXTERNAL_CLIENT_ROLES,
  isClientScopedRole,
  SYS_ADMIN_ROLE,
  validIdpProviders,
  type FamLoginUser,
  type IdpProviderType,
  type JWT,
  type ROLE_TYPE,
  type USER_PRIVILEGE_TYPE,
} from './types';

/**
 * Retrieves the value of a cookie by name.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string} The cookie value, or an empty string if not found.
 */
export const getCookie = (name: string): string => {
  const cookie = document.cookie
    .split(';')
    .find((cookieValue) => cookieValue.trim().startsWith(name));
  return cookie ? (cookie.split('=')[1] ?? '') : '';
};

/**
 * Retrieves the Cognito idToken for the current user from cookies.
 * @returns {string | undefined} The idToken string, or undefined if not found.
 */
export const getUserTokenFromCookie = (): string | undefined => {
  const baseCookieName = `CognitoIdentityServiceProvider.${env.VITE_USER_POOLS_WEB_CLIENT_ID}`;
  const userId = encodeURIComponent(getCookie(`${baseCookieName}.LastAuthUser`));
  if (userId) {
    return getCookie(`${baseCookieName}.${userId}.idToken`);
  } else {
    return undefined;
  }
};

/**
 * Parses a JWT token and returns a FamLoginUser object if valid.
 * @param {JWT | undefined} idToken - The JWT token to parse.
 * @returns {FamLoginUser | undefined} The parsed user object, or undefined if invalid.
 */
export const parseToken = (idToken: JWT | undefined): FamLoginUser | undefined => {
  if (!idToken) {
    return undefined;
  }
  const decodedIdToken = idToken?.payload;
  // Debug: print decoded token to help identify which claim contains roles
  try {
    if (env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('authUtils.parseToken decodedIdToken:', decodedIdToken);
    }
  } catch {
    // ignore logging errors
  }
  const displayName = (decodedIdToken?.['custom:idp_display_name'] as string) || '';
  const idpProvider = validIdpProviders.includes(
    (decodedIdToken?.['custom:idp_name'] as string)?.toUpperCase() as IdpProviderType,
  )
    ? ((decodedIdToken?.['custom:idp_name'] as string).toUpperCase() as IdpProviderType)
    : undefined;
  const hasComma = displayName.includes(',');
  let [lastName, firstName] = hasComma ? displayName.split(', ') : displayName.split(' ');
  if (!hasComma) {
    [lastName, firstName] = [firstName, lastName];
  }
  const sanitizedFirstName = hasComma ? firstName?.split(' ')[0]?.trim() : firstName || '';
  const userName = (decodedIdToken?.['custom:idp_username'] as string) || '';
  const email = (decodedIdToken?.['email'] as string) || '';
  const cognitoGroups = extractGroups(decodedIdToken);
  const clientNumbers = extractForestClientNumbers(cognitoGroups);
  return {
    userName,
    displayName,
    email,
    idpProvider,
    privileges: parsePrivileges(cognitoGroups),
    roles: extractRoles(cognitoGroups),
    firstName: sanitizedFirstName,
    lastName,
    providerUsername: `${idpProvider}\\${userName}`,
    clientNumbers,
    isClientRestricted: clientNumbers.length > 0,
  };
};


/**
 * Maps a Cognito group to the canonical SCS role it grants: an exact (case-insensitive) match, or an
 * external role FAM delivers client-scoped as `<role>_<clientNumber>` mapped to its base role
 * (e.g. SCS_OWNER_00001074 → SCS_OWNER). Returns undefined otherwise. The client number itself is
 * data scope, read by extractForestClientNumbers.
 * @param {string} group - A single Cognito group string.
 * @returns {ROLE_TYPE | undefined} The canonical role, or undefined if the group grants none.
 */
export function roleFromGroup(group: string): ROLE_TYPE | undefined {
  const upper = group.toUpperCase();
  const exact = AVAILABLE_ROLES.find((role) => role === upper);
  if (exact) {
    return exact;
  }
  for (const role of EXTERNAL_CLIENT_ROLES) {
    const prefix = `${role}_`;
    if (upper.startsWith(prefix) && /^\d+$/.test(group.substring(prefix.length))) {
      return role;
    }
  }
  return undefined;
}

/**
 * Parses Cognito group strings into a user privilege object, keyed by canonical role
 * (see {@link roleFromGroup} — recognises exact and client-scoped external groups).
 * @param {string[]} input - Array of group strings from Cognito.
 * @returns {USER_PRIVILEGE_TYPE} The parsed privilege object.
 */
export function parsePrivileges(input: string[]): USER_PRIVILEGE_TYPE {
  const result: USER_PRIVILEGE_TYPE = {};
  for (const item of input) {
    const role = roleFromGroup(item);
    if (role) {
      result[role] = null;
    }
  }
  return result;
}

/**
 * Extracts Cognito groups from a decoded JWT payload.
 * @param {object | undefined} decodedIdToken - The decoded JWT payload.
 * @returns {string[]} Array of group strings, or empty array if none found.
 */
export function extractGroups(decodedIdToken: object | undefined): string[] {
  if (!decodedIdToken) {
    return [];
  }
  if ('cognito:groups' in decodedIdToken) {
    return decodedIdToken['cognito:groups'] as string[];
  }
  return [];
}

/**
 * Extracts the forest client number(s) from the `SCS_INDUSTRY_SCALER_*` / `SCS_OWNER_*` groups FAM
 * delivers (shape `<role>_<clientNumber>`, e.g. `SCS_OWNER_00001074`). A group contributes its suffix
 * only when it follows a recognised external-role prefix and is all digits — so a longer role sharing
 * the prefix is not mistaken for a client. Mirrors the backend parse.
 * @param {string[]} groups - The Cognito group strings from the token.
 * @returns {string[]} The de-duplicated client numbers, or empty for internal users.
 */
export function extractForestClientNumbers(groups: string[]): string[] {
  if (!groups || groups.length === 0) {
    return [];
  }
  const clientNumbers = new Set<string>();
  for (const group of groups) {
    const upper = group.toUpperCase();
    for (const role of EXTERNAL_CLIENT_ROLES) {
      const prefix = `${role}_`;
      if (upper.startsWith(prefix)) {
        const clientNumber = group.substring(prefix.length).trim();
        if (/^\d+$/.test(clientNumber)) {
          clientNumbers.add(clientNumber);
        }
        break;
      }
    }
  }
  return Array.from(clientNumbers);
}

/**
 * Extracts the recognized canonical role names from Cognito groups (see {@link roleFromGroup} —
 * recognises exact and client-scoped external groups).
 * @param {string[]} groups - The Cognito group strings from the token.
 * @returns {string[]} The de-duplicated list of recognized roles.
 */
export function extractRoles(groups: string[]): string[] {
  if (!groups || groups.length === 0) {
    return [];
  }
  const roles = groups.map(roleFromGroup).filter((role): role is ROLE_TYPE => role !== undefined);
  return Array.from(new Set(roles));
}

/**
 * Whether a user is an SCS system administrator. No longer the portal gate — that is
 * {@link hasWelcomeAccess} plus the permission checks in `permissions.ts`. This remains only where
 * "administrator" is genuinely meant: the system-disable bypass, so an admin can re-enable a disabled
 * system while everyone else sees the interstitial.
 * @param {FamLoginUser | undefined} user - The authenticated user, if any.
 * @returns {boolean} True if the user holds the system administrator role.
 */
export const isSystemAdministrator = (user: FamLoginUser | undefined): boolean =>
  user?.roles?.includes(SYS_ADMIN_ROLE) ?? false;

/**
 * Whether a user may view the welcome page and call its supporting endpoints. Any recognised role
 * grants access, matched case-sensitively against {@link AVAILABLE_ROLES}.
 *
 * A client-scoped role does not count without a forest client number — it grants no permissions (see
 * `permissionsFor`), so counting it would land the user on a page whose every API call 403s. An internal
 * role held alongside it still grants access.
 * @param {FamLoginUser | undefined} user - The authenticated user, if any.
 * @returns {boolean} True if the user holds at least one defined, effective role.
 */
export const hasWelcomeAccess = (user: FamLoginUser | undefined): boolean => {
  const hasClient = (user?.clientNumbers?.length ?? 0) > 0;
  return (
    user?.roles?.some(
      (role) =>
        AVAILABLE_ROLES.includes(role as ROLE_TYPE) &&
        (hasClient || !isClientScopedRole(role)),
    ) ?? false
  );
};
