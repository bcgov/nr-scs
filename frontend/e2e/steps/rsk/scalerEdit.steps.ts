import { Given, When } from '../fixtures';
import { scalerEditAnswerChange } from '../../fixtures/rsk/scaler-risk-complete-test-data';

/**
 * Steps for the Scaler Risk Assessment EDIT flow (UC-RSK-006 S05, and the seed used by S05-clear/view).
 * The assessment is SEEDED via the API so the test owns its record (parallel-safe) and cleans it up at
 * the DB. `world.riskAssessmentId` carries the seeded id to the open/change/read-back steps.
 */

Given(
  'a completed scaler risk assessment exists for scaler {string}',
  async ({ seedScalerRiskAssessment, world }, scalerLicenceNo) => {
    world.riskAssessmentId = await seedScalerRiskAssessment(scalerLicenceNo);
  },
);

Given('I am editing that scaler risk assessment', async ({ scalerRiskFormPage, world }) => {
  if (!world.riskAssessmentId) throw new Error('no seeded scaler risk assessment id in world');
  await scalerRiskFormPage.openEdit(world.riskAssessmentId);
  await scalerRiskFormPage.expectEditActions();
});

When('I change a scaler risk answer to a different in-range option', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.answer(scalerEditAnswerChange.questionId, scalerEditAnswerChange.newAnswerId);
});
