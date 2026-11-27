import { env } from '@/env';

import {
  AVAILABLE_ROLES,
  EXTERNAL_CLIENT_ROLES,
  isClientScopedRole,
  SYS_ADMIN_ROLE,
  type FamLoginUser,
  type IdpProviderType,
  type JwtClaims,
  type ROLE_TYPE,
  type USER_PRIVILEGE_TYPE,
} from './types';

const asString = (claims: JwtClaims | undefined, name: string): string => {
  const value = claims?.[name];
  return typeof value === 'string' ? value : '';
};

/**
 * Normalises the realm's `identity_provider` alias to SCS's provider type. A CSS integration using
 * IDIR - MFA reports `azureidir`, not `idir`; every IDIR alias folds to `IDIR`, and any BCeID alias
 * to `BCEIDBUSINESS`. Unrecognised providers are `undefined` rather than guessed at.
 * @param {string | undefined} raw - The `identity_provider` claim.
 * @returns {IdpProviderType | undefined} The normalised provider.
 */
export const normalizeProvider = (raw: string | undefined): IdpProviderType | undefined => {
  const alias = raw?.trim().toLowerCase();
  if (!alias) {
    return undefined;
  }
  if (alias === 'idir' || alias === 'azureidir' || alias === 'azure-idir') {
    return 'IDIR';
  }
  if (alias.startsWith('bceid')) {
    return 'BCEIDBUSINESS';
  }
  return undefined;
};

/**
 * The username without provider prefix: `idir_username` / `bceid_username` verbatim, otherwise the
 * GUID (from `preferred_username` `<guid>@<idp>`, then `idir_user_guid` / `bceid_user_guid`),
 * upper-cased — a GUID's hex spelling carries no meaning and arrives in mixed case. Mirrors the
 * backend's `JWTService`.
 * @param {JwtClaims} claims - The decoded access-token claims.
 * @returns {string} The username, or an empty string.
 */
const resolveUsername = (claims: JwtClaims): string => {
  const named = asString(claims, 'idir_username') || asString(claims, 'bceid_username');
  if (named) {
    return named;
  }

  const preferred = asString(claims, 'preferred_username');
  const at = preferred.indexOf('@');
  const guid =
    at > 0
      ? preferred.slice(0, at)
      : asString(claims, 'idir_user_guid') || asString(claims, 'bceid_user_guid');
  return guid.toUpperCase();
};

/**
 * Builds the signed-in user from a decoded Keycloak (BC Gov SSO) access token.
 * @param {JwtClaims | undefined} claims - The decoded access-token claims.
 * @returns {FamLoginUser | undefined} The parsed user object, or undefined if there are no claims.
 */
export const parseToken = (claims: JwtClaims | undefined): FamLoginUser | undefined => {
  if (!claims) {
    return undefined;
  }
  const displayName = asString(claims, 'display_name') || asString(claims, 'name');
  const idpProvider = normalizeProvider(asString(claims, 'identity_provider'));
  const hasComma = displayName.includes(',');
  let [lastName, firstName] = hasComma ? displayName.split(', ') : displayName.split(' ');
  if (!hasComma) {
    [lastName, firstName] = [firstName, lastName];
  }
  const sanitizedFirstName = hasComma ? firstName?.split(' ')[0]?.trim() : firstName || '';
  const userName = resolveUsername(claims);
  const email = asString(claims, 'email');
  const clientRoles = extractClientRoles(claims);
  const clientNumbers = extractForestClientNumbers(clientRoles);
  return {
    userName,
    displayName,
    email,
    idpProvider,
    privileges: parsePrivileges(clientRoles),
    roles: extractRoles(clientRoles),
    firstName: sanitizedFirstName,
    lastName,
    providerUsername: `${idpProvider}\\${userName}`,
    clientNumbers,
    isClientRestricted: clientNumbers.length > 0,
  };
};

/** FAM bookkeeping roles (e.g. `FAM:EXPIRES:2026-09-30:SCS_CLERICAL`) that ride the token. */
const FAM_BOOKKEEPING_PREFIX = 'FAM:';

/**
 * The raw client-role strings in the token, before any SCS mapping. Reads both places Keycloak can
 * put them — CSS's flat `client_roles` claim and stock Keycloak's `resource_access.<clientId>.roles`
 * (only this integration's entry; the realm also adds `account`) — de-duplicated and trimmed, with
 * FAM bookkeeping entries dropped. These are what {@link roleFromGroup} and
 * {@link extractForestClientNumbers} interpret, including client-scoped `<role>_<clientNumber>`.
 * @param {JwtClaims | undefined} claims - The decoded access-token claims.
 * @returns {string[]} The client-role strings.
 */
export function extractClientRoles(claims: JwtClaims | undefined): string[] {
  if (!claims) {
    return [];
  }

  const direct = Array.isArray(claims.client_roles) ? (claims.client_roles as unknown[]) : [];

  const resourceAccess = claims.resource_access;
  const forThisClient =
    resourceAccess && typeof resourceAccess === 'object'
      ? (resourceAccess as Record<string, unknown>)[(env.VITE_KEYCLOAK_CLIENT_ID ?? '').trim()]
      : undefined;
  const nested: unknown[] =
    forThisClient &&
    typeof forThisClient === 'object' &&
    Array.isArray((forThisClient as { roles?: unknown }).roles)
      ? (forThisClient as { roles: unknown[] }).roles
      : [];

  return [...new Set([...direct, ...nested])]
    .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
    .map((role) => role.trim())
    .filter((role) => !role.toUpperCase().startsWith(FAM_BOOKKEEPING_PREFIX));
}

/**
 * Maps a client role to the canonical SCS role it grants: an exact (case-insensitive) match, or an
 * external role FAM delivers client-scoped as `<role>_<clientNumber>` mapped to its base role
 * (e.g. SCS_OWNER_00001074 → SCS_OWNER). Returns undefined otherwise. The client number itself is
 * data scope, read by extractForestClientNumbers.
 * @param {string} group - A single client-role string.
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
 * Parses client-role strings into a user privilege object, keyed by canonical role
 * (see {@link roleFromGroup} — recognises exact and client-scoped external groups).
 * @param {string[]} input - Client-role strings from the token.
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
 * Extracts the forest client number(s) from the `SCS_INDUSTRY_SCALER_*` / `SCS_OWNER_*` groups FAM
 * delivers (shape `<role>_<clientNumber>`, e.g. `SCS_OWNER_00001074`). A group contributes its suffix
 * only when it follows a recognised external-role prefix and is all digits — so a longer role sharing
 * the prefix is not mistaken for a client. Mirrors the backend parse.
 * @param {string[]} groups - The client-role strings from the token.
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
 * Extracts the recognized canonical role names from client roles (see {@link roleFromGroup} —
 * recognises exact and client-scoped external groups).
 * @param {string[]} groups - The client-role strings from the token.
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
