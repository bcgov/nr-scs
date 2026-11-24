import { Given, Then, expect } from '../fixtures';
import {
  softwareAnchorSiteId,
  softwareAnchorLastUsedDate,
  noSoftwareAnchorSiteId,
} from '../../fixtures/sst/scale-site-test-data';

/**
 * UC-SST-007 (Scale Site Software Inventory) — READ-ONLY in the new app (GET /scale-sites/{id}/software
 * only; no create/update/delete). Two observable states: a site WITH software rows (S01) and a site with
 * NONE (S02). Both use REAL sites read-only, so no seed/cleanup and fully parallel-safe. DOM lives in
 * pages/sst/ScaleSiteSoftwarePage.
 */

Given('I am on the Software tab of a scale site with software', async ({ scaleSiteSoftwarePage }) => {
  await scaleSiteSoftwarePage.openForSite(softwareAnchorSiteId);
});

Given('I am on the Software tab of a scale site with no software', async ({ scaleSiteSoftwarePage }) => {
  await scaleSiteSoftwarePage.openForSite(noSoftwareAnchorSiteId);
});

Then('the software table lists the scale site software', async ({ scaleSiteSoftwarePage }) => {
  await expect(scaleSiteSoftwarePage.table).toBeVisible();
  // The six display-only columns (Field Reference) and >=1 data row.
  for (const header of ['Scaling Program', 'Version', 'Revision', 'Return Type', 'Return Count', 'Last Used Date']) {
    await expect(scaleSiteSoftwarePage.columnHeader(header)).toBeVisible();
  }
  await expect(scaleSiteSoftwarePage.dataRows().first()).toBeVisible();
  await expect(scaleSiteSoftwarePage.table.getByText(softwareAnchorLastUsedDate)).toBeVisible();
});

Then('the software tab shows the empty state', async ({ scaleSiteSoftwarePage }) => {
  await expect(scaleSiteSoftwarePage.emptyState).toBeVisible();
  await expect(scaleSiteSoftwarePage.table).toBeHidden();
});
