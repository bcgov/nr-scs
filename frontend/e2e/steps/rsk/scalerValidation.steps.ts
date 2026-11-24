import { When, Then, expect } from '../fixtures';
import {
  scalerInRangeAnswers,
  SCALER_COMMENTS_MAX_LENGTH,
} from '../../fixtures/rsk/scaler-risk-complete-test-data';

/**
 * Steps for the Scaler Risk Assessment VALIDATION slices (UC-RSK-006 S02/S03 + the S05 edit-clear
 * divergence). The negative assertion "no scaler risk assessment create request should be sent" PROVES the
 * write never left the browser (spy count === 0) rather than inferring it from a missing redirect. The
 * "I should see the error" assertion is reused from steps/common/assertions.steps.ts.
 */

// ---- S02: create gate — one question left unanswered ----
When('I answer every scaler risk question except the first', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.answerAllExcept(scalerInRangeAnswers, scalerInRangeAnswers[0].questionId);
});

Then('I should remain on the scaler assessment form', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.expectOnCreateForm();
});

Then('no scaler risk assessment create request should be sent', async ({ scalerRiskCreateCalls }) => {
  expect(scalerRiskCreateCalls()).toBe(0);
});

// ---- S05 divergence: edit — clear every answer ----
When('I clear every scaler risk answer', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.clearAllAnswers();
});

Then('I should remain on the scaler edit form for that assessment', async ({ scalerRiskFormPage, world }) => {
  if (!world.riskAssessmentId) throw new Error('no seeded scaler risk assessment id in world');
  await scalerRiskFormPage.expectStillOnEditForm(world.riskAssessmentId);
});

// ---- S03: comments length cap ----
When('I type {int} characters into the scaler comments field', async ({ scalerRiskFormPage }, count) => {
  await scalerRiskFormPage.setComments('x'.repeat(count));
});

Then('the scaler comments field holds at most {int} characters', async ({ scalerRiskFormPage }, max) => {
  expect(max).toBe(SCALER_COMMENTS_MAX_LENGTH); // guards the feature literal against the pinned constant
  expect(await scalerRiskFormPage.commentsMaxLength()).toBe(SCALER_COMMENTS_MAX_LENGTH);
  const value = await scalerRiskFormPage.commentsValue();
  expect(value.length).toBeLessThanOrEqual(max);
  expect(value.length).toBe(SCALER_COMMENTS_MAX_LENGTH); // over-typed input is capped exactly at the max
});
