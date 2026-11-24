import { Given, When, Then, expect } from '../fixtures';
import {
  inspectionEditValues,
  inspectionMissingId,
  inspectionInvalidRouteId,
  inspectorInvalidGuid,
  INSPECTOR_GUID,
} from '../../fixtures/ins/ins-test-data';
import { daysAgo, daysAhead } from '../../fixtures/common/dates';
import { makeRequire } from '../common/world';

/**
 * Steps for the APP-ONLY Site Inspection EDIT flow (`features/ins/inspection-edit/`).
 *
 * No legacy INS use case drives this screen — UC-INS-003 was the only one that reached the legacy edit
 * form, and it did so purely to capture compliance/enforcement, which the new app never built (see
 * `features/ins/uc-ins-003-compliance-enforcement/coverage.md`). So these steps are grounded on the new
 * app's own write path (`pages/Edit/ScaleSiteInspection` + backend `InspectionValidator`), verified by
 * hand against PUT `/api/scale-sites/inspection/{id}` on 2026-09-09.
 *
 * Every scenario operates on a record it SEEDED itself (`seedInspection`), never on the shared real
 * anchor 322429 that the security suites read — an edit suite that mutated that record would corrupt
 * another suite's fixture under `fullyParallel`.
 *
 * Step phrasing deliberately says "inspection edit" rather than reusing the create suite's
 * "I save the inspection" / "I reset the inspection form": those bind to the CREATE page object, and a
 * duplicate cucumber expression is a bddgen-time collision.
 */

/** Reads required scenario state; see `steps/common/world.ts`. */
const req = makeRequire('ins-edit');

// --- opening the edit form ----------------------------------------------------------------------

When(
  'I open the site inspection edit form',
  async ({ inspectionEditPage, readInspectionEdit, world }) => {
    const site = req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr');
    const id = req(world.inspectionId, 'inspectionId');
    // Snapshot what the record holds BEFORE any edit — the Reset/Back comparand and the "only the
    // edited fields moved" baseline. Read via the API so it is independent of what the form renders.
    world.inspectionEditBaseline = await readInspectionEdit(id);
    await inspectionEditPage.open(site, id);
    await inspectionEditPage.expectLoaded(id);
  },
);

When('I click Edit Record on the inspection view', async ({ inspectionViewPage }) => {
  await inspectionViewPage.clickEditRecord();
});

Then(
  'the inspection edit form opens for that inspection',
  async ({ inspectionEditPage, world }) => {
    await inspectionEditPage.expectLoaded(req(world.inspectionId, 'inspectionId'));
  },
);

Then('I remain on the inspection edit form', async ({ inspectionEditPage, world }) => {
  await inspectionEditPage.expectStillOnEditForm(
    req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr'),
    req(world.inspectionId, 'inspectionId'),
  );
});

// --- editing ------------------------------------------------------------------------------------

When(
  'I change the inspection header and answers',
  async ({ inspectionEditPage, world }) => {
    const inspectionDate = daysAgo(3); // moved off the seeded daysAgo(1), still non-future
    const dueDate = daysAhead(10); // a follow-up DUE date legitimately may be in the future
    const { followUp } = inspectionEditValues;

    // Capture the rendered question ids so the read-back keys its per-question assertions by id rather
    // than by position or by questionText (the real library has DUPLICATE texts — 401 and 641 are both
    // "Site Active?" — so text would be ambiguous).
    const questionIds = await inspectionEditPage.renderedQuestionIds();

    await inspectionEditPage.setSiteOperatorPresent(inspectionEditValues.siteOperatorPresent);
    await inspectionEditPage.setInspectionDate(inspectionDate);
    await inspectionEditPage.setComments(inspectionEditValues.comments);
    await inspectionEditPage.answerAllQuestions(inspectionEditValues.answerCode);

    // Follow-up Y-arm on one row: flag it, then fill the three fields the rule makes mandatory.
    await inspectionEditPage.setQuestionFollowUpRequired(followUp.index, 'Yes');
    await inspectionEditPage.setQuestionFollowUpAction(followUp.index, followUp.actionText);
    await inspectionEditPage.setQuestionFollowUpDueDate(followUp.index, dueDate);
    await inspectionEditPage.setQuestionFollowUpCompleted(followUp.index, followUp.completed);

    world.inspectionEdited = {
      inspectionDate,
      siteOperatorPresentInd: inspectionEditValues.siteOperatorPresent === 'No' ? 'N' : 'Y',
      comments: inspectionEditValues.comments,
      answerCode: inspectionEditValues.answerCode,
      followUp: {
        index: followUp.index,
        inspectionQuestionId: questionIds[followUp.index],
        actionText: followUp.actionText,
        dueDate,
        completedInd: followUp.completed === 'No' ? 'N' : 'Y',
      },
    };
  },
);

When('I save the inspection edit', async ({ inspectionEditPage }) => {
  await inspectionEditPage.clickSave();
});

When('I reset the inspection edit form', async ({ inspectionEditPage }) => {
  await inspectionEditPage.clickReset();
});

When('I go back from the inspection edit form', async ({ inspectionEditPage }) => {
  await inspectionEditPage.clickBack();
});

// --- success outcome + API read-back ------------------------------------------------------------

Then(
  'the site inspection view is shown for that inspection',
  async ({ inspectionEditPage, world }) => {
    await inspectionEditPage.expectReturnedToDetailView(
      req(world.scaleSiteIdNmbr, 'scaleSiteIdNmbr'),
      req(world.inspectionId, 'inspectionId'),
    );
  },
);

Then(
  'the persisted inspection matches the edited values',
  async ({ readInspectionEdit, world }) => {
    const id = req(world.inspectionId, 'inspectionId');
    const edited = req(world.inspectionEdited, 'inspectionEdited');
    const followUp = req(edited.followUp, 'inspectionEdited.followUp');

    // The Save was UI-triggered, so the PUT fires asynchronously after the click — poll the read-back
    // rather than single-shotting it, or the GET can race the commit and read the pre-edit row.
    await expect
      .poll(
        async () => {
          const record = await readInspectionEdit(id);
          const row = record.questionResponses.find(
            (q) => q.inspectionQuestionId === followUp.inspectionQuestionId,
          );
          return {
            inspectionDate: record.inspectionDate,
            siteOperatorPresentInd: record.siteOperatorPresentInd,
            comments: record.comments,
            // Every row was answered with the same code, so assert the whole set collapses to it.
            answerCodes: [
              ...new Set(record.questionResponses.map((q) => q.inspectionAnswerCode)),
            ],
            followUpRequiredInd: row?.followUpRequiredInd,
            followUpActionText: row?.followUpActionText,
            followUpDueDate: row?.followUpDueDate,
            followUpCompletedInd: row?.followUpCompletedInd,
          };
        },
        { message: `edited inspection ${id} did not persist the submitted values`, timeout: 20_000 },
      )
      .toEqual({
        inspectionDate: edited.inspectionDate,
        siteOperatorPresentInd: edited.siteOperatorPresentInd,
        comments: edited.comments,
        answerCodes: [edited.answerCode],
        followUpRequiredInd: 'Y',
        followUpActionText: followUp.actionText,
        followUpDueDate: followUp.dueDate,
        followUpCompletedInd: followUp.completedInd,
      });
  },
);

/**
 * Answers keyed by `inspectionQuestionId`, so two reads of the same record compare equal regardless of
 * the order the backend happened to return the rows in. Comparing the answer array positionally looked
 * fine in a quiet run and then failed intermittently under parallel load — the row ORDER moved, not the
 * data — so the comparand is deliberately order-independent.
 */
const answersById = (rows: { inspectionQuestionId: number; inspectionAnswerCode: string | null }[]) =>
  Object.fromEntries(rows.map((q) => [q.inspectionQuestionId, q.inspectionAnswerCode]));

Then('the persisted inspection is unchanged', async ({ readInspectionEdit, world }) => {
  const id = req(world.inspectionId, 'inspectionId');
  const baseline = req(world.inspectionEditBaseline, 'inspectionEditBaseline');

  // Prove-the-negative for Back: not merely "no PUT was counted", but the record itself still holds
  // exactly what it held when the form loaded. Polled because a stray write would land asynchronously.
  await expect
    .poll(
      async () => {
        const record = await readInspectionEdit(id);
        return {
          inspectionDate: record.inspectionDate,
          siteOperatorPresentInd: record.siteOperatorPresentInd,
          comments: record.comments,
          answers: answersById(record.questionResponses),
        };
      },
      { message: `inspection ${id} was modified although the edit was abandoned` },
    )
    .toEqual({
      inspectionDate: baseline.inspectionDate,
      siteOperatorPresentInd: baseline.siteOperatorPresentInd,
      comments: baseline.comments,
      answers: answersById(baseline.questionResponses),
    });
});

Then(
  'the inspection edit form shows the originally loaded values',
  async ({ inspectionEditPage, world }) => {
    const baseline = req(world.inspectionEditBaseline, 'inspectionEditBaseline');

    // Compare against what the API said the record held when the form loaded — no date/answer literal
    // is hardcoded, so a re-extract or a different seeded record cannot make this stale.
    expect(await inspectionEditPage.fieldValueById('site-operator-present')).toBe(
      baseline.siteOperatorPresentInd ?? '',
    );
    expect(await inspectionEditPage.fieldValueById('inspection-date')).toBe(
      baseline.inspectionDate ?? '',
    );
    expect(await inspectionEditPage.fieldValueById('inspector')).toBe(baseline.inspector ?? '');
    expect(await inspectionEditPage.fieldValueById('inspection-comments')).toBe(
      baseline.comments ?? '',
    );
  },
);

// --- prove-the-negative on the write endpoint ---------------------------------------------------

Then('no inspection update request should be sent', async ({ inspectionUpdateCalls }) => {
  expect(
    inspectionUpdateCalls(),
    'a PUT reached /api/scale-sites/inspection/{id} — the write was NOT blocked in the browser',
  ).toBe(0);
});

// --- client-side validation drivers ------------------------------------------------------------

When('I clear the required inspection header fields', async ({ inspectionEditPage }) => {
  await inspectionEditPage.setSiteOperatorPresent('');
  await inspectionEditPage.clearInspectionDate();
  await inspectionEditPage.fillInspector('');
});

When('I set the inspection edit date to a future date', async ({ inspectionEditPage }) => {
  await inspectionEditPage.setInspectionDate(daysAhead(5));
});

When('I enter a malformed inspector on the inspection edit form', async ({ inspectionEditPage }) => {
  await inspectionEditPage.fillInspector(inspectorInvalidGuid);
});

When(
  'I flag follow-up required on the first edited question without its details',
  async ({ inspectionEditPage }) => {
    await inspectionEditPage.setQuestionFollowUpRequired(0, 'Yes');
  },
);

When('I clear the answer on the first edited question', async ({ inspectionEditPage }) => {
  await inspectionEditPage.clearQuestionAnswer(0);
});

When('I clear follow-up required on the first edited question', async ({ inspectionEditPage }) => {
  await inspectionEditPage.setQuestionFollowUpRequired(0, 'No');
});

Then(
  'the follow-up detail fields for the first edited question are disabled',
  async ({ inspectionEditPage }) => {
    await inspectionEditPage.expectFollowUpDetailsDisabled(0);
  },
);

/**
 * A minimal valid edit that leaves the record savable — used by the validation scenarios that then
 * break exactly ONE field, so the assertion isolates that field's rule instead of tripping over a
 * second unrelated error.
 */
When('I make the inspection edit otherwise valid', async ({ inspectionEditPage }) => {
  await inspectionEditPage.setSiteOperatorPresent('Yes');
  await inspectionEditPage.fillInspector(INSPECTOR_GUID);
  await inspectionEditPage.setInspectionDate(daysAgo(2));
  await inspectionEditPage.answerAllQuestions('Y');
});

Then('the inspection edit validation banner is shown', async ({ inspectionEditPage }) => {
  await inspectionEditPage.expectValidationBanner();
});

// --- not-found / server-rejection paths --------------------------------------------------------

When(
  'I open the edit form for a missing inspection on scale site {string}',
  async ({ inspectionEditPage, world }, scaleSiteIdNmbr) => {
    world.scaleSiteIdNmbr = scaleSiteIdNmbr;
    await inspectionEditPage.open(scaleSiteIdNmbr, inspectionMissingId);
  },
);

When(
  'I open the edit form with a malformed inspection id on scale site {string}',
  async ({ inspectionEditPage, world }, scaleSiteIdNmbr) => {
    world.scaleSiteIdNmbr = scaleSiteIdNmbr;
    await inspectionEditPage.open(scaleSiteIdNmbr, inspectionInvalidRouteId);
  },
);

Then('the inspection edit form shows a not-found message', async ({ inspectionEditPage }) => {
  await inspectionEditPage.expectNotFound();
});

Then(
  'the inspection edit form reports the id is not usable',
  async ({ inspectionEditPage }) => {
    await inspectionEditPage.expectInvalidRouteMessage();
  },
);

/**
 * Removes the record out-of-band while the actor still holds the form open — the realistic way to reach
 * the app's SERVER-rejection branch (bannerMode="api") through the UI, since every client-side rule
 * blocks its own case before the PUT. Confirmed by hand: PUT on a deleted id returns 404 NOT_FOUND.
 */
Given('the inspection is deleted in another session', async ({ deleteInspectionViaApi, world }) => {
  const id = req(world.inspectionId, 'inspectionId');
  const status = await deleteInspectionViaApi(id);
  expect([200, 204], `out-of-band delete of ${id} returned HTTP ${status}`).toContain(status);
});

Then('the inspection edit form reports the update failed', async ({ inspectionEditPage }) => {
  await inspectionEditPage.expectApiFailureBanner();
});
