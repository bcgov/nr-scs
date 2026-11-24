import { Given, When, Then, expect } from '../fixtures';
import {
  examDeleteSeedClientNumber,
  examUpdateTypeId,
  examCompletionDate,
} from '../../fixtures/scl/scaler-exam-test-data';

/**
 * SCL steps for Delete Scaler Training (UC-SCL-009) — a row's "Delete" → confirm modal (CNF-001
 * "Are you sure…") → DELETE /api/scalers/{no}/exams/{scalerTrainingTypeId}. DOM in ScalerExamsPage. The happy
 * path seeds a scaler + one training row (type 5), deletes it via the UI, and proves removal by the empty
 * state + the delete-spy (=== 1). The cancel path opens the confirm on anchor 5828 READ-ONLY and clicks
 * Cancel — no DELETE fires (spy === 0), the row count is unchanged.
 *
 * Exam-DELETE-specific phrasing ("training deletion", "exams / upgrades list is empty") avoids colliding with
 * the appointment delete steps ("appointment deletion") and the exam create/update steps. The tab-open Givens
 * are REUSED from scalerExam.steps.ts (bddgen registers steps across files) — NOT redefined here.
 */

Given('a scaler with a training row to delete', async ({ seedScaler, seedExam, world }) => {
  world.scalerLicenceNo = await seedScaler(examDeleteSeedClientNumber);
  await seedExam(world.scalerLicenceNo, examUpdateTypeId, examCompletionDate);
});

When('I delete the {string} training row', async ({ scalerExamsPage }, rowText) => {
  await scalerExamsPage.deleteRow(rowText);
});

Then('I am asked to confirm the training deletion', async ({ scalerExamsPage }) => {
  await scalerExamsPage.expectDeleteConfirmOpen();
});

When('I confirm the training deletion', async ({ scalerExamsPage }) => {
  await scalerExamsPage.confirmDelete();
});

When('I cancel the training deletion', async ({ scalerExamsPage }) => {
  await scalerExamsPage.cancelDelete();
});

Then('the exams \\/ upgrades list is empty', async ({ scalerExamsPage }) => {
  await expect(scalerExamsPage.emptyMessage()).toBeVisible();
});

Then('the training deletion is cancelled and {int} rows remain', async ({ scalerExamsPage }, count) => {
  await scalerExamsPage.expectDeleteConfirmClosed();
  await expect(scalerExamsPage.dataRows()).toHaveCount(count);
});

// Positive spy assertion — the happy path fires EXACTLY one delete DELETE.
Then('one exam \\/ upgrade delete request is sent', async ({ removeExamCalls }) => {
  expect(removeExamCalls()).toBe(1);
});

Then('no exam \\/ upgrade delete request is sent', async ({ removeExamCalls }) => {
  expect(removeExamCalls()).toBe(0);
});
