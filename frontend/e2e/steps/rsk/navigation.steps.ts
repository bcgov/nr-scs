import { Given, When, Then } from '../fixtures';
import { expectedRating } from '../../fixtures/rsk/rsk-test-data';

/**
 * Steps for the Scale Site Risk Assessment NAVIGATION / Risk Rating tab (UC-RSK-007 S01/S02): opening
 * the tab, the Add Risk Assessment hop into the create form, the return-to-tab landing, and the
 * list assertions. Selectors live in the page objects; these steps are pure domain language.
 */

// ---- Risk Rating tab entry ----
Given(
  'I am on the Risk Rating tab for scale site {string}',
  async ({ scaleSiteRiskRatingTabPage }, scaleSiteIdNmbr) => {
    await scaleSiteRiskRatingTabPage.open(scaleSiteIdNmbr);
  },
);

When('I click Add Risk Assessment', async ({ scaleSiteRiskRatingTabPage, scaleSiteRiskFormPage }) => {
  await scaleSiteRiskRatingTabPage.clickAddAssessment();
  await scaleSiteRiskFormPage.expectOnCreateForm();
});

// ---- return-to-tab landing (shared by create-save, back-out and edit-save) ----
// Takes the site id so the landing is asserted by URL: each scenario states WHICH site's tab it expects
// to be on, rather than inferring "we're on a Risk Rating tab somewhere" from the Add button.
Then(
  'I am returned to the Risk Rating tab for scale site {string}',
  async ({ scaleSiteRiskRatingTabPage }, scaleSiteIdNmbr) => {
    await scaleSiteRiskRatingTabPage.expectOnTab(scaleSiteIdNmbr);
  },
);

Then('the Risk Rating list is empty', async ({ scaleSiteRiskRatingTabPage }) => {
  await scaleSiteRiskRatingTabPage.expectEmptyList();
});

// ---- tab list read-back (scoped to this test's own assessment id — parallel-safe) ----
Then(
  "the assessment is listed on the site's Risk Rating tab",
  async ({ scaleSiteRiskRatingTabPage, world }) => {
    if (!world.riskAssessmentId) {
      throw new Error('no risk assessment id in world — a seed/create step must run first');
    }
    await scaleSiteRiskRatingTabPage.expectAssessmentListed(world.riskAssessmentId, {
      rating: String(expectedRating.riskRating),
      level: expectedRating.codeDescription,
    });
  },
);
