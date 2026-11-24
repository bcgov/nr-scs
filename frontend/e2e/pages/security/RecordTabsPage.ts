import { type Locator, type Page, expect } from '@playwright/test';
import type { ControlRow, ControlVerdict } from '../../fixtures/security/role-columns';

/**
 * Driving an entity record's tab strip and reading which in-page controls a role is offered.
 *
 * Extracted from the check-scaler suite so the tab-settle wait exists once. Two suites with private
 * copies of a timing helper is how one gets fixed and the other keeps the bug — and this particular
 * wait fails in the dangerous direction (see `activateTab`).
 */
export class RecordTabsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  tab(name: string): Locator {
    return this.page.getByRole('tab', { name, exact: true });
  }

  button(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /**
   * Activate a tab and wait until its panel has actually settled.
   *
   * The wait is the whole point. A control read before the panel's data arrives reports "hidden" for a
   * control that renders a moment later — a false negative in the dangerous direction, because it would
   * report a LEAKED write control as correctly withheld. That is why every deny sweep is paired with an
   * administrator running the identical loop: if the settle ends early, the contrast reddens instead of
   * the deny passing quietly and wrongly.
   *
   * State-based, not timed: every tab wraps its body in `.scs__tab-view__panel` and renders Carbon
   * `SkeletonText` while its query is pending, so "wrapper attached, skeletons drained" is the resolved
   * signal itself rather than an approximation of it.
   *
   * **No trailing `networkidle` wait, deliberately** (removed 2026-09-04). It used to follow the
   * skeleton drain, and it was redundant twice over: the drain is already the state-based signal, and
   * the record views these sweeps walk fire enough background queries that idle is not a state they
   * reliably reach. A sweep clicks several tabs inside one 60-second test, so every redundant wait is
   * charged against the budget the real signal needs — which is how a full-suite run produced timeouts
   * here while the same scenarios passed in isolation. The skeleton budget went 15s → 30s with the time
   * that freed up. Both changes only ever make the wait for the REAL signal longer, so the guarantee in
   * the paragraph above is strengthened, not relaxed.
   */
  async activateTab(tab: string): Promise<void> {
    const locator = this.tab(tab);
    await expect(locator, `the "${tab}" tab must render before its controls can be judged`).toBeVisible({
      timeout: 30_000,
    });
    await locator.click();
    await expect(locator, `the "${tab}" tab must become the selected tab`).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 15_000 },
    );

    await waitForActivePanelSettled(this.page, `the "${tab}" panel`);
  }
}

/**
 * Wait until the record view's SELECTED tab panel has settled: its body mounted and its skeletons drained.
 *
 * Shared by `RecordTabsPage.activateTab` and `WhoDidItPage.settledTriggerCount` so the settle wait exists
 * once (see the class note above). State-based: every tab wraps its body in `.scs__tab-view__panel` and
 * renders Carbon `SkeletonText` while its query is pending. `what` names the panel in failure messages.
 */
export async function waitForActivePanelSettled(page: Page, what: string): Promise<void> {
  // Carbon marks the unselected panels `hidden` (`Tabs.js`: `hidden: selectedIndex !== index`).
  const panel = page.locator('[role="tabpanel"]:not([hidden])');
  // `.first()` because a tab may nest the wrapper (Contacts renders one in ContactsTab and another in
  // ContactsView); any match means the body mounted, and a multi-match would be a strict-mode violation.
  await expect(
    panel.locator('.scs__tab-view__panel').first(),
    `${what} body must render before its controls can be judged`,
  ).toBeAttached({ timeout: 15_000 });
  await expect(
    panel.locator('[class*="cds--skeleton"]'),
    `${what} must finish loading — a control read over a skeleton reads as hidden, which ` +
      `would report a leaked control as correctly withheld. If this timed out under a ` +
      `full-suite run rather than in isolation, it is contention for the one local backend, not a ` +
      `finding: the tab's queries simply had not returned yet`,
  ).toHaveCount(0, { timeout: 30_000 });
}

/**
 * Walk a set of {record, tab, control} rows and record whether each control is visible.
 *
 * Grouped by record so each record page loads ONCE and the tabs are then clicked, rather than a full SPA
 * boot per control — a timeout in a permission test is indistinguishable from a finding, so the cost
 * matters.
 *
 * `visit` is injected rather than taken from the page object because the caller drives navigation through
 * its own role session (which carries the seeded mock identity).
 */
export async function collectControlVerdicts(
  tabs: RecordTabsPage,
  visit: (path: string) => Promise<void>,
  rows: readonly ControlRow[],
  anchors: { scalerPath: string; sitePath: string },
): Promise<ControlVerdict[]> {
  const verdicts: ControlVerdict[] = [];

  for (const record of ['scaler', 'site']) {
    const forRecord = rows.filter((r) => r.record === record);
    if (!forRecord.length) continue;

    await visit(record === 'scaler' ? anchors.scalerPath : anchors.sitePath);

    for (const tab of [...new Set(forRecord.map((r) => r.tab))]) {
      await tabs.activateTab(tab);
      for (const row of forRecord.filter((r) => r.tab === tab)) {
        verdicts.push({ ...row, visible: await tabs.button(row.control).isVisible() });
      }
    }
  }

  return verdicts;
}
