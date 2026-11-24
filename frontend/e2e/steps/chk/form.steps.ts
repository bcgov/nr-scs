import { type SummaryCheckScaleCreateData, summaryCheckScaleHappyPath } from '../../fixtures/chk/chk-test-data';
import { When } from '../fixtures';

/**
 * CHK form-entry steps for the Summary Check Scale create form. All DOM access is delegated to the
 * page object; the pinned happy-path fixture supplies known-good values so "a valid …" is always
 * DB/validator-grounded, never fabricated.
 */
const HAPPY = summaryCheckScaleHappyPath;

When('I select the {string} return type', async ({ createPage }, label) => {
  await createPage.setReturnType(label as SummaryCheckScaleCreateData['returnType']);
});

When('I enter a valid Summary Check Scale header', async ({ createPage }) => {
  await createPage.fillHeader(HAPPY);
});

When('I enter a valid SPG row', async ({ createPage }) => {
  await createPage.fillSpgRow(HAPPY);
});

When('I select species {string}', async ({ createPage }, code) => {
  await createPage.selectField('Species', code);
});

When('I clear the species', async ({ createPage }) => {
  await createPage.selectField('Species', '');
});

When('I clear all SPG numeric fields', async ({ createPage }) => {
  await createPage.clearSpgNumericFields();
});

When('I set the {string} field to {string}', async ({ createPage }, label, value) => {
  await createPage.fillField(label, value);
});

When('I save the record', async ({ createPage }) => {
  await createPage.save();
});
