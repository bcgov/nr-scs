import type { APIRequestContext } from '@playwright/test';

import { REMOVE_CONFIRM_TEXT, type WorkbenchSection } from '../../../pages/admin/workbench/WorkBenchPage';
import { seedExpiryDate } from '../../../fixtures/admin/workbench/workbench-test-data';
import { Given, When, Then, expect } from '../../fixtures';

/**
 * Shared steps for the Work Bench (UC-SCA-009 scaler / -010 scale-site / -011 MSD). One page, three
 * sections; the seeding Given picks the section + id into `world`, and every later step reads them, so the
 * mechanics steps are written once and reused across all three UCs.
 */

// section -> the workbench list endpoint + the id field name in each row (for the API read-back)
const SECTION_API: Record<WorkbenchSection, { path: string; idKey: string }> = {
  scaler: { path: '/api/scaler-authorizations/workbench', idKey: 'scalerAuthorizationId' },
  scaleSite: { path: '/api/scale-site-authorizations/workbench', idKey: 'scaleSiteAuthorizationId' },
  markSite: { path: '/api/mark-site-designations/workbench', idKey: 'haulingMarkAuthorizationId' },
};

// section -> the by-id detail endpoint + the expiry field name (for the record-survives + renew-extends
// read-backs).
const DETAIL_API: Record<WorkbenchSection, { path: string; expiryKey: string }> = {
  scaler: { path: '/api/scaler-authorizations', expiryKey: 'authorizationExpiryDate' },
  scaleSite: { path: '/api/scale-site-authorizations', expiryKey: 'authorizationExpiryDate' },
  markSite: { path: '/api/mark-site-designations', expiryKey: 'expiryDate' },
};

async function workbenchHasId(request: APIRequestContext, section: WorkbenchSection, id: string): Promise<boolean> {
  const { path, idKey } = SECTION_API[section];
  const res = await request.get(path);
  if (!res.ok()) throw new Error(`[verify] ${path} failed: HTTP ${res.status()}`);
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows.some((r) => String(r[idKey]) === String(id));
}

// --- seeding (each sets the section + id in world) ----------------------------------------------------

Given('I am on the Work Bench', async ({ workBenchPage }) => {
  await workBenchPage.goto();
});

Given('a disposable expiring scaler authorization exists', async ({ seedExpiringScalerAuth, world }) => {
  world.wbAuthId = await seedExpiringScalerAuth();
  world.wbSection = 'scaler';
});

Given('a disposable expiring scale site authorization exists', async ({ seedExpiringScaleSiteAuth, world }) => {
  world.wbAuthId = await seedExpiringScaleSiteAuth();
  world.wbSection = 'scaleSite';
});

Given('a disposable expiring mark site designation exists', async ({ seedExpiringMsd, world }) => {
  world.wbAuthId = await seedExpiringMsd();
  world.wbSection = 'markSite';
});

// --- view / actions -----------------------------------------------------------------------------------

Then('the expiring authorization appears in its Work Bench section', async ({ workBenchPage, world }) => {
  const { wbSection, wbAuthId } = world;
  if (!wbSection || !wbAuthId) throw new Error('[step] no seeded authorization in world');
  await workBenchPage.expectRowPresent(wbSection, wbAuthId);
  await expect(workBenchPage.removeButton(wbSection, wbAuthId)).toBeVisible();
  await expect(workBenchPage.addButton(wbSection, wbAuthId)).toBeVisible();
});

When('I renew the expiring authorization from the Work Bench', async ({ workBenchPage, world }) => {
  if (!world.wbSection || !world.wbAuthId) throw new Error('[step] no seeded authorization in world');
  await workBenchPage.clickAdd(world.wbSection, world.wbAuthId);
});

// Legacy S01: the renew forwards to the NEW authorization's detail view. Assert we landed there and
// capture the new id (the renewed clone is registered for cleanup by the workbenchRenewCloneCapture
// fixture the moment the renew response arrives — no manual registration here).
Then('I am taken to the renewed authorization', async ({ workBenchPage, world }) => {
  world.wbRenewedId = await workBenchPage.expectNavigatedToRenewedRecord(world.wbSection!);
});

When('I remove the expiring authorization and confirm', async ({ workBenchPage, world }) => {
  await workBenchPage.clickRemove(world.wbSection!, world.wbAuthId!, true);
});

When('I remove the expiring authorization and cancel', async ({ workBenchPage, world }) => {
  await workBenchPage.clickRemove(world.wbSection!, world.wbAuthId!, false);
});

Then('the remove confirmation asks to remove the record from the list', async ({ workBenchPage }) => {
  expect(workBenchPage.lastConfirmMessage).toBe(REMOVE_CONFIRM_TEXT);
});

Then('the expiring authorization is no longer in its Work Bench section', async ({ workBenchPage, request, world }) => {
  const { wbSection, wbAuthId } = world;
  await workBenchPage.expectRowAbsent(wbSection!, wbAuthId!);
  // Prove the negative at the API: the record is gone from the workbench list (poll — the remove is async).
  await expect
    .poll(async () => workbenchHasId(request, wbSection!, wbAuthId!), {
      timeout: 10_000,
      message: `authorization ${wbAuthId} still in the ${wbSection} workbench after remove`,
    })
    .toBe(false);
});

Then('the expiring authorization is still in its Work Bench section', async ({ workBenchPage, world }) => {
  await workBenchPage.expectRowPresent(world.wbSection!, world.wbAuthId!);
});

Then('no remove-from-workbench request is sent', async ({ removeFromWorkbenchCalls }) => {
  expect(removeFromWorkbenchCalls()).toBe(0);
});

Then('the {word} Work Bench section shows no expiring records', async ({ workBenchPage }, section: string) => {
  const map: Record<string, WorkbenchSection> = { scaler: 'scaler', 'scale-site': 'scaleSite', msd: 'markSite' };
  const which = map[section];
  if (!which) throw new Error(`[step] unknown Work Bench section "${section}"`);
  await workBenchPage.expectEmpty(which);
});

// Legacy S02: Remove sets expiry_notification_ind='Y' and drops the row from the list, but does NOT delete
// the authorization — so the record must still resolve on a by-id read-back (remove ≠ delete).
Then('the authorization still exists', async ({ request, world }) => {
  const { path } = DETAIL_API[world.wbSection!];
  const res = await request.get(`${path}/${encodeURIComponent(world.wbAuthId!)}`);
  expect(res.ok(), `authorization ${world.wbAuthId} should still exist after remove (HTTP ${res.status()})`).toBe(true);
});

// Legacy S01: the renewal EXTENDS the authority — the renewed record's expiry is later than the seed's
// (today+15), which is also why the clone drops out of the (today, today+30] Work Bench window.
Then('the renewed authorization has a later expiry date', async ({ request, world }) => {
  if (!world.wbRenewedId) throw new Error('[verify] no renewed authorization id in world');
  const { path, expiryKey } = DETAIL_API[world.wbSection!];
  const res = await request.get(`${path}/${encodeURIComponent(world.wbRenewedId)}`);
  if (!res.ok()) throw new Error(`[verify] renewed record read-back failed: HTTP ${res.status()}`);
  const detail = (await res.json()) as Record<string, string>;
  const renewedExpiry = detail[expiryKey];
  const seedExpiry = seedExpiryDate();
  expect(renewedExpiry > seedExpiry, `renewed expiry ${renewedExpiry} should be later than seed expiry ${seedExpiry}`).toBe(true);
});
