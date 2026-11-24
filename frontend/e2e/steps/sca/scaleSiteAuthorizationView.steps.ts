import { Given, When, Then, expect } from '../fixtures';
import { type VIEW_FIELD_ID } from '../../pages/sca/ScaleSiteAuthorizationViewPage';
import { absentScaleSiteAuthId, siaConditionBody } from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA-007 — View Scale Site Authorization (read-only). Scenarios API-SEED a fresh record (site 520) via
 * `seedScaleSiteAuthorization` then open the view; the record is removed via DELETE on teardown
 * (createdScaleSiteAuthIds). DOM lives in pages/sca/ScaleSiteAuthorizationViewPage. The shared seed Given
 * lives here (reused by the edit + delete UCs). Data pinned in fixtures/sca/sca-test-data.ts.
 */

Given('a scale site authorization exists', async ({ seedScaleSiteAuthorization, world }) => {
  world.scaId = await seedScaleSiteAuthorization();
});

// Seeds a record carrying an SIA child condition so the delete UC (UC-SCA-008 S01) genuinely exercises the
// server-side cascade (delete children then parent), rather than only ever deleting a conditionless record.
Given('a scale site authorization with a condition exists', async ({ seedScaleSiteAuthorization, world }) => {
  world.scaId = await seedScaleSiteAuthorization([siaConditionBody]);
});

When('I open the scale site authorization view', async ({ scaleSiteAuthorizationViewPage, world }) => {
  expect(world.scaId, 'world.scaId set by a seed Given').toBeTruthy();
  await scaleSiteAuthorizationViewPage.goto(world.scaId as string);
  await scaleSiteAuthorizationViewPage.waitReady();
});

Given('I open the scale site authorization view for a non-existent id', async ({ scaleSiteAuthorizationViewPage }) => {
  await scaleSiteAuthorizationViewPage.goto(absentScaleSiteAuthId);
});

Then('the scale site authorization view shows {string} of {string}', async ({ scaleSiteAuthorizationViewPage }, field, value) => {
  await scaleSiteAuthorizationViewPage.expectFieldValue(field as keyof typeof VIEW_FIELD_ID, value);
});

Then('the scale site authorization view shows a load error', async ({ page }) => {
  const notification = page.locator('.cds--inline-notification--error');
  await expect(notification).toBeVisible();
  // The subtitle carries axios's e.message; assert IT names the 404 (scoped to the subtitle element, not
  // the whole notification) so a 500 / auth break that merely happens to mention "404" can't slip through
  // as a passing "not found" test.
  await expect(notification.locator('.cds--inline-notification__subtitle')).toContainText('404');
  await expect(page.locator('#status')).toHaveCount(0);
});
