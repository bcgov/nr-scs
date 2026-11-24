import { Given, Then, When, expect } from '../fixtures';
import { onCreate } from './checkScaleRoutes';

/**
 * CHK navigation + landing steps for the Summary Check Scale screens. Handles the mock-auth gotcha
 * (login then client-side nav) inside the page object.
 */

Given('I am on the Summary Check Scale create form', async ({ createPage }) => {
  await createPage.goto();
});

Given(
  'I am on the Summary Check Scale create form arrived from scaler {string} returning to {string}',
  async ({ createPage }, scalerName, backTo) => {
    await createPage.gotoWithBackContext(scalerName, backTo);
  },
);

When('I click Back', async ({ createPage }) => {
  await createPage.backButton.click();
});

Then('I should remain on the create form', async ({ page }) => {
  await expect(page).toHaveURL(onCreate);
});

Then('the Back button should be visible', async ({ createPage }) => {
  await expect(createPage.backButton).toBeVisible();
});

Then('the Back button should not be rendered', async ({ createPage }) => {
  await expect(createPage.backButton).toHaveCount(0);
});

Then('the Save Record button should be visible', async ({ createPage }) => {
  await expect(createPage.saveButton).toBeVisible();
});
