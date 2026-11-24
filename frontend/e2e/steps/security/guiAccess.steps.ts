import { When, Then, expect } from '../fixtures';

import {
  expectedNavLinks,
  hiddenNavGroups,
  hiddenNavLinks,
  ownScalerLicenceNo,
  readableScalerTabs,
  withheldScalerTab,
} from '../../fixtures/security/industry-scaler-test-data';

/**
 * GUI level — what the application OFFERS this role: side-navigation entries, record tabs, and in-page
 * write controls.
 *
 * This level asserts the permission mirror in `permissions.ts` is doing its job: turning a call the API
 * would refuse into a control that was never rendered. It is a usability guarantee, not a security one
 * — the URL and API levels are what prove the role is actually contained. All three are needed: a
 * hidden button with an open endpoint is a security hole, and a gated endpoint behind a visible button
 * is a user walking into a 403.
 *
 * Visibility, not presence, is asserted throughout. Carbon renders modal contents (Save Record, Confirm
 * Delete) into the DOM while hidden, so a `toBeAttached`-style check would report write controls this
 * role is correctly never shown.
 */

When('I open the side navigation', async ({ roleSession }) => {
  await roleSession.visit('/welcome');
});

When('I open my own scaler record', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${ownScalerLicenceNo}`);
});

When('I open my own scaler record on the {string} tab', async ({ roleSession }, tab) => {
  await roleSession.visit(`/scalers/view/${ownScalerLicenceNo}?tab=${tab}`);
});

Then('the Queries menu should offer exactly the industry scaler screens', async ({ roleSession }) => {
  await roleSession.openNavGroup('Queries');
  for (const link of expectedNavLinks) {
    await expect(
      roleSession.navLink(link),
      `Queries should offer "${link}" — roles-permissions.md §3 grants it to IND`,
    ).toBeVisible();
  }
  for (const link of hiddenNavLinks) {
    await expect(
      roleSession.navLink(link),
      `Queries must NOT offer "${link}" — the IND column is "-" for it`,
    ).toBeHidden();
  }
});

Then('the {string} menu should not be offered', async ({ roleSession }, group) => {
  await expect(
    roleSession.navGroup(group),
    `the "${group}" menu must not render — every screen under it is "-" for the role under test`,
  ).toBeHidden();
});

Then('no restricted menu should be offered', async ({ roleSession }) => {
  for (const group of hiddenNavGroups) {
    await expect(
      roleSession.navGroup(group),
      `the "${group}" menu must not render — every screen under it is "-" for IND`,
    ).toBeHidden();
  }
});

Then('the {string} menu should be offered', async ({ roleSession }, group) => {
  await expect(roleSession.navGroup(group)).toBeVisible();
});

Then('the scaler record should offer every read-only tab', async ({ roleSession }) => {
  for (const tab of readableScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `the "${tab}" tab is "R (ltd)" for IND and must be readable`,
    ).toBeVisible();
  }
});

Then('the scaler record should not offer the Risk Rating tab', async ({ roleSession }) => {
  await expect(roleSession.tab(withheldScalerTab)).toBeHidden();
});

Then('the scaler record should offer the Risk Rating tab', async ({ roleSession }) => {
  await expect(roleSession.tab(withheldScalerTab)).toBeVisible();
});

Then('the {string} control should not be offered', async ({ roleSession }, control) => {
  await expect(
    roleSession.button(control),
    `"${control}" writes, and every write cell in the IND column is "-"`,
  ).toBeHidden();
});

Then('the {string} control should be offered', async ({ roleSession }, control) => {
  await expect(
    roleSession.button(control),
    `"${control}" must exist for an administrator — otherwise the industry scaler's deny assertion ` +
      `for the same control passes vacuously`,
  ).toBeVisible();
});
