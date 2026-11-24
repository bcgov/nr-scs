import { Given, When, Then, expect } from '../fixtures';
import {
  tabScalerLicenceNo,
  tabScalerOnlyAuthId,
  tabAuthorizedScalersSiteId,
} from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA tabs (Tier 3) — the two Scaler-Authorization entity tabs:
 *  - "Authorizations" on the Scaler view (pages/sca/ScalerAuthorizationsTabPage), and
 *  - "Authorized Scalers" on the Scale Site view (pages/sca/ScaleSiteAuthorizedScalersTabPage).
 * Both are DISPLAY + NAVIGATION only and run READ-ONLY against pinned anchors (fixtures/sca/sca-test-data.ts:
 * scaler 001A with one expired auth 147850; site 520 with all-expired authorized scalers). No seed/cleanup.
 */

// ---------------------------------------------------------------------------------------------------------
// Authorizations tab (Scaler view)
// ---------------------------------------------------------------------------------------------------------

Given('I open the scaler Authorizations tab', async ({ scalerAuthorizationsTabPage }) => {
  await scalerAuthorizationsTabPage.open(tabScalerLicenceNo);
});

Then('the Authorizations tab shows authorization {string} linking to its view page', async ({ scalerAuthorizationsTabPage }, authorizationId: string) => {
  const link = scalerAuthorizationsTabPage.authorizationLink(authorizationId);
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', new RegExp(`/scaler-authorizations/view/${authorizationId}$`));
});

When('I filter scaler authorizations by {string}', async ({ scalerAuthorizationsTabPage }, status: string) => {
  await scalerAuthorizationsTabPage.setStatus(status as 'All' | 'Active' | 'Cancelled' | 'Expired');
});

Then('the Authorizations tab shows no authorizations for the selected status', async ({ scalerAuthorizationsTabPage }) => {
  await expect(scalerAuthorizationsTabPage.emptyForStatus).toBeVisible();
  // The pinned expired auth is filtered out (proves the filter, not just an incidentally-empty list).
  await expect(scalerAuthorizationsTabPage.authorizationLink(tabScalerOnlyAuthId)).toHaveCount(0);
});

When('I click Add Authorization on the scaler tab', async ({ scalerAuthorizationsTabPage }) => {
  await scalerAuthorizationsTabPage.clickAddAuthorization();
});

Then('I land on the scaler authorization create page prefilled with the scaler licence', async ({ scalerAuthorizationCreatePage, page }) => {
  await expect(scalerAuthorizationCreatePage.heading).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/scaler-authorizations/create\\?.*scalerLicenceNo=${tabScalerLicenceNo}`));
  await expect(scalerAuthorizationCreatePage.licence).toHaveValue(tabScalerLicenceNo);
});

// ---------------------------------------------------------------------------------------------------------
// Authorized Scalers tab (Scale Site view)
// ---------------------------------------------------------------------------------------------------------

Given('I open the scale site Authorized Scalers tab', async ({ scaleSiteAuthorizedScalersTabPage }) => {
  await scaleSiteAuthorizedScalersTabPage.open(tabAuthorizedScalersSiteId);
});

Then('the Authorized Scalers tab first row links to the authorization and scaler views', async ({ scaleSiteAuthorizedScalersTabPage }) => {
  const authLink = scaleSiteAuthorizedScalersTabPage.firstRowAuthorizationLink();
  const licenceLink = scaleSiteAuthorizedScalersTabPage.firstRowLicenceLink();
  // Structural (href-pattern) assertions — robust to the extract reordering rows or changing ids.
  await expect(authLink).toHaveAttribute('href', /\/scaler-authorizations\/view\/\d+$/);
  await expect(licenceLink).toHaveAttribute('href', /\/scalers\/view\/.+$/);
});

When('I filter authorized scalers by {string}', async ({ scaleSiteAuthorizedScalersTabPage }, status: string) => {
  await scaleSiteAuthorizedScalersTabPage.setStatus(status as 'All' | 'Active' | 'Cancelled' | 'Expired');
});

Then('the Authorized Scalers tab shows no authorized scalers for the selected status', async ({ scaleSiteAuthorizedScalersTabPage }) => {
  await expect(scaleSiteAuthorizedScalersTabPage.emptyForStatus).toBeVisible();
});

When('I click Add Authorization on the scale site tab', async ({ scaleSiteAuthorizedScalersTabPage }) => {
  await scaleSiteAuthorizedScalersTabPage.clickAddAuthorization();
});

Then('I land on the scaler authorization create page with an empty scaler licence', async ({ scalerAuthorizationCreatePage, page }) => {
  await expect(scalerAuthorizationCreatePage.heading).toBeVisible();
  await expect(page).toHaveURL(/\/scaler-authorizations\/create(?:$|\?(?!.*scalerLicenceNo=))/);
  await expect(scalerAuthorizationCreatePage.licence).toHaveValue('');
});
