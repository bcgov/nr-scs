import { resolveSeeded } from '../../fixtures/common/seededValues';
import { Given, When, Then, expect } from '../fixtures';

/**
 * Steps for UC-QRY-007 Search Scaler Risk Assessments (route /scaler-risk-assessments). Read-only
 * parameter search: fill the filter form, submit, and assert the results table / empty state / count /
 * cell data. Selectors live in pages/rsk/ScalerRiskAssessmentSearchPage. There is no blank-search guard
 * (blank = browse all, consistent with the legacy scalerRiskSearch which also ran no validation).
 */

Given('I am on the Scaler Risk Assessment Search page', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.goto();
});

When(
  'I search scaler risk assessments by {string} of {string}',
  async ({ scalerRiskAssessmentSearchPage }, fieldLabel, value) => {
    await scalerRiskAssessmentSearchPage.fill(fieldLabel, value);
    await scalerRiskAssessmentSearchPage.clickSearch();
  },
);

// Two filters submitted TOGETHER (fill both, then one search) so the params object `doSearch` builds
// carries both — the case that would expose one field clobbering another.
When(
  'I search scaler risk assessments by {string} of {string} and {string} of {string}',
  async ({ scalerRiskAssessmentSearchPage }, fieldA, valueA, fieldB, valueB) => {
    await scalerRiskAssessmentSearchPage.fill(fieldA, valueA);
    await scalerRiskAssessmentSearchPage.fill(fieldB, valueB);
    await scalerRiskAssessmentSearchPage.clickSearch();
  },
);

When('I submit the scaler risk assessment search with no filters', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.clickSearch();
});

// Reg / Dist via the DistrictSelect WIDGET (not a plain Select filter): choose by LOV label, then search.
// Proves the widget commits its chosen code to `orgUnitNo`.
When(
  'I filter scaler risk assessments by Reg\\/Dist {string}',
  async ({ scalerRiskAssessmentSearchPage }, label) => {
    await scalerRiskAssessmentSearchPage.selectDistrict(label);
    await scalerRiskAssessmentSearchPage.clickSearch();
  },
);

// Scaler (Client / Loc) via the ClientLocSearch WIDGET's Client # box: type the (zero-padded) client
// number, then search. Proves the widget commits `clientNumber` (the "/ Loc" box is a dead input — Bug #1).
When(
  'I filter scaler risk assessments by Scaler Client # {string}',
  async ({ scalerRiskAssessmentSearchPage }, clientNumber) => {
    await scalerRiskAssessmentSearchPage.fillClientNumber(clientNumber);
    await scalerRiskAssessmentSearchPage.clickSearch();
  },
);

// Persistence-across-navigation: leave the page CLIENT-SIDE (so the in-memory usePersistentState store
// survives) and come back. The prior search's filters + results must be restored on remount.
When('I navigate away from and back to the scaler risk assessment search', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.navigateAway();
  await scalerRiskAssessmentSearchPage.returnToList();
});

When('I go to the next page of scaler risk assessment results', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.gotoNextPage();
});

// Set the sort BEFORE the subsequent search step fills a criterion and submits — both feed the same
// formData object `doSearch` sends, so the search carries the chosen primarySort/secondarySort codes.
When(
  'I sort scaler risk assessments by primary {string} and secondary {string}',
  async ({ scalerRiskAssessmentSearchPage }, primaryLabel, secondaryLabel) => {
    await scalerRiskAssessmentSearchPage.setSort(primaryLabel, secondaryLabel);
  },
);

// Fault injection for the error-state slices (route.fulfill a 500; no real endpoint touched).
Given('the scaler risk assessment search endpoint fails', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.failSearchWith500();
});

Given('the scaler risk assessment dropdown options fail to load', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.failDropdownOptionsWith500();
});

When('I reset the scaler risk assessment search', async ({ scalerRiskAssessmentSearchPage }) => {
  await scalerRiskAssessmentSearchPage.clickReset();
});

// A UI-triggered read (the search fires async after the click), so use a web-first assertion with a
// generous timeout rather than a single-shot read.
Then('the scaler risk assessment results should show {int} records', async ({ scalerRiskAssessmentSearchPage }, count) => {
  await expect(scalerRiskAssessmentSearchPage.resultsTotal).toHaveText(`Result List: ${count} records`, { timeout: 30000 });
});

Then('the scaler risk assessment results should list assessment {string}', async ({ scalerRiskAssessmentSearchPage }, id) => {
  await expect(scalerRiskAssessmentSearchPage.assessmentLink(id)).toBeVisible({ timeout: 30000 });
});

// Rows RENDERED on the current page (the page slices client-side at 10/page). Distinct from the
// "Result List: N records" total, which reports the full match count across all pages. `toHaveCount`
// is web-first (retries), so it settles after the async search resolves and the page re-renders.
Then('the scaler risk assessment results should show {int} rows on the current page', async ({ scalerRiskAssessmentSearchPage }, count) => {
  await expect(scalerRiskAssessmentSearchPage.resultRows).toHaveCount(count, { timeout: 30000 });
});

Then('the scaler risk assessment results should not be empty', async ({ scalerRiskAssessmentSearchPage }) => {
  // Blank submit = browse all: a "Result List: N records" count renders (proves the unfiltered query ran
  // and returned rows), without pinning the exact browse-all total (which grows with the extract).
  await expect(scalerRiskAssessmentSearchPage.resultsTotal).toContainText('records', { timeout: 30000 });
});

Then('the scaler risk assessment search should show no results', async ({ scalerRiskAssessmentSearchPage }) => {
  await expect(scalerRiskAssessmentSearchPage.noResults).toBeVisible({ timeout: 30000 });
});

// Assert the rows render in the given comma-separated Assessment ID order. Wait for the expected row
// count first (web-first) so the order is snapshotted only after the sorted search has rendered.
Then('the scaler risk assessment results appear in assessment-id order {string}', async ({ scalerRiskAssessmentSearchPage }, csv) => {
  const expected = csv.split(',').map((s: string) => s.trim());
  await expect(scalerRiskAssessmentSearchPage.assessmentIdCells).toHaveCount(expected.length, { timeout: 30000 });
  expect(await scalerRiskAssessmentSearchPage.assessmentIdOrder()).toEqual(expected);
});

Then('the scaler risk assessment search parameters heading is shown', async ({ scalerRiskAssessmentSearchPage }) => {
  await expect(scalerRiskAssessmentSearchPage.searchParamsHeading).toBeVisible({ timeout: 30000 });
});

Then('the scaler risk assessment page shows a {string} error', async ({ scalerRiskAssessmentSearchPage }, title) => {
  await expect(scalerRiskAssessmentSearchPage.errorNotification(title)).toBeVisible({ timeout: 30000 });
});

Then('the scaler risk assessment results table shows the expected columns', async ({ scalerRiskAssessmentSearchPage }) => {
  for (const col of [
    'Assessment ID',
    'Rating / Max Rating',
    'Responses / Questions',
    'Level',
    'Range',
    'Ver.',
    'Licence #',
    'Scaler (Client / Loc)',
    'Reg / Dist',
    'Client Name',
  ]) {
    await expect(scalerRiskAssessmentSearchPage.columnHeader(col)).toBeVisible();
  }
});

Then(
  'the scaler risk assessment row for {string} shows rating {string}, responses {string}, level {string}, range {string}, version {string}, licence {string}, scaler {string}, reg\\/dist {string} and client {string}',
  async ({ scalerRiskAssessmentSearchPage }, id, rating, responses, level, range, version, licence, scaler, regDist, client) => {
    await expect(scalerRiskAssessmentSearchPage.assessmentLink(id)).toBeVisible({ timeout: 30000 });
    await expect(scalerRiskAssessmentSearchPage.cell('ratingMaxRating', rating)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('responsesQuestions', responses)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('level', level)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('range', range)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('version', version)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('scalerLicenceNo', licence)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('scalerClientLoc', scaler)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('orgUnitName', regDist)).toBeVisible();
    await expect(scalerRiskAssessmentSearchPage.cell('clientName', resolveSeeded(client))).toBeVisible();
  },
);

Then(
  'the scaler risk assessment {string} links to its view and licence {string} links to the scaler view',
  async ({ scalerRiskAssessmentSearchPage }, id, licenceNo) => {
    await expect(scalerRiskAssessmentSearchPage.assessmentLink(id)).toHaveAttribute('href', `/scaler-risk-assessments/view/${id}`);
    await expect(scalerRiskAssessmentSearchPage.results.getByRole('link', { name: licenceNo, exact: true })).toHaveAttribute(
      'href',
      `/scalers/view/${licenceNo}`,
    );
  },
);

Then('the scaler risk assessment results should be empty', async ({ scalerRiskAssessmentSearchPage }) => {
  // After Reset the page returns to its initial "Nothing to show yet!" state — no "Result List" total.
  await expect(scalerRiskAssessmentSearchPage.resultsTotal).toHaveCount(0);
});

// Persistence: the Assessment ID filter input still carries the value entered before navigating away.
Then('the scaler risk assessment Assessment ID filter still shows {string}', async ({ scalerRiskAssessmentSearchPage }, value) => {
  await expect(scalerRiskAssessmentSearchPage.assessmentIdInput).toHaveValue(value, { timeout: 30000 });
});
