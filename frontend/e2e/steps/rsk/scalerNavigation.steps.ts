import { Given, When, Then, expect } from '../fixtures';
import { scalerExpectedRating } from '../../fixtures/rsk/scaler-risk-complete-test-data';

/**
 * Re-ground pointer appended to the back-out precondition's failure messages — a shortened twin of the
 * preflight's REGROUND (preflight/anchors.setup.ts): tells a dev who hits a drifted fixture how to recover.
 */
const REGROUND =
  'Re-ground: reload the real extract + seed patches, evict the LOV cache or restart the backend, then ' +
  're-verify the pinned fixture values.';

/**
 * Steps for the Scaler Risk Assessment NAVIGATION / Risk Rating tab (UC-RSK-006 S01/S04): opening the tab,
 * the Add Risk Assessment hop into the create form, the return-to-tab landing, and the list assertions.
 * Selectors live in the page objects; these steps are pure domain language. Twin of the scale-site
 * navigation steps, phrased for the scaler subject so the two never collide.
 */

// ---- Risk Rating tab entry ----
Given(
  'I am on the Risk Rating tab for scaler {string}',
  async ({ scalerRiskRatingTabPage }, scalerLicenceNo) => {
    await scalerRiskRatingTabPage.open(scalerLicenceNo);
  },
);

// ---- UC-RSK-006-S04 back-out precondition ----
// The back-out scenario needs its subject scaler to START with an EMPTY Risk Rating tab, and nothing in the
// suite ever creates on it (see scalerEmptyTab in fixtures/rsk/scaler-risk-complete-test-data.ts). Asserted
// HERE, inside the one scenario that depends on it, so a drifted fixture (a re-extract that loaded
// assessments onto this scaler, or a dev/future test poking it) fails ONLY S04 — not the whole suite. This
// was previously a suite-wide preflight assertion, but preflight is a dependency of the chromium project, so
// one non-empty result there skipped EVERY test in EVERY domain. The API-level GET (not the UI empty
// message) is a true data precondition: it disambiguates "044E started empty" from the later "back-out
// created nothing" assertion, and carries a re-ground pointer the generic empty-message check cannot.
Given(
  'scaler {string} starts with an empty Risk Rating tab',
  async ({ request }, scalerLicenceNo) => {
    const url = `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/risk-ratings`;
    const res = await request.get(url);
    expect(
      res.ok(),
      `[precondition] GET ${url} for back-out scaler ${scalerLicenceNo} returned HTTP ${res.status()}. ${REGROUND}`,
    ).toBeTruthy();
    const ratings = (await res.json()) as unknown[];
    expect(
      ratings.length,
      `[precondition] back-out scaler ${scalerLicenceNo} risk-rating tab is not empty (found ${ratings.length}; ` +
        `expected 0) — UC-RSK-006-S04 needs it empty. A re-extract loaded assessments onto it, or a test ` +
        `wrongly created on it; re-pin scalerEmptyTab in fixtures/rsk/scaler-risk-complete-test-data.ts to a ` +
        `scaler with no assessments. ${REGROUND}`,
    ).toBe(0);
  },
);

When(
  "I add a risk assessment from the scaler's Risk Rating tab",
  async ({ scalerRiskRatingTabPage, scalerRiskFormPage }) => {
    await scalerRiskRatingTabPage.clickAddAssessment();
    await scalerRiskFormPage.expectOnCreateForm();
  },
);

// ---- return-to-tab landing (shared by create-save, back-out and edit-save) ----
// Takes the licence so the landing is asserted by URL: each scenario states WHICH scaler's tab it expects
// to be on, rather than inferring "we're on a Risk Rating tab somewhere" from the Add button.
Then(
  'I am returned to the Risk Rating tab for scaler {string}',
  async ({ scalerRiskRatingTabPage }, scalerLicenceNo) => {
    await scalerRiskRatingTabPage.expectOnTab(scalerLicenceNo);
  },
);

Then('the scaler Risk Rating list is empty', async ({ scalerRiskRatingTabPage }) => {
  await scalerRiskRatingTabPage.expectEmptyList();
});

// NB there is no "returned to the Scaler Risk Assessments list" landing for edit/view Back. Since #316
// ("fixed bug with back button in risk assessments"), edit/view Back goes to the owning scaler's Risk Rating
// tab via config.successRedirect(detail) — the SAME destination as a successful Save — so both the edit-save
// and edit-discard scenarios (UC-RSK-006 S05) use "I am returned to the Risk Rating tab for scaler {string}".

// ---- tab list read-back (scoped to this test's own assessment id — parallel-safe) ----
Then(
  "the assessment is listed on the scaler's Risk Rating tab",
  async ({ scalerRiskRatingTabPage, world }) => {
    if (!world.riskAssessmentId) {
      throw new Error('no risk assessment id in world — a seed/create step must run first');
    }
    await scalerRiskRatingTabPage.expectAssessmentListed(world.riskAssessmentId, {
      rating: String(scalerExpectedRating.riskRating),
      level: scalerExpectedRating.codeDescription,
    });
  },
);
