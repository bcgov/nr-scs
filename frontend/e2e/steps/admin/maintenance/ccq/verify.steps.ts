import { ABSENT_QUESTION_ID, type InspectionQuestionBody } from '../../../../fixtures/admin/maintenance/ccq-test-data';
import { Then, expect } from '../../../fixtures';

/**
 * CCQ read-back and state assertions. Prove-the-negative per direction: success -> full API read-back;
 * rejection -> zero mutation calls (client block) or record absent/unchanged (server rejection).
 */

/**
 * Find the id of a question just created via the UI (the modal closes without exposing it — see the
 * @discovered-divergence test) by searching for its unique questionText, and register it for cleanup.
 * Teardown must run even when a later assertion fails, so callers invoke this BEFORE any assertion that
 * might fail — not only from the "matches submitted values" happy-path step.
 */
async function discoverAndRegisterId(
  request: { get: (url: string) => Promise<{ ok(): boolean; status(): number; text(): Promise<string>; json(): Promise<unknown> }> },
  body: InspectionQuestionBody,
  createdQuestionIds: Array<{ id: string; usedAnswerCode?: string }>,
): Promise<string> {
  // POLL, don't single-shot: the create POST fires when Save is clicked, and this may be called straight
  // after save (the @discovered-divergence path has no "modal should close" wait before it). A one-shot
  // search can race the write's commit → find 0 → throw AND leak the row (never registered for cleanup).
  // A bounded poll settles on the committed row, so cleanup always registers it. `qid` handled elsewhere.
  let rows: Array<{ inspectionQuestionId: number }> = [];
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/inspection-questions?questionText=${encodeURIComponent(body.questionText)}`);
        if (!res.ok()) throw new Error(`[verify] search failed: HTTP ${res.status()} — ${await res.text()}`);
        rows = (await res.json()) as Array<{ inspectionQuestionId: number }>;
        return rows.length;
      },
      { timeout: 10_000, message: `expected exactly 1 question matching "${body.questionText}"` },
    )
    .toBe(1);
  const id = String(rows[0].inspectionQuestionId);
  createdQuestionIds.push({ id }); // register for cleanup now that the id is known
  return id;
}

type QuestionDetail = {
  inspectionQuestionId: number;
  questionText: string;
  commentRequiredInd: string;
  sortOrderNo: number;
  effectiveDate: string;
  expiryDate: string;
  inspectionTypeCodes: string[];
  scalingMethodTypeCodes: string[];
  validResponseCodes: string[];
  questionUsed?: boolean;
};

Then('the modal should close', async ({ questionsPage }) => {
  await questionsPage.expectModalClosed();
});

// Registers the question this scenario just created for cleanup BEFORE the divergence assertion runs —
// teardown must happen even though that assertion is expected to fail (see discoverAndRegisterId).
Then('the created question is registered for cleanup', async ({ request, world, createdQuestionIds }) => {
  const body = world.questionBody;
  if (!body) throw new Error('[verify] no questionBody in world — enter/seed a question first');
  if (!world.questionId) {
    world.questionId = await discoverAndRegisterId(request, body, createdQuestionIds);
  }
});

// DISCOVERED DIVERGENCE test (create.feature @S01 @discovered-divergence) — asserts the legacy-intended
// behavior (save forwards to the record's view), which the current app does NOT do (see feature comment).
// Asserts actual view-body content (`#view-question-text`, only rendered when `modalMode === 'view'`),
// NOT just the modal heading — QuestionsModal's `modalHeading` ternary falls back to "Inspection
// Question - Details" whenever `modalMode` is null too (not only when it's genuinely 'view'), and during
// the Carbon Modal's close transition that fallback text is briefly visible — a false-positive trap.
Then('the question should be shown in the view', async ({ questionsPage }) => {
  await expect(questionsPage.page.locator('#view-question-text')).toBeVisible();
});

Then('the saved question should match the submitted values', async ({ request, world, createdQuestionIds }) => {
  const body = world.questionBody;
  if (!body) throw new Error('[verify] no questionBody in world — enter/seed a question first');

  const id = world.questionId ?? (world.questionId = await discoverAndRegisterId(request, body, createdQuestionIds));

  const res = await request.get(`/api/inspection-questions/${id}`);
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  const detail = (await res.json()) as QuestionDetail;

  expect(detail.questionText).toBe(body.questionText);
  expect(detail.commentRequiredInd).toBe(body.commentRequiredInd);
  expect(detail.sortOrderNo).toBe(body.sortOrderNo);
  expect(detail.effectiveDate).toBe(body.effectiveDate);
  expect(detail.expiryDate).toBe(body.expiryDate);
  // Compare all three code arrays as SETS — the server does not guarantee order, so an order-sensitive
  // toEqual would be fragile the moment the factory selects more than one type/method.
  expect(new Set(detail.inspectionTypeCodes)).toEqual(new Set(body.inspectionTypeCodes));
  expect(new Set(detail.scalingMethodTypeCodes)).toEqual(new Set(body.scalingMethodTypeCodes));
  expect(new Set(detail.validResponseCodes)).toEqual(new Set(body.validResponseCodes));
});

Then('no create-question request should be sent', async ({ createQuestionCalls }) => {
  expect(createQuestionCalls()).toBe(0);
});

Then('no update-question request should be sent', async ({ updateQuestionCalls }) => {
  expect(updateQuestionCalls()).toBe(0);
});

Then('an error banner should be shown', async ({ questionsPage }) => {
  await expect(questionsPage.errorBanner).toBeVisible();
});

Then('the question should not have been created', async ({ request, world }) => {
  const body = world.questionBody;
  if (!body) throw new Error('[verify] no questionBody in world');
  const res = await request.get(`/api/inspection-questions?questionText=${encodeURIComponent(body.questionText)}`);
  const rows = (await res.json()) as unknown[];
  expect(rows).toHaveLength(0);
});

Then('the view should show the question\'s saved values', async ({ questionsPage, world }) => {
  const body = world.questionBody;
  if (!body) throw new Error('[verify] no questionBody in world');
  await expect(questionsPage.page.locator('#view-sort-order')).toHaveValue(String(body.sortOrderNo));
  await expect(questionsPage.page.locator('#view-question-text')).toHaveValue(body.questionText);
  await expect(questionsPage.page.locator('#view-effective-date')).toHaveValue(body.effectiveDate);
  await expect(questionsPage.page.locator('#view-expiry-date')).toHaveValue(body.expiryDate);
});

Then('the Edit Record and Delete actions should be visible', async ({ questionsPage }) => {
  await expect(questionsPage.editRecordButton).toBeVisible();
  await expect(questionsPage.deleteButton).toBeVisible();
});

Then('an info banner should explain only Sort Order and Expiry Date can be updated', async ({ questionsPage }) => {
  await expect(questionsPage.usedQuestionInfoBanner()).toBeVisible();
});

Then('the {string} field should be disabled', async ({ questionsPage }, label: string) => {
  await questionsPage.expectFieldDisabledWhenUsed(label);
});

Then('only the Sort Order and Expiry Date should have changed', async ({ request, world }) => {
  const original = world.originalQuestionBody;
  const submitted = world.questionBody;
  if (!original || !submitted || !world.questionId) {
    throw new Error('[verify] missing original/submitted questionBody or questionId in world');
  }
  const res = await request.get(`/api/inspection-questions/${world.questionId}`);
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  const detail = (await res.json()) as QuestionDetail;

  // The two permitted fields reflect the NEW values.
  expect(detail.sortOrderNo).toBe(submitted.sortOrderNo);
  expect(detail.expiryDate).toBe(submitted.expiryDate);
  // Everything else is unchanged from the original seed — proves the server enforces the restriction
  // independently of the (disabled) UI controls, not just visually.
  expect(detail.questionText).toBe(original.questionText);
  expect(detail.commentRequiredInd).toBe(original.commentRequiredInd);
  expect(detail.effectiveDate).toBe(original.effectiveDate);
  expect(detail.inspectionTypeCodes).toEqual(original.inspectionTypeCodes);
  expect(detail.scalingMethodTypeCodes).toEqual(original.scalingMethodTypeCodes);
  expect(new Set(detail.validResponseCodes)).toEqual(new Set(original.validResponseCodes));
});

Then('the question should no longer exist', async ({ request, world }) => {
  if (!world.questionId) throw new Error('[verify] no questionId in world');
  // POLL for the 404: the UI delete mutation is async, so a single-shot GET can race the commit and
  // still see 200. Matches the CHK convention (`the summary check scale record should no longer exist`).
  await expect
    .poll(async () => (await request.get(`/api/inspection-questions/${world.questionId}`)).status(), {
      timeout: 10_000,
      message: 'deleted inspection question still resolves on read-back',
    })
    .toBe(404);
});

Then('the question should still exist', async ({ request, world }) => {
  if (!world.questionId) throw new Error('[verify] no questionId in world');
  const res = await request.get(`/api/inspection-questions/${world.questionId}`);
  expect(res.ok()).toBeTruthy();
});

// The spy proves no PUT left the browser; this proves the stored row still matches the seed, so a
// discarded edit is caught even if it reached the server another way. All five scalar fields, not just
// the one the scenario typed into — Back must discard the whole form, not a subset.
Then('the stored question should still have its saved values', async ({ request, world }) => {
  const original = world.originalQuestionBody;
  if (!original || !world.questionId) throw new Error('[verify] no seeded question in world');
  let detail: QuestionDetail | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/inspection-questions/${world.questionId}`);
        if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
        detail = (await res.json()) as QuestionDetail;
        return detail.sortOrderNo;
      },
      { timeout: 10_000, message: `question ${world.questionId} no longer holds its seeded Sort Order — a discarded edit was persisted` },
    )
    .toBe(original.sortOrderNo);
  expect(detail!.questionText).toBe(original.questionText);
  expect(detail!.commentRequiredInd).toBe(original.commentRequiredInd);
  expect(detail!.effectiveDate).toBe(original.effectiveDate);
  expect(detail!.expiryDate).toBe(original.expiryDate);
});

Then('the question detail request should be refused as not found', async ({ world }) => {
  const res = world.questionDetailResponse;
  if (!res) throw new Error('[verify] no questionDetailResponse in world — request the detail first');
  expect(res.status, `expected HTTP 404 for question ${ABSENT_QUESTION_ID}, got ${res.status}`).toBe(404);
  expect(res.code).toBe('NOT_FOUND');
});

// Pairs with "the view should show the question's saved values" but takes the OTHER comparand: after a
// discarded edit the view must redraw from the loaded record, so a value the user typed and abandoned
// must not survive on screen. Catches a display leak the API read-back cannot see.
Then('the view should show the question\'s values from before the edit', async ({ questionsPage, world }) => {
  const original = world.originalQuestionBody;
  if (!original) throw new Error('[verify] no originalQuestionBody in world — seed a question first');
  await expect(questionsPage.page.locator('#view-sort-order')).toHaveValue(String(original.sortOrderNo));
  await expect(questionsPage.page.locator('#view-question-text')).toHaveValue(original.questionText);
  await expect(questionsPage.page.locator('#view-effective-date')).toHaveValue(original.effectiveDate);
  await expect(questionsPage.page.locator('#view-expiry-date')).toHaveValue(original.expiryDate);
});
