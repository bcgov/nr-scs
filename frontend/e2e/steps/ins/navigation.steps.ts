import { Given, When, Then, expect } from '../fixtures';

/**
 * Steps for the Site Inspection create NAVIGATION + workflow slices (UC-INS-001 S02/S03/S04/S10).
 * Reuses the create-screen / choose-type steps from create.steps.ts (global step registry).
 */

// ---- S04: inspections tab entry ----
Given(
  'I am viewing the inspections tab for scale site {string}',
  async ({ inspectionsTabPage }, scaleSiteIdNmbr) => {
    await inspectionsTabPage.open(scaleSiteIdNmbr);
  },
);

Then('the inspections list is empty', async ({ inspectionsTabPage }) => {
  await inspectionsTabPage.expectEmptyList();
});

Then('the Add Inspection button is available', async ({ inspectionsTabPage }) => {
  await inspectionsTabPage.expectAddInspectionVisible();
});

When('I click Add Inspection', async ({ inspectionsTabPage }) => {
  await inspectionsTabPage.clickAddInspection();
});

Then('the inspection create screen opens', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.expectStageOne();
});

// ---- S02: Back to the parameters step ----
When('I go back to the inspection parameters step', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.clickBack();
  await inspectionCreatePage.expectStageOne();
});

Then('the inspection parameters step is shown', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.expectStageOne();
});

Then('the inspection type is still {string}', async ({ inspectionCreatePage }, code) => {
  expect(await inspectionCreatePage.inspectionTypeValue()).toBe(code);
});

// ---- S03: Reset the details step ----
When('I change the inspection details', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.setSiteOperatorPresent('Yes');
  await inspectionCreatePage.setComments('scratch value to be reset');
});

When('I reset the inspection form', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.clickReset();
});

Then(
  'the inspection details are cleared to their initial state',
  async ({ inspectionCreatePage }) => {
    // create-init returns siteOperatorPresentInd=null and comments=null, so Reset restores both to blank.
    expect(await inspectionCreatePage.fieldValueById('site-operator-present')).toBe('');
    expect(await inspectionCreatePage.fieldValueById('inspection-comments')).toBe('');
  },
);

// ---- S10: Automated type forces Weight Scale only ----
When('I choose the {string} inspection type', async ({ inspectionCreatePage }, code) => {
  await inspectionCreatePage.selectInspectionType(code);
});

Then('the site type is forced to Weight Scale only', async ({ inspectionCreatePage }) => {
  await inspectionCreatePage.expectSiteTypeChecked('W');
  await inspectionCreatePage.expectSiteTypeDisabled('P');
  await inspectionCreatePage.expectSiteTypeDisabled('S');
});
