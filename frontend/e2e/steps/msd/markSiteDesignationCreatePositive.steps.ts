import { When, Then, expect } from '../fixtures';
import { creatableMarkHolder } from '../../fixtures/msd/msd-test-data';

/**
 * UC-MSD-001 — positive SECTION flows on the create screen (the counterparts to the existing negative
 * guards in markSiteDesignation.steps.ts): the successful timber-mark holder lookup, and the
 * add/list/remove/de-dup behaviour of the Species and Scale Sites sections. All are CLIENT-side (no POST
 * until Save, which these never click) → no seed, no cleanup, parallel-safe. DOM lives in
 * pages/msd/MarkSiteDesignationCreatePage. The "no create request" prove-the-negative is reused from the
 * create steps (createMsdCalls === 0). "I look up timber mark" / "I add scale site" / "I fill valid mark
 * site basics …" / "I click Add Conditions" are reused from markSiteDesignation.steps.ts.
 */

Then('the mark-holder fields are populated for the creatable mark', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.expectHolderPopulated(creatableMarkHolder.name, creatableMarkHolder.status);
});

When('I add valid species {string} at {string}', async ({ markSiteDesignationCreatePage }, code, percent) => {
  await markSiteDesignationCreatePage.addValidSpecies(code, percent);
});

Then('the species table lists {string}', async ({ markSiteDesignationCreatePage }, label) => {
  await expect(markSiteDesignationCreatePage.speciesRow(label)).toBeVisible();
});

When('I remove the species row {string}', async ({ markSiteDesignationCreatePage }, label) => {
  await markSiteDesignationCreatePage.removeSpeciesRow(label);
});

Then('the species table no longer lists {string}', async ({ markSiteDesignationCreatePage }, label) => {
  await expect(markSiteDesignationCreatePage.speciesRow(label)).toHaveCount(0);
});

Then('the scale sites table lists site {string}', async ({ markSiteDesignationCreatePage }, id) => {
  await expect(markSiteDesignationCreatePage.scaleSiteRow(id)).toBeVisible();
});

// De-dup: re-adding an already-listed site must NOT produce a second row. Wait for the add's lookup to
// resolve first (so the append logic has run) before asserting the row is still present exactly once.
When('I add scale site {string} a second time', async ({ markSiteDesignationCreatePage }, id) => {
  await markSiteDesignationCreatePage.addScaleSiteAwaitingSearch(id);
});

Then('the scale sites table lists site {string} exactly once', async ({ markSiteDesignationCreatePage }, id) => {
  await expect(markSiteDesignationCreatePage.scaleSiteRow(id)).toHaveCount(1);
});

When('I remove scale site {string}', async ({ markSiteDesignationCreatePage }, id) => {
  await markSiteDesignationCreatePage.removeScaleSite(id);
});

Then('the scale sites table no longer lists site {string}', async ({ markSiteDesignationCreatePage }, id) => {
  await expect(markSiteDesignationCreatePage.scaleSiteRow(id)).toHaveCount(0);
});

// --- shared AuthorizationConditionsSection positive flow (covered once, on the MSD create host) --------
// This closes the "positive conditions" items deferred across UC-MSD-001 CG#3 and UC-MSD-002 CG#1/#3 —
// the identical component is embedded in MSD create/edit AND Scaler/Scale-Site authorizations.

When('I open the conditions section', async ({ markSiteDesignationCreatePage }) => {
  await markSiteDesignationCreatePage.openConditionsSection();
});

Then('the conditions table lists condition titled {string}', async ({ markSiteDesignationCreatePage }, title) => {
  await expect(markSiteDesignationCreatePage.conditionRowByTitle(title)).toBeVisible();
});

Then('the conditions table no longer lists condition titled {string}', async ({ markSiteDesignationCreatePage }, title) => {
  await expect(markSiteDesignationCreatePage.conditionRowByTitle(title)).toHaveCount(0);
});

Then('the remove button for condition {string} is disabled', async ({ markSiteDesignationCreatePage }, id) => {
  await expect(markSiteDesignationCreatePage.removeConditionButton(id)).toBeDisabled();
});

When('I remove the condition titled {string}', async ({ markSiteDesignationCreatePage }, title) => {
  await markSiteDesignationCreatePage.removeConditionByTitle(title);
});

Then('I should see the conditions error {string}', async ({ markSiteDesignationCreatePage }, message) => {
  await expect(markSiteDesignationCreatePage.page.getByText(message, { exact: true })).toBeVisible();
});

When('I apply the condition template {string}', async ({ markSiteDesignationCreatePage }, code) => {
  await markSiteDesignationCreatePage.applyTemplate(code);
});

When('I add condition {string} from the condition search', async ({ markSiteDesignationCreatePage }, id) => {
  await markSiteDesignationCreatePage.addConditionFromSearch(id);
});
