import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Drives a reference-data maintenance screen far enough to judge its three write controls.
 *
 * These controls are the gap every role suite before this one deferred (CET CG-2, DSM/RSM CG-3 and
 * CG-4). They were left out because they are not reachable the way record-tab controls are:
 *
 *   Add    lives on the LIST page, gated by `MaintenanceListPage`'s `addPermission` prop.
 *   Edit   lives inside a ROW'S DETAIL MODAL, gated by `MaintenanceFormModal`'s `editPermission`.
 *   Delete lives in the same modal, gated by `deletePermission`.
 *
 * Both gates are **opt-in props**, not a shared wrapper — a page that simply forgets to pass one
 * renders the control ungated to everybody. That is exactly the class of defect this sweep exists to
 * catch, and no other suite is positioned to see it.
 *
 * TWO TRAPS, both of which produce a FALSE PASS rather than a failure:
 *
 * 1. **There are two `.form-actions` rows in the DOM.** The second belongs to the delete-confirmation
 *    modal and is mounted-but-hidden, carrying its own `cds--btn--danger` ("OK"). A locator that asks
 *    for a danger button finds it and reports Delete as offered to a role that is correctly never shown
 *    it. Both action controls are therefore matched on `.action-btn`, which only the real ones carry.
 *
 * 2. **Absence is meaningless unless the modal actually opened.** A row click that silently failed also
 *    yields "no Edit button". Every absence assertion is anchored on the modal's own heading first, so
 *    "not offered" means "the detail view is open and the control is not in it".
 */
export class MaintenancePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The list page's Add control. One per page; its label varies ("Add Signatory", "Add Template", …). */
  get addControl(): Locator {
    return this.page.locator('button.scs__list-add-btn');
  }

  /** The detail modal's Edit control — secondary kind, and an `action-btn` unlike the confirm modal's. */
  get editControl(): Locator {
    return this.page.locator('.form-actions button.action-btn.cds--btn--secondary');
  }

  /** The detail modal's Delete control. `.action-btn` is what excludes the confirm modal's OK — trap 1. */
  get deleteControl(): Locator {
    return this.page.locator('.form-actions button.action-btn.cds--btn--danger');
  }

  /** The detail modal's heading. Appears as soon as the modal opens — see `openFirstRecord` for why
   * that is NOT enough to judge a control by. */
  get detailHeading(): Locator {
    return this.page.locator('.cds--modal-header__heading').filter({ hasText: /Detail/i });
  }

  /** Carbon's `SkeletonText`, shown in place of the record while its detail request is in flight. */
  get detailSkeleton(): Locator {
    return this.page.locator('.cds--skeleton__text');
  }

  /**
   * Open a maintenance list and wait until it has actually rendered rows.
   *
   * `networkidle` is not enough on its own: it fires when the requests settle, which under parallel
   * load can be before React has painted the table — and a half-painted page has neither an Add button
   * nor a row, so BOTH an offered- and a withheld- judgement would be wrong. Waiting on a row is the
   * cheapest signal that the screen is ready to be judged.
   */
  async openList(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
    await expect(
      this.page.locator('table tbody tr').first(),
      `the maintenance list at ${path} never rendered a row, so its controls cannot be judged yet`,
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Open the first row's detail modal. Rows expose their id cell as a `button.scs__link`; the row
   * element itself is not clickable, which cost the first probe run a set of empty results.
   */
  async openFirstRecord(): Promise<void> {
    const firstRowLink = this.page.locator('table tbody tr').first().locator('button.scs__link').first();
    // Same generous timeout as the detail wait below, and for the same reason: the list is a real
    // query, and parallel workers against a small JDBC pool make it slow long before it makes it
    // broken. The message stays specific so a genuinely empty reference table is still diagnosable.
    await expect(
      firstRowLink,
      'the maintenance list rendered no rows, so no detail modal can be opened and any judgement ' +
        'about its controls would be vacuous — check the seeded data for this reference table',
    ).toBeVisible({ timeout: 30_000 });
    await firstRowLink.click();
    await expect(
      this.detailHeading,
      'the detail modal never opened, so "the control is not offered" would be true for the wrong ' +
        'reason (trap 2 in this page object)',
    ).toBeVisible();

    // The heading is NOT a sufficient anchor: `MaintenanceFormModal` renders the whole action row as
    // `{!detailLoading ? viewActions : null}`, so while the detail request is in flight the modal is
    // open and titled but carries NO Edit or Delete button. Judging a control then is wrong twice over
    // — the allow side flakes under load, and the deny side passes vacuously, which is worse because it
    // is silent. Waiting for the skeleton to clear is waiting for exactly that render condition.
    //
    // Generous timeout: this is a real detail fetch, and four parallel workers against a small JDBC
    // pool make it slow well before it makes it broken. Found by a full-domain run, where two pages
    // exceeded the default 10s (`defects.md` V4).
    await expect(
      this.detailSkeleton,
      'the record detail never finished loading, so the action row was never rendered and no ' +
        'judgement about its controls would mean anything',
    ).toHaveCount(0, { timeout: 30_000 });
  }

  /** Resolve a control by the name the feature file uses. */
  control(name: string): Locator {
    switch (name) {
      case 'Add':
        return this.addControl;
      case 'Edit':
        return this.editControl;
      case 'Delete':
        return this.deleteControl;
      default:
        throw new Error(`[sec] unknown maintenance control "${name}" — expected Add, Edit or Delete`);
    }
  }
}
