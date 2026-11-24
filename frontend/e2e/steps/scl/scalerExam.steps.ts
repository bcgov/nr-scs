import { Given, When, Then, expect } from '../fixtures';
import { anchorScalerLicenceNo } from '../../fixtures/scl/scaler-edit-test-data';
import {
  examSeedClientNumber,
  examTypeLabelToAdd,
  examCompletionDate,
  duplicateExamTypeLabel,
} from '../../fixtures/scl/scaler-exam-test-data';

/**
 * SCL steps for Record Scaler Training (UC-SCL-007) — the Exams / Upgrades tab + create modal. DOM in
 * ScalerExamsPage.
 *
 * Cucumber Expressions treat "/" as alternation, so every literal slash in a step string is escaped "\/"
 * (source: "\\/"); the .feature files keep the plain "/". Training-specific phrasing avoids colliding with
 * the MNT "exam upgrade" LOV steps and the appointment steps.
 */

// --- Given ---------------------------------------------------------------------------------------

Given('a scaler exists to record training for', async ({ seedScaler, world }) => {
  world.scalerLicenceNo = await seedScaler(examSeedClientNumber);
});

Given('I open the scaler Exams \\/ Upgrades tab', async ({ scalerExamsPage, world }) => {
  expect(world.scalerLicenceNo, 'a prior step seeded a scaler').toBeTruthy();
  await scalerExamsPage.gotoExams(world.scalerLicenceNo as string);
});

Given('I open the Exams \\/ Upgrades tab for the sample scaler', async ({ scalerExamsPage }) => {
  await scalerExamsPage.gotoExams(anchorScalerLicenceNo);
});

// --- When: happy-path adds -----------------------------------------------------------------------

When('I add an exam \\/ upgrade with a completion date', async ({ scalerExamsPage }) => {
  await scalerExamsPage.openCreate();
  await scalerExamsPage.selectType(examTypeLabelToAdd);
  await scalerExamsPage.setCompletionDate(examCompletionDate);
  await scalerExamsPage.saveRecord();
});

When('I add an exam \\/ upgrade without a completion date', async ({ scalerExamsPage }) => {
  await scalerExamsPage.openCreate();
  await scalerExamsPage.selectType(examTypeLabelToAdd);
  await scalerExamsPage.saveRecord();
});

// --- When: filter (client-side) ------------------------------------------------------------------

When('I filter the exams \\/ upgrades by {string}', async ({ scalerExamsPage }, label) => {
  await scalerExamsPage.selectFilter(label);
});

// --- When: validation negatives ------------------------------------------------------------------

// S05 — client-side required check (no type selected); no POST fires.
When('I try to add an exam \\/ upgrade without selecting a type', async ({ scalerExamsPage }) => {
  await scalerExamsPage.openCreate();
  await scalerExamsPage.saveRecord();
});

// S04 — open the create form then leave via Back (no save, no POST).
When('I open the add exam \\/ upgrade form and click Back', async ({ scalerExamsPage }) => {
  await scalerExamsPage.openCreate();
  await scalerExamsPage.back();
});

// S07-DUP — select a type the scaler already has; the POST IS sent and the server rejects it (400).
When('I try to add an exam \\/ upgrade for a type the scaler already has', async ({ scalerExamsPage }) => {
  await scalerExamsPage.openCreate();
  await scalerExamsPage.selectType(duplicateExamTypeLabel);
  await scalerExamsPage.saveRecord();
});

// --- Then ----------------------------------------------------------------------------------------

Then('the exam \\/ upgrade row for {string} appears', async ({ scalerExamsPage }, description) => {
  await expect(scalerExamsPage.rowByText(description)).toBeVisible();
});

// asText renders a null completion date as an em dash — see nr-scs utils/display.ts.
Then('the exam \\/ upgrade row for {string} shows no completion date', async ({ scalerExamsPage }, description) => {
  await expect(scalerExamsPage.completionDateCell(description)).toHaveText('—');
});

// asText renders the persisted Y-m-d completion date verbatim in the list's Completion Date cell. Asserts the
// value S01 actually set (examCompletionDate) — not the update comparand, which only equals it by today's offset.
Then('the exam \\/ upgrade row for {string} shows the completion date', async ({ scalerExamsPage }, description) => {
  await expect(scalerExamsPage.completionDateCell(description)).toHaveText(examCompletionDate);
});

Then('the exams \\/ upgrades list shows {int} rows', async ({ scalerExamsPage }, count) => {
  await expect(scalerExamsPage.dataRows()).toHaveCount(count);
});

// The list Type column shows the type description only for types in the active LOV; a retired type falls
// back to its raw code. So a class filter asserts on the always-rendered class Description ("Exam"/"Upgrade").
Then('only an exam \\/ upgrade row of class {string} is shown', async ({ scalerExamsPage }, classLabel) => {
  await expect(scalerExamsPage.dataRows()).toHaveCount(1);
  await expect(scalerExamsPage.rowByText(classLabel)).toBeVisible();
});

Then('I should see the exam \\/ upgrade error {string}', async ({ scalerExamsPage }, message) => {
  await expect(scalerExamsPage.errorText(message)).toBeVisible();
});

// Positive spy assertion — the happy path fires EXACTLY one create POST (guards against a dead spy that
// would make the count-based negatives pass vacuously).
Then('one exam \\/ upgrade create request is sent', async ({ createExamCalls }) => {
  expect(createExamCalls()).toBe(1);
});

Then('no exam \\/ upgrade create request is sent', async ({ createExamCalls }) => {
  expect(createExamCalls()).toBe(0);
});

Then('the add exam \\/ upgrade form is still open', async ({ scalerExamsPage }) => {
  await scalerExamsPage.expectModalOpen();
});

Then('the add exam \\/ upgrade form is closed', async ({ scalerExamsPage }) => {
  await scalerExamsPage.expectModalClosed();
});
