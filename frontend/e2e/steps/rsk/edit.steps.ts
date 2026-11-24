import { Given, When } from '../fixtures';
import { editAnswerChange } from '../../fixtures/rsk/rsk-test-data';

/**
 * Steps for the Scale Site Risk Assessment EDIT flow (UC-RSK-007 S03, and the seed used by S05/S07).
 * The assessment is SEEDED via the API so the test owns its record (parallel-safe) and cleans it up at
 * the DB. `world.riskAssessmentId` carries the seeded id to the open/change/read-back steps.
 */

Given(
  'a completed scale site risk assessment exists on site {string}',
  async ({ seedScaleSiteRiskAssessment, world }, scaleSiteIdNmbr) => {
    world.riskAssessmentId = await seedScaleSiteRiskAssessment(scaleSiteIdNmbr);
  },
);

Given('I am editing that risk assessment', async ({ scaleSiteRiskFormPage, world }) => {
  if (!world.riskAssessmentId) throw new Error('no seeded risk assessment id in world');
  await scaleSiteRiskFormPage.openEdit(world.riskAssessmentId);
  await scaleSiteRiskFormPage.expectEditActions();
});

When('I change the first risk answer to a different in-range option', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.answer(editAnswerChange.questionId, editAnswerChange.newAnswerId);
});
