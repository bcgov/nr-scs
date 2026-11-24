import { Given, When } from '../fixtures';
import { inRangeAnswers } from '../../fixtures/rsk/rsk-test-data';

/**
 * Steps for driving the shared Scale Site Risk Assessment FORM (create + edit surfaces): opening the
 * create screen, answering the questionnaire, entering comments, saving, and backing out. Reused across
 * the create / edit / validation features. The entered comment is stashed in `world` so the read-back
 * verify steps can assert it.
 */

Given(
  'I am on the Scale Site Risk Assessment create screen for scale site {string}',
  async ({ scaleSiteRiskFormPage }, scaleSiteIdNmbr) => {
    await scaleSiteRiskFormPage.openCreate(scaleSiteIdNmbr);
  },
);

When('I answer every risk question with the in-range answer set', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.answerAll(inRangeAnswers);
});

When('I enter assessment comments {string}', async ({ scaleSiteRiskFormPage, world }, comments) => {
  await scaleSiteRiskFormPage.setComments(comments);
  world.expected = { ...(world.expected ?? {}), comments };
});

When('I save the assessment', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.clickSave();
});

When('I go back from the assessment form', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.clickBack();
});
