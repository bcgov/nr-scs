import { When } from '../fixtures';

import {
  INDUSTRY_SCALER_ROLE,
  SCALE_SITE_OWNER_ROLE,
  SYS_ADMIN_ROLE,
  indClientNumber,
  ownClientNumber,
} from '../../fixtures/security/cross-cutting-test-data';

/**
 * SEC-11 — the client-scope SEAM, asserted at the API level only.
 *
 * Deliberately no GUI or URL steps. The three-level rule exists because offering, routing and enforcing
 * fail independently; scoping of a record fetched BY ID has only one enforcement point — the server —
 * and the two external role suites already cover the screens that reach these records. Repeating them
 * here would duplicate rather than add a level.
 *
 * Only `When`s are defined. Every `Then` is reused from `apiAccess.steps.ts` and `clientScoping.steps.ts`
 * so this suite cannot drift from what "allowed" and "refused" mean everywhere else.
 *
 * The four identities below are the whole design. Two are external roles; two are the SAME administrator
 * role with and without a client header, which is what separates the scoping layer from the permission
 * layer — an administrator holds every permission, so anything it is refused is the scope guard acting
 * and nothing else.
 */

When(
  'I request {string} as a client-restricted industry scaler',
  async ({ apiAs, world }, path) => {
    const probe = await apiAs([INDUSTRY_SCALER_ROLE], [indClientNumber]);
    world.apiStatus = await probe.status('GET', path);
  },
);

When(
  'I request {string} as a client-restricted scale site owner',
  async ({ apiAs, world }, path) => {
    const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
    world.apiStatus = await probe.status('GET', path);
  },
);

/**
 * An administrator carrying a forest client — a legal combination (`Roles.isClientScoped` gates on the
 * role, `SecurityContextUtils.isClientRestricted` on the client header, and they are independent axes).
 *
 * This is the suite's sharpest probe. A refusal here cannot be a permission decision, because the caller
 * holds `ALL_PERMISSIONS`; it can only be `ClientScopeGuard`. That is how the invariant "scoping follows
 * client-restriction, not role" is proved rather than assumed — and the assumption matters, because it
 * is what makes enabling a twelfth role safe by default.
 */
When(
  "I request {string} as an administrator restricted to the industry scaler's client",
  async ({ apiAs, world }, path) => {
    const probe = await apiAs([SYS_ADMIN_ROLE], [indClientNumber]);
    world.apiStatus = await probe.status('GET', path);
  },
);

When(
  "I request {string} as an administrator restricted to the owner's client",
  async ({ apiAs, world }, path) => {
    const probe = await apiAs([SYS_ADMIN_ROLE], [ownClientNumber]);
    world.apiStatus = await probe.status('GET', path);
  },
);

/** The contrast half: the same role, no client header, so nothing is scoped. */
When('I request {string} as an unrestricted administrator', async ({ apiAs, world }, path) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], []);
  world.baselineApiStatus = await probe.status('GET', path);
});
