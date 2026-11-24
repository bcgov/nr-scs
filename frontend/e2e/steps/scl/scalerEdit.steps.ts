import { Given, When, Then, expect } from '../fixtures';
import { appointmentTypeLabel, examTypeLabel } from '../../fixtures/scl/scaler-test-data';
import { daysAgo } from '../../fixtures/common/dates';
import {
  anchorScalerLicenceNo,
  updateSeedClientNumber,
  changedDistrictOrgUnitNo,
  licenceExpiryDate,
  expiryBeforeEffectiveDates,
  REQUIRED_EDIT_FIELD,
} from '../../fixtures/scl/scaler-edit-test-data';

/**
 * SCL steps for Update Scaler (UC-SCL-003) — the View page + "Scaler Record - Edit" modal. DOM lives in
 * ScalerViewPage. Two shapes:
 *  - MUTATING slices (update.feature, serial) seed their OWN scaler via the API (seedScaler), edit it, and
 *    prove the change with a full API read-back; the seed is DELETEd on teardown.
 *  - READ-ONLY slices (validation.feature / address.feature, parallel) open a REAL anchor scaler and never
 *    persist — the negatives are blocked CLIENT-SIDE (updateScalerCalls === 0), so nothing mutates.
 */

// --- Given: reach the edit surface ---------------------------------------------------------------

// Mutating slices — seed a fresh scaler (on the pinned unconsumed client), then open its edit modal.
Given('a scaler exists for editing', async ({ seedScaler, world }) => {
  world.scalerLicenceNo = await seedScaler(updateSeedClientNumber);
});

Given('I open the scaler for editing', async ({ scalerViewPage, world }) => {
  expect(world.scalerLicenceNo, 'a prior step seeded a scaler').toBeTruthy();
  await scalerViewPage.gotoView(world.scalerLicenceNo as string);
  await scalerViewPage.openEditModal();
});

// Read-only slices — open the real anchor scaler (pinned in fixtures; never persisted to here).
Given('I open the sample scaler for editing', async ({ scalerViewPage }) => {
  await scalerViewPage.gotoView(anchorScalerLicenceNo);
  await scalerViewPage.openEditModal();
});

Given('I open the sample scaler view', async ({ scalerViewPage }) => {
  await scalerViewPage.gotoView(anchorScalerLicenceNo);
});

// --- When: happy-path edits ----------------------------------------------------------------------

// The literal '/' must be escaped in a Cucumber expression (it marks an alternative); '\/' matches the
// '/' in the feature's "Reg / Dist" wording.
When('I change the Reg \\/ Dist to another district', async ({ scalerViewPage }) => {
  await scalerViewPage.setDistrict(changedDistrictOrgUnitNo);
});

When('I change the Scaler Oath Taken to {string}', async ({ scalerViewPage }, value) => {
  await scalerViewPage.setOath(value as 'Yes' | 'No');
});

// Exercises the EDIT-mode-only Waste checkbox + Expiry Date — the controls create can't reach
// (UC-SCL-002 Coverage-gap #1). Scaling stays checked, so licenceTypes becomes ['SCS','WA'].
When('I add the Waste licence type with an expiry date', async ({ scalerViewPage }) => {
  await scalerViewPage.setLicenceWaste(true);
  await scalerViewPage.setExpiryDate(licenceExpiryDate);
});

When('I save the scaler edit', async ({ scalerViewPage }) => {
  await scalerViewPage.clickSave();
});

When('I reset the scaler edit form', async ({ scalerViewPage }) => {
  await scalerViewPage.clickReset();
});

When('I open the Address tab', async ({ scalerViewPage }) => {
  await scalerViewPage.openAddressTab();
});

// --- When: validation negatives (client-side; no PUT) --------------------------------------------

When('I clear the {string} on the scaler edit form', async ({ scalerViewPage }, label) => {
  const field = REQUIRED_EDIT_FIELD[label];
  if (!field) throw new Error(`Unknown required edit field label: "${label}"`);
  if (field.clear === 'district') await scalerViewPage.clearDistrict();
  else if (field.clear === 'effectiveDate') await scalerViewPage.clearEffectiveDate();
  else await scalerViewPage.clearOath();
});

When('I clear both licence types on the scaler edit form', async ({ scalerViewPage }) => {
  await scalerViewPage.setLicenceScaling(false);
  await scalerViewPage.setLicenceWaste(false);
});

When('I fill both an appointment and an exam on the scaler edit form', async ({ scalerViewPage }) => {
  await scalerViewPage.fillAppointmentSection(appointmentTypeLabel, 'No', daysAgo(1));
  await scalerViewPage.fillExamSection(examTypeLabel, daysAgo(1));
});

When('I select the Waste licence type without an expiry date', async ({ scalerViewPage }) => {
  await scalerViewPage.setLicenceWaste(true);
  await scalerViewPage.clearExpiryDate();
});

When('I set an expiry date earlier than the effective date', async ({ scalerViewPage }) => {
  await scalerViewPage.setEffectiveDate(expiryBeforeEffectiveDates.effectiveDate);
  await scalerViewPage.setExpiryDate(expiryBeforeEffectiveDates.expiryDate);
});

// --- Then ----------------------------------------------------------------------------------------

Then('the scaler edit is saved', async ({ scalerViewPage }) => {
  await scalerViewPage.expectEditModalClosed();
});

// Full API read-back of the persisted record (not the modal state). UI-triggered write => bounded poll.
Then('the scaler reads back with district {string} and oath {string}', async ({ page, world }, district, oath) => {
  const no = world.scalerLicenceNo;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${no}`);
      if (!res.ok()) return null;
      const body = (await res.json()) as { orgUnitNo?: number; oathTakenInd?: string };
      return `${body.orgUnitNo}|${body.oathTakenInd}`;
    })
    .toBe(`${district}|${oath}`);
});

Then('the scaler reads back with a Waste licence and an expiry date', async ({ page, world }) => {
  const no = world.scalerLicenceNo;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${no}`);
      if (!res.ok()) return null;
      const body = (await res.json()) as { licenceTypes?: string[]; expiryDate?: string | null };
      const types = body.licenceTypes ?? [];
      return `${types.includes('SCS')}|${types.includes('WA')}|${Boolean(body.expiryDate)}`;
    })
    .toBe('true|true|true');
});

Then('the Scaler Oath Taken field shows {string}', async ({ scalerViewPage }, value) => {
  await expect(scalerViewPage.oathSelect()).toHaveValue(value);
});

Then('no scaler update request is sent', async ({ updateScalerCalls }) => {
  expect(updateScalerCalls()).toBe(0);
});

Then('the scaler edit form is still open', async ({ scalerViewPage }) => {
  await scalerViewPage.expectEditModalOpen();
});

Then('the address information is shown read-only', async ({ scalerViewPage }) => {
  const panel = scalerViewPage.addressPanel();
  // The contact table renders (address data present), and the WHOLE panel has no editable controls / save
  // action — so the assertion fails if the tab is ever made editable, not just if the table changes.
  await expect(panel.getByRole('table', { name: 'Scaler contact info' })).toBeVisible();
  await expect(panel.getByRole('textbox')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: /save/i })).toHaveCount(0);
});
