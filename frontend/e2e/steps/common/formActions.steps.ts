import { When, expect } from '../fixtures';

/**
 * Cross-domain form-action button clicks. "Add Conditions" and "Save Record" are the same primary buttons
 * on the MSD and Scaler-Authorization create screens (and any future authorization create form that reuses
 * the two-step reveal), so they are generic clicks-by-role here rather than duplicated per domain. No
 * domain vocabulary — the button's accessible name is stable across these forms. The calling feature's own
 * assertions prove the right screen/effect; this step only performs the click.
 */

When('I click Add Conditions', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Conditions' }).click();
});

When('I click Save Record', async ({ page }) => {
  const save = page.getByRole('button', { name: 'Save Record' });
  await expect(save).toBeVisible();
  await save.click();
});
