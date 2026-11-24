import { Given, When, Then, expect } from '../fixtures';
import {
  updatedSiteName,
  updatedSecondaryMethodCode,
  primaryMethodCode,
} from '../../fixtures/sst/scale-site-test-data';

/**
 * UC-SST-005 (Update Scale Site) — the `ScaleSiteEditModal` opened from the Summary tab's "Edit Record"
 * button. Same `ScaleSiteForm` / `validateScaleSiteForm` as create, so client-side rules block the PUT
 * (proven via `updateScaleSiteCalls() === 0`); success persists via PUT /api/scale-sites/{id} and is
 * PROVEN by an API read-back. Every scenario seeds + cleans up its OWN site (dedicated mutable key,
 * parallel-safe). DOM lives in pages/sst/ScaleSiteEditPage (all locators modal-scoped). Error text reuses
 * the shared common step `I should see the error "…"`.
 */

// --- entry points ---------------------------------------------------------------------------------------

Given('I am editing a newly created scale site', async ({ scaleSiteEditPage, seedScaleSite }) => {
  const id = await seedScaleSite();
  await scaleSiteEditPage.openForSite(id);
});

// --- happy path -----------------------------------------------------------------------------------------

When('I change the site name and a site type and save', async ({ scaleSiteEditPage }) => {
  await scaleSiteEditPage.fill({ siteName: updatedSiteName, secondaryType: updatedSecondaryMethodCode });
  await scaleSiteEditPage.saveExpectingSuccess();
});

Then('the updated scale site reads back with the new name and site type', async ({ scaleSiteEditPage, request }) => {
  const id = scaleSiteEditPage.scaleSiteId;
  await expect
    .poll(async () => {
      const res = await request.get(`/api/scale-sites/${encodeURIComponent(id)}/summary`);
      return res.ok() ? await res.json() : null;
    })
    .toMatchObject({ siteName: updatedSiteName });

  const res = await request.get(`/api/scale-sites/${encodeURIComponent(id)}/summary`);
  const body = (await res.json()) as { siteTypes?: Array<{ priorityCode?: string; scaleMethodTypeCode?: string }> };
  const pairs = (body.siteTypes ?? []).map((t) => `${t.priorityCode}:${t.scaleMethodTypeCode}`);
  expect(pairs).toContain(`P:${primaryMethodCode}`);
  expect(pairs).toContain(`S:${updatedSecondaryMethodCode}`);
});

// --- client-side validation negatives (no PUT leaves the browser) ---------------------------------------

When('I clear the scale site name and save', async ({ scaleSiteEditPage }) => {
  await scaleSiteEditPage.fill({ siteName: '' });
  await scaleSiteEditPage.clickSave();
});

When('I set duplicate site types and save', async ({ scaleSiteEditPage }) => {
  await scaleSiteEditPage.fill({ primaryType: primaryMethodCode, secondaryType: primaryMethodCode });
  await scaleSiteEditPage.clickSave();
});

When('I enter an incomplete coordinate and save', async ({ scaleSiteEditPage }) => {
  await scaleSiteEditPage.fill({ latitude: { degrees: '40' } });
  await scaleSiteEditPage.clickSave();
});

Then('no update-scale-site request should be sent', async ({ updateScaleSiteCalls }) => {
  expect(updateScaleSiteCalls()).toBe(0);
});

Then('the edit modal is still open', async ({ scaleSiteEditPage }) => {
  await expect(scaleSiteEditPage.modal).toBeVisible();
});

// --- reset & close-without-saving -----------------------------------------------------------------------

When('I change the site name and reset the form', async ({ scaleSiteEditPage }) => {
  await scaleSiteEditPage.fill({ siteName: updatedSiteName });
  await scaleSiteEditPage.clickReset();
});

Then('the edit form shows the original site name', async ({ scaleSiteEditPage }) => {
  await expect(scaleSiteEditPage.siteName).toHaveValue(scaleSiteEditPage.originalSiteName);
});

When('I change the site name and close the modal without saving', async ({ scaleSiteEditPage }) => {
  await scaleSiteEditPage.fill({ siteName: updatedSiteName });
  await scaleSiteEditPage.clickClose();
});

Then('the edit modal is closed', async ({ scaleSiteEditPage }) => {
  await expect(scaleSiteEditPage.modal).toBeHidden();
});

Then('the scale site still reads back with its original name', async ({ scaleSiteEditPage, request }) => {
  const id = scaleSiteEditPage.scaleSiteId;
  const res = await request.get(`/api/scale-sites/${encodeURIComponent(id)}/summary`);
  const body = (await res.json()) as { siteName?: string };
  expect(body.siteName).toBe(scaleSiteEditPage.originalSiteName);
});
