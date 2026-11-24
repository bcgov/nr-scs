import { Given, When } from '../../../fixtures';
import { markQuestionUsedViaDb } from './questionDbSeed';
import { ABSENT_QUESTION_ID } from '../../../../fixtures/admin/maintenance/ccq-test-data';

/**
 * CCQ navigation + seeding steps for the Maintain Inspection Question screen (single route,
 * list + Modal). Handles the mock-auth gotcha (login then client-side nav) inside the page object.
 */

Given('I am on the Questions list', async ({ questionsPage }) => {
  await questionsPage.goto();
});

Given('a disposable inspection question exists', async ({ seedQuestion, world }) => {
  const { id, body } = await seedQuestion('fixture');
  world.questionId = id;
  world.questionBody = body;
  world.originalQuestionBody = { ...body }; // immutable snapshot for "only X changed" comparisons
});

Given('the question has been used in an inspection', async ({ world, createdQuestionIds }) => {
  if (!world.questionId || !world.questionBody) {
    throw new Error('[step] "the question has been used" requires a prior "a disposable inspection question exists"');
  }
  const answerCode = world.questionBody.validResponseCodes[0];
  markQuestionUsedViaDb(world.questionId, answerCode);
  const entry = createdQuestionIds.find((e) => e.id === world.questionId);
  if (entry) entry.usedAnswerCode = answerCode; // cleanup unmarks before deleting
});

When('I open the create form', async ({ questionsPage }) => {
  await questionsPage.openCreate();
});

When('I open the question for view', async ({ questionsPage, world }) => {
  if (!world.questionId) throw new Error('[step] no question id in world — seed one first');
  await questionsPage.openView(world.questionId);
});

When('I open the edit form', async ({ questionsPage }) => {
  await questionsPage.openEdit();
});

// UC-CCQ-002 S07 (question record not found on view load). The new app is a single route with an in-page
// modal, so there is NO direct /questions/{id} URL a user can mistype — the list only ever links real
// ids. The rule still lives server-side, so the slice is covered where it is actually reachable: the
// detail endpoint the view modal calls. See this UC's coverage.md for the UI half's disposition.
When('I request the inspection question detail for an id that does not exist', async ({ request, world }) => {
  const res = await request.get(`/api/inspection-questions/${ABSENT_QUESTION_ID}`);
  const body = res.status() === 404 ? ((await res.json()) as { code?: string }) : undefined;
  world.questionDetailResponse = { status: res.status(), code: body?.code };
});
