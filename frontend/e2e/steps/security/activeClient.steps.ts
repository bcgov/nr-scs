import { When, Then, expect } from '../fixtures';

import {
  INDUSTRY_SCALER_ROLE,
  SCALE_SITE_OWNER_ROLE,
  SYS_ADMIN_ROLE,
  expectedFallbackOrganization,
  expectedOwnerOrganization,
  ownerClientNumber,
  unresolvableClientNumber,
} from '../../fixtures/security/welcome-test-data';

/**
 * SEC-11 — the ACTIVE-CLIENT seam: which one of a multi-client external user's clients a request acts
 * as, and what happens when the switcher asks for one they do not hold.
 *
 * **Why this belongs to no role suite.** Both external suites exercise a user with exactly ONE forest
 * client, and each recorded the same gap ("the multi-client external user is not covered"). The
 * property is not about either role — `ActiveClientResolver` is role-blind — it is about how a request
 * chooses its client, so it sits with the other cross-cutting seams.
 *
 * **Why the behaviour needs a test at all.** It CHANGED. SEC-7 originally refused a multi-client token
 * with 403 outright; the switcher now supports it, and nothing was asserting the new rules:
 *
 *   - no selection → the **lowest-numbered** entitled client (sorted, not first-of-set, so the default
 *     cannot vary between requests);
 *   - a selection the token grants → that client;
 *   - a selection the token does **not** grant → **403**, refused rather than quietly downgraded to an
 *     entitled client. That distinction is the security-relevant one: a silent fallback would let a
 *     caller enumerate which clients are theirs by watching whether the response changed.
 *   - an internal user → the header is **ignored**, because honouring it would silently narrow their
 *     admin screens.
 *
 * **What makes the active client observable.** `GET /api/welcome` resolves `userOrganization` from the
 * active client, so the response names which one won — a status code cannot. The two anchors were
 * chosen so their organizations are unmistakably different strings (a company name versus a bare
 * number), which is what lets one field distinguish four outcomes.
 */

/** The two clients the multi-client probes are entitled to. Lowest-numbered is the owner's. */
const MULTI_CLIENT = [ownerClientNumber, unresolvableClientNumber];

/** A real client neither anchor is entitled to — client `00027212` owns scaler licence `653D`. */
const UNENTITLED_CLIENT = '00027212';

type WelcomeSummary = { userOrganization?: string | null };

const organizationFor = async (probe: {
  json: <T>(path: string) => Promise<T>;
}): Promise<string> => {
  const summary = await probe.json<WelcomeSummary>('/api/welcome');
  return summary.userOrganization ?? '';
};

When('a multi-client owner calls the API with no client selected', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], MULTI_CLIENT);
  world.expected = { organization: await organizationFor(probe) };
});

When('a multi-client owner switches to its other client', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], MULTI_CLIENT, unresolvableClientNumber);
  world.expected = { organization: await organizationFor(probe) };
});

When('a multi-client owner asks to act as a client it does not hold', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], MULTI_CLIENT, UNENTITLED_CLIENT);
  world.apiStatus = await probe.status('GET', '/api/welcome');
  // The contrast that makes the 403 attributable to the SELECTION rather than to the endpoint: same
  // role, same clients, same call — an entitled selection, and it succeeds. Inside one scenario,
  // because `fullyParallel` gives every scenario its own context and a pair split across two could not
  // prove they differed only in the header.
  const entitled = await apiAs([SCALE_SITE_OWNER_ROLE], MULTI_CLIENT, ownerClientNumber);
  world.baselineApiStatus = await entitled.status('GET', '/api/welcome');
});

When('an internal user asks to act as a forest client', async ({ apiAs, world }) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], [], UNENTITLED_CLIENT);
  world.apiStatus = await probe.status('GET', '/api/welcome');
  world.expected = { organization: await organizationFor(probe) };
});

When('a single-client industry scaler calls the API', async ({ apiAs, world }) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [unresolvableClientNumber]);
  world.expected = { organization: await organizationFor(probe) };
});

Then('the request should act as the lowest-numbered client', async ({ world }) => {
  expect(
    (world.expected ?? {}).organization,
    'with no switcher selection the resolver must pick the lowest-numbered entitled client, and pick ' +
      'it the same way every time — it sorts rather than taking the first of a set, so the default ' +
      'cannot drift between requests',
  ).toBe(expectedOwnerOrganization);
});

Then('the request should act as the selected client', async ({ world }) => {
  expect(
    (world.expected ?? {}).organization,
    'a switcher selection the token grants must take effect — otherwise the switcher is decorative ' +
      'and a multi-client user can only ever reach one of their clients',
  ).toBe(expectedFallbackOrganization);
});

Then('the request should be refused rather than silently downgraded', async ({ world }) => {
  expect(
    world.apiStatus,
    'a selection the token does not grant must be REFUSED. Falling back to an entitled client would ' +
      'answer 200 for every value, letting a caller enumerate which clients are theirs by watching ' +
      'whether the organization changed',
  ).toBe(403);
  expect(
    world.baselineApiStatus,
    'and the same call with an ENTITLED selection must succeed, or the 403 above could be the ' +
      'endpoint, the role, or the client header itself rather than the selection',
  ).toBe(200);
});

Then('the selection should be ignored', async ({ world }) => {
  expect(
    world.apiStatus,
    'an internal user must not be refused for naming a client — the header is not theirs to use',
  ).toBe(200);
  expect(
    (world.expected ?? {}).organization,
    'and it must not take effect either: honouring it would silently narrow an administrator’s ' +
      'screens to one forest client, which is a scoping change disguised as a preference',
  ).toBe('');
});

Then('it should act as its only client', async ({ world }) => {
  expect(
    (world.expected ?? {}).organization,
    'the single-client case must keep working unchanged — it is what every other external scenario ' +
      'in the suite assumes, and the switcher must not have made it conditional on a header',
  ).toBe(expectedFallbackOrganization);
});
