import { Given, When, Then, expect } from '../fixtures';
import {
  authorizedScalerSiteId,
  scalerStatusPresent,
  scalerStatusAbsent,
} from '../../fixtures/sst/scale-site-test-data';

/**
 * UC-SST-008 (Maintain Scale Site Assigned Scalers) — the Authorized Scalers tab. READ-ONLY in the new
 * app plus a CLIENT-SIDE status filter (the assign/remove lives in the SCA domain). Real site used
 * read-only, so no seed/cleanup and parallel-safe. The extract's authorized scalers are all "Expired", so
 * filtering to the present status keeps rows and filtering to an absent status empties the list — which is
 * exactly what proves the filter. DOM lives in pages/sst/ScaleSiteAuthorizedScalersPage.
 */

const COLUMNS = ['Authorization #', 'Licence #', 'Name', 'Status', 'Appointment', 'Effective Date', 'Expiry Date', 'District Wide?'];

Given('I am on the Authorized Scalers tab of a scale site with scalers', async ({ scaleSiteAuthorizedScalersPage }) => {
  await scaleSiteAuthorizedScalersPage.openForSite(authorizedScalerSiteId);
});

Then('the authorized scalers table lists the scalers', async ({ scaleSiteAuthorizedScalersPage }) => {
  await expect(scaleSiteAuthorizedScalersPage.table).toBeVisible();
  for (const header of COLUMNS) {
    await expect(scaleSiteAuthorizedScalersPage.columnHeader(header)).toBeVisible();
  }
  await expect(scaleSiteAuthorizedScalersPage.dataRows().first()).toBeVisible();
});

When('I filter the authorized scalers by the present status', async ({ scaleSiteAuthorizedScalersPage }) => {
  await scaleSiteAuthorizedScalersPage.filterByStatus(scalerStatusPresent);
});

When('I filter the authorized scalers by a status with no matches', async ({ scaleSiteAuthorizedScalersPage }) => {
  await scaleSiteAuthorizedScalersPage.filterByStatus(scalerStatusAbsent);
});

Then('only scalers with that status are listed', async ({ scaleSiteAuthorizedScalersPage }) => {
  await expect(scaleSiteAuthorizedScalersPage.table).toBeVisible();
  await expect(scaleSiteAuthorizedScalersPage.dataRows().first()).toBeVisible();
  // No row of the absent status leaks into the filtered list.
  await expect(scaleSiteAuthorizedScalersPage.statusCell(scalerStatusAbsent)).toHaveCount(0);
  await expect(scaleSiteAuthorizedScalersPage.statusCell(scalerStatusPresent).first()).toBeVisible();
});

Then('no authorized scalers are listed', async ({ scaleSiteAuthorizedScalersPage }) => {
  await expect(scaleSiteAuthorizedScalersPage.emptyState).toBeVisible();
  await expect(scaleSiteAuthorizedScalersPage.table).toBeHidden();
});
