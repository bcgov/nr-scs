import { When, Then } from '../fixtures';
import { scalerHappyPath } from '../../fixtures/rsk/scaler-risk-complete-test-data';

/**
 * Steps for the read-only VIEW surface of a scaler risk assessment. Opens a seeded assessment's view
 * route and asserts the display is entirely read-only with Back + Edit actions. The scaler UC-RSK-006
 * Gherkin deliberately excluded the read-only display (it is a sibling read-only-role UC), but the new
 * app's shared form DOES render a scaler view surface (`/scaler-risk-assessments/view/:id`), so it is
 * covered here for symmetry with the scale-site view (see coverage.md — logged as a spec gap).
 *
 * Also home to the record-tombstone header assertion, which is shared by the create surface (create-init
 * populates the same header) — the shared form renders client / region / district from scalerConfig.
 */

When('I open that scaler risk assessment in read-only view', async ({ scalerRiskFormPage, world }) => {
  if (!world.riskAssessmentId) throw new Error('no seeded scaler risk assessment id in world');
  await scalerRiskFormPage.openView(world.riskAssessmentId);
});

Then('the scaler assessment header shows scaler {string}', async ({ scalerRiskFormPage }, scalerLicenceNo) => {
  await scalerRiskFormPage.expectHeaderScaler(scalerLicenceNo);
});

// Verifies the other 3 header tombstone fields the shared form renders (client / region / district) —
// pinned in scalerHappyPath and asserted on both the create-init and read-only-view surfaces. Only valid
// for the happy-path scaler (019D), whose header values the fixture pins. The client name is the ONE
// value the two surfaces compose in different places (see the fixture's note), so asserting the same
// pinned string on both is what keeps create-init honest about the "LAST, FIRST" shape.
Then(
  'the scaler record header shows the pinned client, region and district',
  async ({ scalerRiskFormPage }) => {
    await scalerRiskFormPage.expectScalerRecordHeader({
      clientName: scalerHappyPath.clientName,
      regionName: scalerHappyPath.regionName,
      districtName: scalerHappyPath.districtName,
    });
  },
);

Then('the scaler assessment questionnaire and comments are read-only', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.expectAllControlsReadOnly();
});

Then('the scaler view offers Back and Edit actions', async ({ scalerRiskFormPage }) => {
  await scalerRiskFormPage.expectViewActions();
});
