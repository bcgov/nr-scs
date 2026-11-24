import { type APIRequestContext, expect } from '@playwright/test';

/**
 * Shared API read-back helpers for BOTH risk-assessment subjects (scaler + scale site). The two subjects
 * are driven by the same shared React form and expose the same detail shape; their GET-by-id read-backs
 * differ ONLY by endpoint base (`/api/scaler-risk-assessments` vs `/api/scale-site-risk-assessments`). This
 * mirrors the base-class extraction the page objects use (BaseRiskAssessmentFormPage / BaseRiskRatingTabPage)
 * so the verify steps don't carry a byte-for-byte copy of the same helper. The subject-specific verify step
 * files (verify.steps.ts / scalerVerify.steps.ts) keep only their own fixtures + Then wiring and pass their
 * endpoint base in here.
 */

/** The persisted record shape returned by GET /api/{subject}-risk-assessments/{id}. */
export interface AssessmentDetail {
  riskQuestionnaireId: number;
  riskRating: number;
  codeDescription: string;
  comments: string | null;
  sections: { questions: { questionId: number; selectedAnswerId: number | null }[] }[];
}

/**
 * Poll GET-by-id until it returns 200, then hand back the parsed detail. Polled (not a bare GET) because
 * the create/edit write is triggered through the UI (a Save click) and the read can otherwise race the
 * commit. `endpointBase` is the subject's read-back route WITHOUT the trailing id, e.g.
 * `/api/scaler-risk-assessments`.
 */
export async function readAssessment(
  request: APIRequestContext,
  endpointBase: string,
  id: string,
): Promise<AssessmentDetail> {
  let detail: AssessmentDetail | null = null;
  await expect
    .poll(
      async () => {
        const res = await request.get(`${endpointBase}/${id}`);
        if (res.status() !== 200) return 0;
        detail = (await res.json()) as AssessmentDetail;
        return res.status();
      },
      { message: `risk assessment ${id} did not read back with HTTP 200 from ${endpointBase}` },
    )
    .toBe(200);
  return detail as unknown as AssessmentDetail;
}

/** Flatten the detail's sections into a questionId -> selectedAnswerId map. */
export function selectionsOf(detail: AssessmentDetail): Record<number, number | null> {
  const map: Record<number, number | null> = {};
  for (const section of detail.sections ?? []) {
    for (const q of section.questions ?? []) {
      map[q.questionId] = q.selectedAnswerId ?? null;
    }
  }
  return map;
}
