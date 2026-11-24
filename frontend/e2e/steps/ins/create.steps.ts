import { Given, When, Then, expect } from '../fixtures';
import { inspectionHappyPath } from '../../fixtures/ins/ins-test-data';
import { daysAgo } from '../../fixtures/common/dates';

/**
 * Steps for the Site Inspection CREATE flow (UC-INS-001). Selectors live in the page object; concrete
 * inputs come from the DB-pinned happy-path fixture. Shared with the navigation + validation step files
 * (the "on the create screen" / "choose inspection type" / "save" phrases are reused, not duplicated).
 */

Given(
  'I am on the site inspection create screen for scale site {string}',
  async ({ inspectionCreatePage }, scaleSiteIdNmbr) => {
    await inspectionCreatePage.open(scaleSiteIdNmbr);
  },
);

// Advances Stage 1 -> Stage 2 (choose the inspection type + one site type, then Next). Codes are the
// real LOV codes (MIN=Minor, W=Weight Scale, AUT=Automated).
When(
  'I choose inspection type {string} and site type {string}',
  async ({ inspectionCreatePage }, inspectionTypeCode, siteTypeCode) => {
    await inspectionCreatePage.completeStageOne(inspectionTypeCode, [siteTypeCode]);
  },
);

When('I fill a valid inspection and answer every question', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.fillValidStageTwo({
    inspectorGuid: inspectionHappyPath.inspectorGuid,
    siteOperatorPresent: inspectionHappyPath.siteOperatorPresent,
    inspectionDate: daysAgo(1),
    answerCode: inspectionHappyPath.answerCode,
    comments: inspectionHappyPath.comments,
  });
});

When('I save the inspection', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.clickSave();
});

Then(
  'the inspection is created and its view screen opens',
  async ({ inspectionCreatePage, world, createdInspectionIds }) => {
    const id = await inspectionCreatePage.waitForCreatedInspectionId(
      inspectionHappyPath.site.scaleSiteIdNmbr,
    );
    world.inspectionId = id;
    createdInspectionIds.push(id); // register for teardown the moment the id is known
  },
);

Then(
  'the created inspection reads back with my details and answered questions',
  async ({ request, world }) => {
    const id = world.inspectionId;
    expect(id, 'no created inspection id captured').toBeTruthy();

    const res = await request.get(`/api/scale-sites/inspection/${id}`);
    expect(res.ok(), `read-back GET failed: HTTP ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      scaleSiteIdNmbr?: string;
      inspectionTypeCode?: string;
      siteOperatorPresentInd?: string;
      inspector?: string;
      comments?: string;
      questionResponses?: { inspectionAnswerCode?: string; followUpRequiredInd?: string }[];
    };

    expect(body.scaleSiteIdNmbr).toBe(inspectionHappyPath.site.scaleSiteIdNmbr);
    expect(body.inspectionTypeCode).toBe(inspectionHappyPath.inspectionType.code);
    expect(body.siteOperatorPresentInd).toBe('Y');
    expect(body.inspector).toBe(inspectionHappyPath.inspectorGuid);
    expect(body.comments).toBe(inspectionHappyPath.comments);

    const responses = body.questionResponses ?? [];
    expect(responses.length, 'no question responses persisted').toBeGreaterThan(0);
    for (const row of responses) {
      expect(row.inspectionAnswerCode).toBe(inspectionHappyPath.answerCode);
      expect(row.followUpRequiredInd).toBe('N');
    }
  },
);
