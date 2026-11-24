import { When, Then, expect } from '../fixtures';
import { daysAhead } from '../../fixtures/common/dates';

/**
 * Steps for the Site Inspection create VALIDATION slices (UC-INS-001 S05/S06/S07). The negative
 * assertion "no inspection create request should be sent" PROVES the write never left the browser
 * (spy count === 0) rather than inferring it from a missing redirect. Reuses the create-screen /
 * choose-type / fill / save steps from create.steps.ts.
 */

When(
  'I continue without choosing an inspection type or site type',
  async ({ inspectionCreatePage }) => {
    await inspectionCreatePage.clickNext();
  },
);

When('I set the inspection date to a future date', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.setInspectionDate(daysAhead(5));
});

When('I flag follow-up required on the first question', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.setQuestionFollowUpRequired(0, 'Yes');
});

Then('no inspection create request should be sent', async ({ inspectionCreateCalls }) => {
  expect(inspectionCreateCalls()).toBe(0);
});
