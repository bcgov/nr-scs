import { Given, When } from '../fixtures';
import { scalerInRangeAnswers } from '../../fixtures/rsk/scaler-risk-complete-test-data';

/**
 * Steps for driving the shared Scaler Risk Assessment FORM (create + edit surfaces): opening the create
 * screen, answering the questionnaire, entering comments, saving, and backing out. Reused across the
 * scaler create / edit / validation features. The entered comment is stashed in `world` so the read-back
 * verify steps can assert it.
 */

Given(
  'I am on the Scaler Risk Assessment create screen for scaler {string}',
  async ({ scalerRiskFormPage }, scalerLicenceNo) => {
    await scalerRiskFormPage.openCreate(scalerLicenceNo);
  },
);

When('I answer every scaler risk question with the in-range answer set', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.answerAll(scalerInRangeAnswers);
});

When('I enter scaler assessment comments {string}', async ({ scalerRiskFormPage, world }, comments) => {
  await scalerRiskFormPage.setComments(comments);
  world.expected = { ...(world.expected ?? {}), comments };
});

When('I save the scaler assessment', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.clickSave();
});

When('I go back from the scaler assessment form', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.clickBack();
});
