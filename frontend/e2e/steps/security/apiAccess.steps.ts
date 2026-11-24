import { When, Then, expect } from '../fixtures';

import {
  INDUSTRY_SCALER_ROLE,
  SYS_ADMIN_ROLE,
  buildWriteProbeBody,
  ownClientNumber,
  ownScalerLicenceNo,
} from '../../fixtures/security/industry-scaler-test-data';

/**
 * API level — what the SERVER allows, asked directly, with no browser involved.
 *
 * The other two levels describe an application that declines to offer something. Only this one shows
 * the request being refused when it is made anyway, which is the difference between a tidy UI and an
 * enforced permission model. Every endpoint here is reached through the same
 * `RolePermissions.expandAuthorities` → `@RequiresPermission` path a browser request takes; only the
 * identity is injected (see `ApiAccessProbe`).
 *
 * READ denials are asserted as "refused", with the exact status pinned by ONE scenario. The split is
 * deliberate: it separates the security property (the call does not succeed) from the status contract
 * (a denial is 403), so a regression in how denials are MAPPED produces one clear failure rather than
 * turning every deny row red. That is not hypothetical — it is what `defects.md` Divergence #1 did
 * before `GlobalApiExceptionHandler.handleAccessDenied` was added.
 *
 * WRITE denials cannot use that loose assertion, and each pins 403 individually. A GET has no body and
 * so has only one way to fail, but a write does: `@RequiresPermission` is method security, an AOP
 * interceptor around the handler, so body binding and bean validation run BEFORE it. A body-less write
 * is rejected by the binder at 400 without authorization being consulted at all — the identical 400 an
 * administrator gets — so ">= 400" is satisfied whether the role is denied or wrongly granted. The
 * writes therefore send a body that reaches authorization (`buildWriteProbeBody`) and pin the status,
 * and are paired with an administrator contrast proving the same body gets PAST authorization.
 */

When('I call {string} {string} as an industry scaler', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status(method, path);
});

When('I call {string} {string} as an industry scaler with no forest client', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], []);
  world.apiStatus = await probe.status(method, path);
});

When('I call {string} {string} as a system administrator', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], []);
  world.baselineApiStatus = await probe.status(method, path);
});

When(
  'I call {string} {string} with a bindable body as an industry scaler',
  async ({ apiAs, world }, method, path) => {
    const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
    world.apiStatus = await probe.status(method, path, buildWriteProbeBody(method, path));
  },
);

When(
  'I call {string} {string} with a bindable body as a system administrator',
  async ({ apiAs, world }, method, path) => {
    const probe = await apiAs([SYS_ADMIN_ROLE], []);
    world.baselineApiStatus = await probe.status(method, path, buildWriteProbeBody(method, path));
  },
);

// 2xx rather than exactly 200: the property under test is reachability, so a read endpoint that one day
// answers 204 is not a permission regression. Not "< 400" though — a 3xx is a redirect (a bounce to the
// login page being the obvious one), which is the opposite of the call having been allowed.
Then('the API should allow it', async ({ world }) => {
  expect(
    world.apiStatus,
    'the role holds this permission in roles-permissions.md §3, so the call must succeed',
  ).toBeGreaterThanOrEqual(200);
  expect(
    world.apiStatus,
    'the role holds this permission in roles-permissions.md §3, so the call must succeed',
  ).toBeLessThan(300);
});

Then('the API should refuse it', async ({ world }) => {
  expect(
    world.apiStatus,
    'the role does NOT hold this permission, so the call must not succeed (the exact status is ' +
      'pinned by its own scenario — see the header of api-access.feature)',
  ).toBeGreaterThanOrEqual(400);
});

Then('the API should refuse it with 403', async ({ world }) => {
  expect(
    world.apiStatus,
    'a permission denial is an authorization outcome and must answer 403, not a server error',
  ).toBe(403);
});

Then('the same call should succeed for a system administrator', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'the endpoint must work for a role that DOES hold the permission — otherwise the industry ' +
      'scaler refusal proves nothing about the role',
  ).toBeGreaterThanOrEqual(200);
  expect(
    world.baselineApiStatus,
    'the endpoint must work for a role that DOES hold the permission — otherwise the industry ' +
      'scaler refusal proves nothing about the role',
  ).toBeLessThan(300);
});

/**
 * The write contrast. 400 is the pass condition, and it is asserting two things at once:
 *  - NOT 403 — the administrator got past `@RequiresPermission`, so the industry scaler's 403 on the
 *    same body is a role decision and not a blanket refusal, an unmapped route, or a rejected body;
 *  - AND NOT 2xx — the body was stopped by service-side business validation, so no probe in this file
 *    can mutate a shared seed record even if authorization were broken in the permissive direction.
 */
Then('the same call should pass authorization for a system administrator', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'the write-probe body must get PAST authorization for a role that holds the permission and then ' +
      'be stopped by service-side validation (400). A 403 means the industry scaler 403 proves ' +
      'nothing; a 2xx means the probe body is mutating data and must be made inert again — see ' +
      'buildWriteProbeBody',
  ).toBe(400);
});

/**
 * The one probe that could destroy shared seed data if authorization were broken, so it verifies the
 * record survived rather than trusting the status code alone. A 4xx/5xx with the row deleted anyway
 * would be the worst possible outcome and the one a status assertion cannot see.
 */
Then('my own scaler record should still exist', async ({ request }) => {
  const response = await request.get(`/api/scalers/${ownScalerLicenceNo}`);
  expect(
    response.status(),
    `scaler ${ownScalerLicenceNo} must survive the refused DELETE — if this fails the seeded DB has ` +
      `lost a pinned anchor and needs reloading (e2e/README.md step 1)`,
  ).toBe(200);
});
