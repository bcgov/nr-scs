import { When, Then, expect } from '../fixtures';
import {
  siteByKind,
  absentScaleSiteId,
  absentScaleSiteNotFoundMessage,
} from '../../fixtures/qry/qry-scale-site-activity-test-data';

/**
 * UC-QRY-008 (View Scale Site Activity Summary) — the read-only Activity Summary tab on the scale-site
 * view. No mutations => no seed / cleanup; the two anchor sites (312 with a last return date, 520 without)
 * are shared READ-ONLY, so this is parallel-safe against any other suite. The UI table is proven to reflect
 * the database by an independent API read-back of GET /api/scale-sites/{id}/activity-summary. Authorization
 * of the tab (which roles may read it) is owned by the SEC role-scoping suite — see the per-role
 * `api-access.feature` files under features/security (the /activity-summary probe) — and is NOT re-tested here.
 * DOM lives in pages/qry/ScaleSiteActivityTabPage.
 */

const activityUrl = (id: string) => `/api/scale-sites/${encodeURIComponent(id)}/activity-summary`;

const resolveSite = (kind: string) => {
  const site = siteByKind[kind];
  expect(site, `unknown scale-site kind "${kind}"`).toBeTruthy();
  return site;
};

// --- entry point ----------------------------------------------------------------------------------------

When('I open the activity summary for the scale site with {string}', async ({ scaleSiteActivityPage }, kind) => {
  await scaleSiteActivityPage.open(resolveSite(kind).scaleSiteIdNmbr);
});

// --- display (UI) ---------------------------------------------------------------------------------------

Then('the activity summary table shows:', async ({ scaleSiteActivityPage }, table) => {
  for (const row of table.hashes()) {
    await scaleSiteActivityPage.expectField(row.Field, row.Value);
  }
});

Then('no activity error notification is shown', async ({ scaleSiteActivityPage }) => {
  await scaleSiteActivityPage.expectNoError();
});

// --- API read-back (prove the UI reflects the DB) -------------------------------------------------------

Then('the activity summary API for the scale site with {string} returns the pinned values', async ({ request }, kind) => {
  const site = resolveSite(kind);
  const res = await request.get(activityUrl(site.scaleSiteIdNmbr));
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject(site.api);
});

// --- non-existent site (legacy uncaught-crash path, re-grounded to a clean 404) -------------------------

Then('the activity summary API for a non-existent scale site returns a clean 404', async ({ request }) => {
  const res = await request.get(activityUrl(absentScaleSiteId));
  expect(res.status()).toBe(404);
  expect(await res.json()).toMatchObject({
    code: 'NOT_FOUND',
    message: absentScaleSiteNotFoundMessage,
  });
});
