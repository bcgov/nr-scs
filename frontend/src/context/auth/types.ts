/** Decoded claims of a Keycloak (BC Gov SSO) token. */
export type JwtClaims = Record<string, unknown>;

/**
 * The system administrator role. Currently the only role that grants access to
 * the portal and API; finer-grained roles will be added back later.
 */
export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

/**
 * Every role defined in the system, matched exactly (case-sensitive). {@link SYS_ADMIN_ROLE}
 * is currently the only role that grants full portal/API access; the remaining roles currently
 * grant access to the welcome page (and its supporting endpoints) only. Order is not significant.
 */
export const AVAILABLE_ROLES = [
  SYS_ADMIN_ROLE,
  'SCS_DIST_SCALING_MANAGER',
  'SCS_REGIONAL_SCALING_MANAGER',
  'SCS_CHECK_SCALER',
  'SCS_CE_TECHNICIAN',
  'SCS_BRANCH_SYS_SUPPORT',
  'SCS_CLERICAL',
  'SCS_INDUSTRY_SCALER',
  'SCS_OWNER',
  'SCS_DIST_MANAGER',
  'SCS_REGIONAL_MANAGER',
] as const;

export type ROLE_TYPE = (typeof AVAILABLE_ROLES)[number];

/** External FAM roles delivered forest-client-scoped, as `<role>_<clientNumber>` client roles. */
export const EXTERNAL_CLIENT_ROLES = ['SCS_INDUSTRY_SCALER', 'SCS_OWNER'] as const;

/**
 * Whether a role is only meaningful alongside a forest client number. Such a role held without one
 * grants no permissions and no welcome access — mirrors the backend's `Roles.isClientScoped`.
 * @param {string | undefined} role - The role name to test.
 * @returns {boolean} True when the role requires a client number.
 */
export const isClientScopedRole = (role: string | undefined): boolean =>
  role !== undefined && (EXTERNAL_CLIENT_ROLES as readonly string[]).includes(role);

type RoleValue = string[] | null;

export type USER_PRIVILEGE_TYPE = Partial<Record<ROLE_TYPE, RoleValue>>;

export const validIdpProviders = ['IDIR', 'BCEIDBUSINESS'] as const;

export type IdpProviderType = (typeof validIdpProviders)[number];

export type FamLoginUser = {
  providerUsername?: string;
  userName?: string;
  displayName?: string;
  email?: string;
  idpProvider?: IdpProviderType;
  roles?: string[];
  authToken?: string;
  exp?: number;
  privileges: USER_PRIVILEGE_TYPE;
  firstName?: string;
  lastName?: string;
  clientNumbers?: string[];
  isClientRestricted?: boolean;
};
