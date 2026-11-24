import { Given } from '../fixtures';

import {
  INDUSTRY_SCALER_ROLE,
  SYS_ADMIN_ROLE,
  ownClientNumber,
} from '../../fixtures/security/industry-scaler-test-data';
import {
  SCALE_SITE_OWNER_ROLE,
  ownClientNumber as ownerClientNumber,
} from '../../fixtures/security/scale-site-owner-test-data';

/**
 * The Given steps every SEC-8 scenario opens with: choose WHO is using the app before it boots.
 *
 * Kept in one file (rather than beside each level's steps) because the identity is the one thing all
 * three levels — GUI, URL, API — share, and a second copy of the sign-in phrase is how a suite ends up
 * with two subtly different mock users.
 *
 * Signing in is separate from navigating on purpose: `signInAs` only registers an init script, so a
 * scenario can state its identity in a Background and still let each step choose where to go.
 */

Given('I am signed in as an industry scaler for my own client', async ({ roleSession }) => {
  await roleSession.signInAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
});

/**
 * The client-scoped role held WITHOUT a forest client. Not an edge case to be tidied away: FAM delivers
 * the role and the client together, so this represents a misprovisioned external account, and the rule
 * is that it grants nothing at all (`RolePermissions.expandAuthorities` withholds every permission,
 * `WELCOME_READ` included) rather than falling back to unscoped access.
 */
Given('I am signed in as an industry scaler with no forest client', async ({ roleSession }) => {
  await roleSession.signInAs([INDUSTRY_SCALER_ROLE], []);
});

/**
 * Scale Site Owner — the second client-scoped external role. Its own client anchor, deliberately not
 * shared with the industry scaler's: both suites seed an in-force authorization on their client's scaler,
 * and two suites mutating one client's authorization list would collide under `fullyParallel` (see
 * `defects.md` V4 in the industry-scaler folder for the instance of that bug this avoids).
 */
Given('I am signed in as a scale site owner for my own client', async ({ roleSession }) => {
  await roleSession.signInAs([SCALE_SITE_OWNER_ROLE], [ownerClientNumber]);
});

/**
 * `SCS_OWNER` held WITHOUT a forest client. Asserted for this role as well as the industry scaler
 * because the rule is driven by per-role data (`Roles.CLIENT_SCOPED_ROLES` names both), not by one shared
 * branch — so it is genuinely possible for it to hold for one role and not the other.
 */
Given('I am signed in as a scale site owner with no forest client', async ({ roleSession }) => {
  await roleSession.signInAs([SCALE_SITE_OWNER_ROLE], []);
});

/**
 * The administrator baseline. Used only as a CONTRAST: it proves the thing the industry scaler cannot
 * reach exists and works, so a passing deny assertion means "the role is gated", not "the screen is
 * broken" or "the selector is wrong". Without it every deny assertion could pass vacuously.
 */
Given('I am signed in as a system administrator', async ({ roleSession }) => {
  await roleSession.signInAs([SYS_ADMIN_ROLE], []);
});

/**
 * Sign in as a role named by the scenario, for suites whose scenarios are outlined over several roles.
 *
 * Takes the `SCS_`-prefixed code rather than prose, because the point of an outlined role suite is that
 * the role is data: the read-only internal column covers three roles that resolve to the same permission
 * set, and naming them in the Examples table is what asserts that equality instead of assuming it.
 *
 * Internal roles only — no client array. A client-scoped role signed in this way would hold nothing at
 * all, which is a case its own suite asserts deliberately rather than something to reach by accident.
 */
Given('I am signed in as the {string} role', async ({ roleSession }, role) => {
  await roleSession.signInAs([role], []);
});
