import { When, Then } from '../fixtures';

/**
 * Steps for the read-only VIEW surface (UC-RSK-007 S07). Opens a seeded assessment's view route and
 * asserts the display is entirely read-only with Back + Edit actions.
 */

When('I open that risk assessment in read-only view', async ({ scaleSiteRiskFormPage, world }) => {
  if (!world.riskAssessmentId) throw new Error('no seeded risk assessment id in world');
  await scaleSiteRiskFormPage.openView(world.riskAssessmentId);
});

Then('the assessment header shows scale site {string}', async ({ scaleSiteRiskFormPage }, scaleSiteIdNmbr) => {
  await scaleSiteRiskFormPage.expectHeaderSite(scaleSiteIdNmbr);
});

Then('the assessment questionnaire and comments are read-only', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.expectAllControlsReadOnly();
});

Then('the view offers Back and Edit actions', async ({ scaleSiteRiskFormPage }) => {
  await scaleSiteRiskFormPage.expectViewActions();
});
