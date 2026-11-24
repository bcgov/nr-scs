import { Given, When, Then, expect } from '../fixtures';
import {
  examUpdateSeedClientNumber,
  examUpdateTypeId,
  examUpdateInitialDate,
  examUpdateNewDate,
  anchorEditableRowDate,
  anchorResetProbeDate,
} from '../../fixtures/scl/scaler-exam-test-data';

/**
 * SCL steps for Update Scaler Training (UC-SCL-008) — a row's "Edit" opens the SHARED "Exams / Upgrades -
 * Edit" modal (PUT /api/scalers/{no}/exams/{scalerTrainingTypeId}). DOM in ScalerExamsPage (shared with
 * create).
 *
 * Training-UPDATE-specific phrasing ("training row", "training edit form") avoids colliding with the create
 * steps (which say "exam / upgrade"). The two tab-open Givens are REUSED from scalerExam.steps.ts (bddgen
 * registers steps across every file), so they are NOT redefined here.
 */

// --- Given ---------------------------------------------------------------------------------------

Given('a scaler with a training row exists to update', async ({ seedScaler, seedExam, world }) => {
  world.scalerLicenceNo = await seedScaler(examUpdateSeedClientNumber);
  await seedExam(world.scalerLicenceNo, examUpdateTypeId, examUpdateInitialDate);
});

// --- When: happy update (in place) ---------------------------------------------------------------

When('I change the completion date of the {string} training row', async ({ scalerExamsPage }, rowText) => {
  await scalerExamsPage.openEditForRow(rowText);
  await scalerExamsPage.setEditCompletionDate(examUpdateNewDate);
  await scalerExamsPage.saveEdit();
});

When('I clear the completion date of the {string} training row', async ({ scalerExamsPage }, rowText) => {
  await scalerExamsPage.openEditForRow(rowText);
  await scalerExamsPage.clearCompletionDate();
  await scalerExamsPage.saveEdit();
});

// --- When: no-write paths on the anchor (Reset / Back) -------------------------------------------

// S03 — edit the date, then Reset reverts formValues to the loaded record (no request).
When('I change then reset the completion date of the {string} training row', async ({ scalerExamsPage }, rowText) => {
  await scalerExamsPage.openEditForRow(rowText);
  await scalerExamsPage.setEditCompletionDate(anchorResetProbeDate);
  await scalerExamsPage.resetEdit();
});

// S04 — open the edit modal then leave via Back (closeEditor; no request).
When('I open the {string} training row for editing and click Back', async ({ scalerExamsPage }, rowText) => {
  await scalerExamsPage.openEditForRow(rowText);
  await scalerExamsPage.backEdit();
});

// --- Then ----------------------------------------------------------------------------------------

// asText renders the persisted Y-m-d completion date verbatim in the list's Completion Date cell.
Then('the {string} training row shows the updated completion date', async ({ scalerExamsPage }, rowText) => {
  await expect(scalerExamsPage.completionDateCell(rowText)).toHaveText(examUpdateNewDate);
});

// asText renders a null completion date as an em dash — see nr-scs utils/display.ts.
Then('the {string} training row shows no completion date', async ({ scalerExamsPage }, rowText) => {
  await expect(scalerExamsPage.completionDateCell(rowText)).toHaveText('—');
});

// After Reset the field returns to the persisted value (poll — the DatePicker re-syncs its input async).
// Assert the modal is still OPEN first: inputValue() succeeds on a hidden input, so without this a Reset that
// erroneously CLOSED the modal would still pass if the stale value happened to match. Mirrors S04's closed check.
Then('the completion date field reverts to the persisted value', async ({ scalerExamsPage }) => {
  await scalerExamsPage.expectEditModalOpen();
  await expect.poll(() => scalerExamsPage.editCompletionDateValue()).toBe(anchorEditableRowDate);
});

Then('the training edit form is closed', async ({ scalerExamsPage }) => {
  await scalerExamsPage.expectEditModalClosed();
});

// Positive spy assertion — the happy path fires EXACTLY one update PUT.
Then('one training update request is sent', async ({ updateExamCalls }) => {
  expect(updateExamCalls()).toBe(1);
});

Then('no training update request is sent', async ({ updateExamCalls }) => {
  expect(updateExamCalls()).toBe(0);
});
