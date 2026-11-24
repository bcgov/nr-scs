import { Then, When, expect } from '../fixtures';

/**
 * Steps for the DETAIL check-scale LIST as rendered on BOTH the Scaler view's Check Scales tab
 * (UC-CHK-007) and the Scale Site view's Check Scales tab (UC-CHK-008). Both tabs render the same
 * `CheckScaleSummaryTable` (14 columns), an Add Check Scale button, and a filter; the SCALER tab also
 * renders a Check Scale Statistics section (the SITE tab does not). These assertions are page-object
 * based, so they are shared by both UCs — only the tab-open + filter steps differ.
 *
 * Reuses (do NOT redefine here): `Given I am on scaler {string}'s Check Scales tab` /
 * `Given I am on scale site {string}'s Check Scales tab` / `When I set the Check Scales filter to
 * {string}` / `Then the Check Scales list should be empty` (all in steps/chk/view.steps.ts).
 *
 * Parallel-safe: every assertion checks the presence/absence of a SPECIFIC permanent record (or a
 * section/control), never an exact row count — create suites transiently add rows to scaler 900Z/901Z
 * and site 9001 lists, which would flake a count assertion but never affects whether 905001 is listed.
 */

// ---- scaler-tab-only: the statistics section ----

Then('the Check Scale Statistics section is displayed', async ({ checkScaleListPage }) => {
  await expect(checkScaleListPage.statsHeading).toBeVisible();
  await expect(checkScaleListPage.statsTable).toBeVisible();
});

// ---- shared: the summary table, its columns, rows, links, and the Add button ----

Then('the Check Scale Summary table shows the expected columns', async ({ checkScaleListPage }) => {
  // Column headers only — heading-agnostic so it serves both tabs (the site tab has no "Check Scale
  // Summary" section heading). Representative subset of the 14 legacy columns.
  for (const col of ['Check Scale #', 'Primary Licence #', 'Volume Variance %', 'Value Variance %', 'Within Standard?']) {
    await expect(checkScaleListPage.columnHeader(col)).toBeVisible();
  }
});

Then('the Check Scale Summary table lists check scale {string}', async ({ checkScaleListPage }, id) => {
  await expect(checkScaleListPage.rowLink(id)).toBeVisible();
});

Then('check scale {string} is shown as a link to its view page', async ({ checkScaleListPage }, id) => {
  await expect(checkScaleListPage.rowLink(id)).toHaveAttribute('href', `/check-scales/view/${id}`);
});

Then('the Add Check Scale button is available', async ({ checkScaleListPage }) => {
  await expect(checkScaleListPage.addCheckScaleButton).toBeVisible();
});

// ---- site-tab-only: the check-scale TYPE filter (scaler tab filters by licence role instead) ----

When('I set the check-scale type filter to {string}', async ({ checkScaleListPage }, typeCode) => {
  await checkScaleListPage.setSiteFilter(typeCode);
});

// ---- shared: presence/absence of a specific id under the current filter (the parallel-safe assertion) ----

Then('check scale {string} {string} in the filtered list', async ({ checkScaleListPage }, id, presence) => {
  const link = checkScaleListPage.rowLink(id);
  if (presence === 'is present') {
    await expect(link).toBeVisible();
  } else if (presence === 'is absent') {
    await expect(link).toHaveCount(0);
  } else {
    throw new Error(`Unknown presence "${presence}" (expected "is present" | "is absent").`);
  }
});
