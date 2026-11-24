import { Then, expect } from '../fixtures';
import {
  scalerInRangeAnswers,
  scalerEditAnswerChange,
  scalerExpectedRating,
  scalerFormDisplayedTotals,
} from '../../fixtures/rsk/scaler-risk-complete-test-data';
import { readAssessment, selectionsOf } from './riskAssessmentReadBack';

/**
 * Read-back verification for the Scaler Risk Assessment success paths. Prefers the black-box API read
 * (GET /api/scaler-risk-assessments/{id}) and asserts the FULL persisted record — the computed rating,
 * every questionnaire response, and the comments — not merely a redirect. The polled read-back helpers are
 * shared with the scale-site twin (steps/rsk/verify.steps.ts) via ./riskAssessmentReadBack; this file keeps
 * only the scaler fixtures + Then wiring and passes the scaler endpoint base.
 */

/** The scaler subject's GET-by-id read-back route (without the trailing id). */
const SCALER_READBACK_BASE = '/api/scaler-risk-assessments';

// ---- S01: client-side computed rating (shown on the form BEFORE any save) ----
Then(
  'the scaler assessment form shows a computed total of {string} out of {string}',
  async ({ scalerRiskFormPage }, total: string, maxTotal: string) => {
    // Guard the feature literals against the pinned fixture, so a DB re-extract can't leave them lying.
    // NB the max is the FORM's product-based 1890, not the API's SUM-based maxRiskRating (123).
    expect(Number(total)).toBe(scalerFormDisplayedTotals.total);
    expect(Number(maxTotal)).toBe(scalerFormDisplayedTotals.maxTotal);
    await scalerRiskFormPage.expectComputedTotals(total, maxTotal);
  },
);

// ---- S01: create read-back ----
Then(
  'the scaler assessment is created with a computed rating of {string} and level {string}',
  async ({ request, scalerRiskCreateSpy, world }, rating, level) => {
    // The create POST fires async after the Save click; poll until the passive spy captured the new id.
    // (The spy already registered the id for DB cleanup at capture time — see scalerRiskCreateSpy in
    // steps/fixtures/rsk.ts — so this step only reads it to assert; it does not own teardown.)
    await expect
      .poll(() => scalerRiskCreateSpy.createdIds.length, {
        message: 'the UI create POST did not return a riskQuestionnaireId in a 2xx response',
      })
      .toBeGreaterThan(0);
    const id = scalerRiskCreateSpy.createdIds.at(-1) as string;
    world.riskAssessmentId = id;

    // Guard the feature literals against the pinned fixture, so a DB re-extract can't leave them lying.
    expect(Number(rating)).toBe(scalerExpectedRating.riskRating);
    expect(level).toBe(scalerExpectedRating.codeDescription);

    const detail = await readAssessment(request, SCALER_READBACK_BASE, id);
    expect(detail.riskRating).toBe(Number(rating));
    expect(detail.codeDescription).toBe(level);
  },
);

Then('the saved scaler assessment reads back with my answers and comments', async ({ request, world }) => {
  const detail = await readAssessment(request, SCALER_READBACK_BASE, world.riskAssessmentId as string);
  const selections = selectionsOf(detail);
  for (const { questionId, answerId } of scalerInRangeAnswers) {
    expect(selections[questionId], `question ${questionId} response`).toBe(answerId);
  }
  expect(detail.comments).toBe((world.expected as { comments?: string } | undefined)?.comments ?? '');
});

// ---- S05: edit Back (discard) — prove the in-progress change did NOT persist ----
// The edit step flips q243 (326 -> 325, which WOULD raise the rating 90 -> 108). Backing out without Save
// must leave the seeded record untouched: rating still 90 AND q243 still on its original answer. Reading the
// record back UNCHANGED is the prove-the-negative for "without saving" (the Back handler never issues a PUT).
Then(
  'the scaler edit is discarded and the assessment still reads back with rating {string}',
  async ({ request, world }, rating) => {
    // Guard the feature literal against the pinned fixture (the original, unchanged rating).
    expect(Number(rating)).toBe(scalerExpectedRating.riskRating);
    const detail = await readAssessment(request, SCALER_READBACK_BASE, world.riskAssessmentId as string);
    expect(detail.riskRating, 'rating unchanged — Back discarded the edit').toBe(Number(rating));
    const selections = selectionsOf(detail);
    const originalAnswer = scalerInRangeAnswers.find(
      (a) => a.questionId === scalerEditAnswerChange.questionId,
    )?.answerId;
    expect(
      selections[scalerEditAnswerChange.questionId],
      'the in-progress answer change was NOT persisted',
    ).toBe(originalAnswer);
  },
);

// ---- S05: edit read-back ----
Then(
  'the updated scaler assessment reads back with rating {string} and my new comments',
  async ({ request, world }, rating) => {
    // Guard the feature literal against the pinned fixture (the edit flips q243 -> rating 108).
    expect(Number(rating)).toBe(scalerEditAnswerChange.expectedRating);
    const detail = await readAssessment(request, SCALER_READBACK_BASE, world.riskAssessmentId as string);
    expect(detail.riskRating).toBe(Number(rating));
    const selections = selectionsOf(detail);
    expect(selections[scalerEditAnswerChange.questionId], 'changed answer persisted').toBe(
      scalerEditAnswerChange.newAnswerId,
    );
    expect(detail.comments).toBe((world.expected as { comments?: string } | undefined)?.comments ?? '');
  },
);
