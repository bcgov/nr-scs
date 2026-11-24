import { When, Then, expect } from '../fixtures';
import { inRangeAnswers, COMMENTS_MAX_LENGTH } from '../../fixtures/rsk/rsk-test-data';

/**
 * Steps for the Scale Site Risk Assessment VALIDATION slices (UC-RSK-007 S04/S05/S06). The negative
 * assertion "no risk assessment create request should be sent" PROVES the write never left the browser
 * (spy count === 0) rather than inferring it from a missing redirect. The "I should see the error"
 * assertion is reused from steps/common/assertions.steps.ts.
 */

// ---- S04: create gate — one question left unanswered ----
When('I answer every risk question except the first', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.answerAllExcept(inRangeAnswers, inRangeAnswers[0].questionId);
});

Then('I should remain on the assessment form', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.expectOnCreateForm();
});

Then('no risk assessment create request should be sent', async ({ scaleSiteRiskCreateCalls }) => {
  expect(scaleSiteRiskCreateCalls()).toBe(0);
});

// ---- S05: edit divergence — clear every answer ----
When('I clear every risk answer', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.clearAllAnswers();
});

Then('I should remain on the edit form for that assessment', async ({ scaleSiteRiskFormPage, world }) => {
  if (!world.riskAssessmentId) throw new Error('no seeded risk assessment id in world');
  await scaleSiteRiskFormPage.expectStillOnEditForm(world.riskAssessmentId);
});

// ---- S06: comments length cap ----
When('I type {int} characters into the comments field', async ({ scaleSiteRiskFormPage }, count) => {
  await scaleSiteRiskFormPage.setComments('x'.repeat(count));
});

Then('the comments field holds at most {int} characters', async ({ scaleSiteRiskFormPage }, max) => {
  expect(max).toBe(COMMENTS_MAX_LENGTH); // guards the feature literal against the pinned constant
  expect(await scaleSiteRiskFormPage.commentsMaxLength()).toBe(COMMENTS_MAX_LENGTH);
  const value = await scaleSiteRiskFormPage.commentsValue();
  expect(value.length).toBeLessThanOrEqual(max);
  expect(value.length).toBe(COMMENTS_MAX_LENGTH); // over-typed input is capped exactly at the max
});
