import { Given, When, Then, expect } from '../fixtures';

/**
 * Steps for UC-QRY-007 Search Risk Assessments — SCALE SITE subject (route /scale-site-risk-assessments).
 * Read-only parameter search: fill the filter form, submit, and assert the results table / empty state /
 * count / cell data. Selectors live in pages/rsk/ScaleSiteRiskAssessmentSearchPage. This is the scale-site
 * twin of the scaler search steps (a separate page/branch/endpoint). There is no blank-search guard
 * (blank = browse all, consistent with the legacy scaleSiteRiskSearch which also ran no validation).
 */

Given('I am on the Scale Site Risk Assessment Search page', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await scaleSiteRiskAssessmentSearchPage.goto();
});

When(
  'I search scale site risk assessments by {string} of {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, fieldLabel, value) => {
    await scaleSiteRiskAssessmentSearchPage.fill(fieldLabel, value);
    await scaleSiteRiskAssessmentSearchPage.clickSearch();
  },
);

// Two filters submitted TOGETHER (fill both, then one search) so the params object `doSearch` builds
// carries both — the case that would expose one field clobbering another.
When(
  'I search scale site risk assessments by {string} of {string} and {string} of {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, fieldA, valueA, fieldB, valueB) => {
    await scaleSiteRiskAssessmentSearchPage.fill(fieldA, valueA);
    await scaleSiteRiskAssessmentSearchPage.fill(fieldB, valueB);
    await scaleSiteRiskAssessmentSearchPage.clickSearch();
  },
);

When('I submit the scale site risk assessment search with no filters', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await scaleSiteRiskAssessmentSearchPage.clickSearch();
});

// Reg / Dist via the DistrictSelect WIDGET: choose by LOV label, then search. Proves the widget commits
// its chosen code to `orgUnitNo`.
When(
  'I filter scale site risk assessments by Reg\\/Dist {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, label) => {
    await scaleSiteRiskAssessmentSearchPage.selectDistrict(label);
    await scaleSiteRiskAssessmentSearchPage.clickSearch();
  },
);

// Site Owner (Client / Loc) via the ClientLocSearch WIDGET's Client # box: type the (zero-padded) client
// number, then search. Proves the widget commits `ownerClientNumber`.
When(
  'I filter scale site risk assessments by Site Owner Client # {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, clientNumber) => {
    await scaleSiteRiskAssessmentSearchPage.fillOwnerClientNumber(clientNumber);
    await scaleSiteRiskAssessmentSearchPage.clickSearch();
  },
);

// Site Type via the ActiveMultiSelect WIDGET: open, toggle the option by its description, then search.
// The ONLY widget on either risk page with no plain-Select twin — proves `methodTypes` (array of codes).
When(
  'I filter scale site risk assessments by Site Type {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, label) => {
    await scaleSiteRiskAssessmentSearchPage.selectSiteType(label);
    await scaleSiteRiskAssessmentSearchPage.clickSearch();
  },
);

// Persistence-across-navigation: leave the page CLIENT-SIDE (so the in-memory usePersistentState store
// survives) and come back. The prior search's filters + results must be restored on remount.
When('I navigate away from and back to the scale site risk assessment search', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await scaleSiteRiskAssessmentSearchPage.navigateAway();
  await scaleSiteRiskAssessmentSearchPage.returnToList();
});

// Set the sort BEFORE the subsequent search step fills a criterion and submits — both feed the same
// formData object `doSearch` sends, so the search carries the chosen primarySort/secondarySort codes.
When(
  'I sort scale site risk assessments by primary {string} and secondary {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, primaryLabel, secondaryLabel) => {
    await scaleSiteRiskAssessmentSearchPage.setSort(primaryLabel, secondaryLabel);
  },
);

// Fault injection for the error-state slices (route.fulfill a 500; no real endpoint touched).
Given('the scale site risk assessment search endpoint fails', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await scaleSiteRiskAssessmentSearchPage.failSearchWith500();
});

Given('the scale site risk assessment dropdown options fail to load', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await scaleSiteRiskAssessmentSearchPage.failDropdownOptionsWith500();
});

When('I reset the scale site risk assessment search', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await scaleSiteRiskAssessmentSearchPage.clickReset();
});

// A UI-triggered read (the search fires async after the click), so use a web-first assertion with a
// generous timeout rather than a single-shot read.
Then('the scale site risk assessment results should show {int} records', async ({ scaleSiteRiskAssessmentSearchPage }, count) => {
  await expect(scaleSiteRiskAssessmentSearchPage.resultsTotal).toHaveText(`Result List: ${count} records`, { timeout: 30000 });
});

Then('the scale site risk assessment results should list assessment {string}', async ({ scaleSiteRiskAssessmentSearchPage }, id) => {
  await expect(scaleSiteRiskAssessmentSearchPage.assessmentLink(id)).toBeVisible({ timeout: 30000 });
});

// The negative twin: assert a known non-matching assessment is ABSENT. Pairs with the tolerant "at least N"
// lower bound on the Site Type arm — the lower bound removed the "exactly 1" signal that would otherwise
// catch a dropped multiselect selection (unfiltered returns the same rows, 1861 among them). Asserting a
// non-P row (1822) is absent restores that discrimination without reintroducing the create-seed flap.
Then('the scale site risk assessment results should not list assessment {string}', async ({ scaleSiteRiskAssessmentSearchPage }, id) => {
  await expect(scaleSiteRiskAssessmentSearchPage.assessmentLink(id)).toHaveCount(0, { timeout: 30000 });
});

// A tolerant lower-bound on the "Result List: N records" total. Used for the Level=High whole-extract arm,
// whose count is exposed to parallel create-seeds on the SHARED DB (a create on site 520 rates 90 = High and
// surfaces in this search view, so the total can transiently exceed the known base count). Asserting ">= N"
// keeps the Level-filter coverage without flaking; the exact base count is pinned by preflight (which runs
// on a quiescent DB before any create scenario). See the Level scenario + defects.md "Parallel create-seed hazard".
Then('the scale site risk assessment results should show at least {int} records', async ({ scaleSiteRiskAssessmentSearchPage }, count) => {
  await expect
    .poll(
      async () => {
        const text = await scaleSiteRiskAssessmentSearchPage.resultsTotal.textContent();
        const match = text?.match(/Result List:\s*(\d+)\s*records/);
        return match ? Number(match[1]) : -1;
      },
      { timeout: 30000 },
    )
    .toBeGreaterThanOrEqual(count);
});

Then('the scale site risk assessment results should not be empty', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  // Blank submit = browse all: a "Result List: N records" count renders (proves the unfiltered query ran
  // and returned rows), without pinning the exact browse-all total (which grows with the extract).
  await expect(scaleSiteRiskAssessmentSearchPage.resultsTotal).toContainText('records', { timeout: 30000 });
});

Then('the scale site risk assessment search should show no results', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await expect(scaleSiteRiskAssessmentSearchPage.noResults).toBeVisible({ timeout: 30000 });
});

// Assert the rows render in the given comma-separated Assessment ID order. Wait for the expected row
// count first (web-first) so the order is snapshotted only after the sorted search has rendered.
Then('the scale site risk assessment results appear in assessment-id order {string}', async ({ scaleSiteRiskAssessmentSearchPage }, csv) => {
  const expected = csv.split(',').map((s: string) => s.trim());
  await expect(scaleSiteRiskAssessmentSearchPage.assessmentIdCells).toHaveCount(expected.length, { timeout: 30000 });
  expect(await scaleSiteRiskAssessmentSearchPage.assessmentIdOrder()).toEqual(expected);
});

Then('the scale site risk assessment search parameters heading is shown', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  await expect(scaleSiteRiskAssessmentSearchPage.searchParamsHeading).toBeVisible({ timeout: 30000 });
});

Then('the scale site risk assessment page shows a {string} error', async ({ scaleSiteRiskAssessmentSearchPage }, title) => {
  await expect(scaleSiteRiskAssessmentSearchPage.errorNotification(title)).toBeVisible({ timeout: 30000 });
});

Then('the scale site risk assessment results table shows the expected columns', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  for (const col of [
    'Assessment ID',
    'Rating / Max Rating',
    'Responses / Questions',
    'Level',
    'Range',
    'Ver.',
    'Scale Site #',
    'Scale Site Name',
    'Reg / Dist',
    'Site Type',
    'Site Owner (Client / Loc)',
  ]) {
    await expect(scaleSiteRiskAssessmentSearchPage.columnHeader(col)).toBeVisible();
  }
});

Then(
  'the scale site risk assessment row for {string} shows rating {string}, responses {string}, level {string}, range {string}, version {string}, scale site {string}, site name {string}, reg\\/dist {string} and owner {string}',
  async ({ scaleSiteRiskAssessmentSearchPage }, id, rating, responses, level, range, version, scaleSite, siteName, regDist, owner) => {
    await expect(scaleSiteRiskAssessmentSearchPage.assessmentLink(id)).toBeVisible({ timeout: 30000 });
    await expect(scaleSiteRiskAssessmentSearchPage.cell('ratingMaxRating', rating)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('responsesQuestions', responses)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('level', level)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('range', range)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('version', version)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('scaleSiteIdNmbr', scaleSite)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('siteName', siteName)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('district', regDist)).toBeVisible();
    await expect(scaleSiteRiskAssessmentSearchPage.cell('ownerClientDisplay', owner)).toBeVisible();
  },
);

Then(
  'the scale site risk assessment {string} links to its view and scale site {string} links to the scale site view',
  async ({ scaleSiteRiskAssessmentSearchPage }, id, scaleSiteId) => {
    await expect(scaleSiteRiskAssessmentSearchPage.assessmentLink(id)).toHaveAttribute('href', `/scale-site-risk-assessments/view/${id}`);
    await expect(scaleSiteRiskAssessmentSearchPage.results.getByRole('link', { name: scaleSiteId, exact: true })).toHaveAttribute(
      'href',
      `/scale-sites/view/${scaleSiteId}`,
    );
  },
);

Then('the scale site risk assessment results should be empty', async ({ scaleSiteRiskAssessmentSearchPage }) => {
  // After Reset the page returns to its initial "Nothing to show yet!" state — no "Result List" total.
  await expect(scaleSiteRiskAssessmentSearchPage.resultsTotal).toHaveCount(0);
});

// Persistence: the Assessment ID filter input still carries the value entered before navigating away.
Then('the scale site risk assessment Assessment ID filter still shows {string}', async ({ scaleSiteRiskAssessmentSearchPage }, value) => {
  await expect(scaleSiteRiskAssessmentSearchPage.assessmentIdInput).toHaveValue(value, { timeout: 30000 });
});
