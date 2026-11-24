import { Given, When, Then, expect } from '../fixtures';

import {
  INDUSTRY_SCALER_ROLE,
  entitledScaleSiteId,
  otherClientNumber,
  otherScalerLicenceNo,
  ownClientNumber,
  ownScalerLicenceNo,
  unentitledScaleSiteId,
} from '../../fixtures/security/industry-scaler-test-data';

/**
 * CLIENT SCOPING — the role's second axis: not *what* an industry scaler may do, but *whose rows* this
 * one may see. Asserted on all three levels, because it is enforced in three different places and a
 * gap in any one of them is a live data leak:
 *  - GUI — the query pages seed and LOCK the client filter, so the search cannot be widened.
 *  - URL — a record belonging to another client, opened by deep link, renders the access-denied card.
 *  - API — the same record requested directly answers 403 (`ClientScopeInterceptor` /
 *    `SecurityContextUtils.assertClientAccess`).
 *
 * Every case below is paired: one anchor the user IS entitled to, one they are not. A restriction test
 * alone proves nothing — a broken screen refuses everything.
 */

Given('my client has been authorized to scale at the entitled site', async ({ seedSiteEntitlement, world }) => {
  world.entitlementAuthId = await seedSiteEntitlement();
});

// ---------------------------------------------------------------- GUI level

/**
 * Navigation is role-aware (so `roleSession`, not the page object's own `goto`, which logs in as the
 * default administrator) but every SELECTOR is the existing `ScalerSearchPage`'s. That page object
 * already solves the trap here: the embedded client picker portals a SECOND `#clientNumber` to
 * document.body, so a bare id lookup is ambiguous for any role that gets the picker.
 */
When('I open the Scalers query page', async ({ roleSession, scalerSearchPage }) => {
  await roleSession.visit('/scalers');
  await expect(scalerSearchPage.licenceInput).toBeVisible({ timeout: 30_000 });
});

Then('the client filter should be locked to my own client', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.clientInput).toHaveValue(ownClientNumber);
  await expect(
    scalerSearchPage.clientInput,
    'a client-restricted user must not be able to widen the search beyond their own client',
  ).not.toBeEditable();
});

Then('the client filter should be free to edit', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.clientInput).toBeEditable();
});

When('I search scalers with the locked filter', async ({ scalerSearchPage }) => {
  await scalerSearchPage.clickSearch();
});

Then('only my own client\'s scalers should be listed', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.licenceLink(ownScalerLicenceNo)).toBeVisible({ timeout: 30_000 });
  await expect(
    scalerSearchPage.licenceLink(otherScalerLicenceNo),
    `scaler ${otherScalerLicenceNo} belongs to client ${otherClientNumber} and must never appear`,
  ).toBeHidden();
});

// ---------------------------------------------------------------- URL level

When('I browse directly to my own scaler record', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${ownScalerLicenceNo}`);
});

When('I browse directly to another client\'s scaler record', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${otherScalerLicenceNo}`);
});

When('I browse directly to the entitled scale site record', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${entitledScaleSiteId}`);
});

When('I browse directly to a scale site I am not authorized at', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${unentitledScaleSiteId}`);
});

Then('the record should load', async ({ roleSession }) => {
  await expect(
    roleSession.accessDeniedMessage,
    'a record inside the user\'s own client scope must not be refused',
  ).toBeHidden();
});

Then('I should be told I have no access to that record', async ({ roleSession }) => {
  await expect(roleSession.accessDeniedMessage).toBeVisible({ timeout: 30_000 });
});

// ---------------------------------------------------------------- API level

When('I request my own scaler record from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scalers/${ownScalerLicenceNo}`);
});

When('I request another client\'s scaler record from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scalers/${otherScalerLicenceNo}`);
});

When('I request the entitled scale site from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scale-sites/${entitledScaleSiteId}/tombstone`);
});

When('I request a scale site I am not authorized at from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scale-sites/${unentitledScaleSiteId}/tombstone`);
});

/**
 * Client-scope denials DO answer 403 today — they are thrown as `ForbiddenException`, which the
 * exception handler maps explicitly. That is what makes this assertion exact where the permission
 * matrix's has to be loose (see apiAccess.steps.ts).
 */
Then('the API should refuse it as out of my client scope', async ({ world }) => {
  expect(
    world.apiStatus,
    'a record outside the user\'s forest client must be refused with 403',
  ).toBe(403);
});
