import { When, Then, expect } from '../fixtures';

/**
 * SEC-11 — the §J maintenance write-control sweep.
 *
 * Closes the gap three role suites deferred for want of a way to reach these controls: the CE
 * Technician's CG-2 (Questions create/update/delete withheld), and the scaling managers' CG-3 (the
 * withheld deletes) and CG-4 (`MAINTAIN_SIGNATORIES_CREATE` withheld — Edit offered, Add hidden, called
 * "the sharpest untested cell in this column").
 *
 * The role is a scenario parameter and the sign-in step is reused from `roleColumnAccess.steps.ts`, so
 * this file adds only navigation and the two judgements.
 *
 * Visibility, never presence — Carbon mounts modal contents into the DOM while hidden, so `toBeAttached`
 * or a text search reports write controls a read-only role is correctly never shown.
 */

When('I open the maintenance list {string}', async ({ maintenance }, path) => {
  await maintenance.openList(path);
});

When('I open the first record on the maintenance list {string}', async ({ maintenance }, path) => {
  await maintenance.openList(path);
  await maintenance.openFirstRecord();
});

// The page object has already waited for the screen to be judgeable (rows rendered, detail loaded), so
// a permission-gated control is decided synchronously by `PermissionGate` from here. The extended
// timeout is headroom for a slow paint under parallel load, not for another fetch.
const CONTROL_TIMEOUT = 20_000;

Then('the maintenance {string} control should be offered', async ({ maintenance }, control) => {
  await expect(
    maintenance.control(control),
    `roles-permissions.md §J grants this column the matching permission, so the ${control} control ` +
      `must be offered — a withheld control here means the page's opt-in permission prop is wrong or ` +
      `the column lost a cell`,
  ).toBeVisible({ timeout: CONTROL_TIMEOUT });
});

Then('the maintenance {string} control should not be offered', async ({ maintenance }, control) => {
  await expect(
    maintenance.control(control),
    `roles-permissions.md §J withholds the matching permission from this column, so the ${control} ` +
      `control must not be offered. If this fails, the page is missing its ${control.toLowerCase()}` +
      `Permission prop — the gates are opt-in, so an omitted prop renders the control to everyone`,
  ).toBeHidden();
});
