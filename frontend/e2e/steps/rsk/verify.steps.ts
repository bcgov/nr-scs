import { Then, expect } from '../fixtures';
import {
  inRangeAnswers,
  editAnswerChange,
  formDisplayedTotals,
} from '../../fixtures/rsk/rsk-test-data';
import { readAssessment, selectionsOf } from './riskAssessmentReadBack';

/**
 * Read-back verification for the Scale Site Risk Assessment success paths. Prefers the black-box API
 * read (GET /api/scale-site-risk-assessments/{id}) and asserts the FULL persisted record — the computed
 * rating, every questionnaire response, and the comments — not merely a redirect. The polled read-back
 * helpers are shared with the scaler twin (steps/rsk/scalerVerify.steps.ts) via ./riskAssessmentReadBack;
 * this file keeps only the scale-site fixtures + Then wiring and passes the scale-site endpoint base.
 */

/** The scale-site subject's GET-by-id read-back route (without the trailing id). */
const SCALE_SITE_READBACK_BASE = '/api/scale-site-risk-assessments';

// ---- S01: client-side computed rating (BR-RSK-007-01, shown on the form BEFORE any save) ----
Then(
  'the assessment form shows a computed total of {string} out of {string}',
  async ({ scaleSiteRiskFormPage }, total: string, maxTotal: string) => {
    // Guard the feature literals against the pinned fixture, so a DB re-extract can't leave them lying.
    // NB the max is the FORM's product-based 3780, not the API's SUM-based maxRiskRating (141).
    expect(Number(total)).toBe(formDisplayedTotals.total);
    expect(Number(maxTotal)).toBe(formDisplayedTotals.maxTotal);
    await scaleSiteRiskFormPage.expectComputedTotals(total, maxTotal);
  },
);

// ---- S01: create read-back ----
Then(
  'the assessment is created with a computed rating of {string} and level {string}',
  async ({ request, scaleSiteRiskCreateSpy, createdScaleSiteRiskAssessmentIds, world }, rating, level) => {
    // The create POST fires async after the Save click; poll until the passive spy captured the new id.
    await expect
      .poll(() => scaleSiteRiskCreateSpy.createdIds.length, {
        message: 'the UI create POST did not return a riskQuestionnaireId in a 2xx response',
      })
      .toBeGreaterThan(0);
    const id = scaleSiteRiskCreateSpy.createdIds.at(-1) as string;
    world.riskAssessmentId = id;
    createdScaleSiteRiskAssessmentIds.push(id); // register for DB cleanup the moment the id is known

    const detail = await readAssessment(request, SCALE_SITE_READBACK_BASE, id);
    expect(detail.riskRating).toBe(Number(rating));
    expect(detail.codeDescription).toBe(level);
  },
);

Then('the saved assessment reads back with my answers and comments', async ({ request, world }) => {
  const detail = await readAssessment(request, SCALE_SITE_READBACK_BASE, world.riskAssessmentId as string);
  const selections = selectionsOf(detail);
  for (const { questionId, answerId } of inRangeAnswers) {
    expect(selections[questionId], `question ${questionId} response`).toBe(answerId);
  }
  expect(detail.comments).toBe((world.expected as { comments?: string } | undefined)?.comments ?? '');
});

// ---- S03: edit read-back ----
Then(
  'the updated assessment reads back with rating {string} and my new comments',
  async ({ request, world }, rating) => {
    const detail = await readAssessment(request, SCALE_SITE_READBACK_BASE, world.riskAssessmentId as string);
    expect(detail.riskRating).toBe(Number(rating));
    const selections = selectionsOf(detail);
    expect(selections[editAnswerChange.questionId], 'changed answer persisted').toBe(
      editAnswerChange.newAnswerId,
    );
    expect(detail.comments).toBe((world.expected as { comments?: string } | undefined)?.comments ?? '');
  },
);
