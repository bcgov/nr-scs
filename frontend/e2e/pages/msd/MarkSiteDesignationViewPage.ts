import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the new Mark Site Designation read-only VIEW screen
 * (route /mark-site-designations/view?haulingMarkAuthorizationId={id}, backed by
 * GET /api/mark-site-designations/{id}). All DOM selectors for the MSD view live here; steps call these
 * methods. The screen renders header fields (read-only Carbon TextInput/TextArea with stable ids),
 * three tables (Scale Sites / Species Content / Conditions via the shared TableResource), and three
 * action buttons (Edit Record, Delete, and a Create Letter / View Letter toggle keyed on letterExists).
 *
 * Read-only: opening a record never mutates it, so view tests need no cleanup and are parallel-safe by
 * construction. The one concurrency hazard is the FILED `letterExists` false-positive bug (see
 * features/mark-site-designation/uc-msd-002-update/defects.md Bug #1): the same GET the edit page uses can, under load,
 * return letterExists=true for a letterless record. That would flip this screen's letter button from
 * "Create Letter" to "View Letter". `reopenUntilLetterState()` hardens the letter-button assertions
 * around that known bug (fresh-login reopen until the expected state renders) WITHOUT masking it — the
 * bug keeps its standalone red repro in the MSD suite; this only stops it flaking an unrelated view assert.
 */

/** Header display fields → stable Carbon id (all rendered readOnly). */
export const VIEW_FIELD_ID = {
  msdNumber: '#msd-number',
  timberMark: '#timber-mark',
  markHolderClientLoc: '#mark-holder-client-loc',
  markHolderName: '#mark-holder-name',
  markStatus: '#mark-status',
  population: '#population',
  effectiveDate: '#effective-date',
  expiryDate: '#expiry-date',
  estVolume: '#estimated-volume',
  estTruckLoads: '#estimated-truck-loads',
  geographicLocation: '#geographic-location',
  timberDescription: '#timber-description',
  transportationDateDesc: '#transportation-date-desc',
  otherRequirements: '#other-requirements',
} as const;

export class MarkSiteDesignationViewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly errorBanner: Locator;
  readonly msdNumber: Locator;
  readonly editRecordButton: Locator;
  readonly deleteButton: Locator;
  readonly createLetterButton: Locator;
  readonly viewLetterButton: Locator;
  readonly scaleSitesTable: Locator;
  readonly speciesTable: Locator;
  readonly conditionsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Mark Site Designation', exact: true });
    this.errorBanner = page.locator('.cds--inline-notification--error');
    this.msdNumber = page.locator(VIEW_FIELD_ID.msdNumber);
    this.editRecordButton = page.getByRole('button', { name: 'Edit Record' });
    // Carbon `danger` buttons expose a "danger "-prefixed accessible name, so an exact "Delete" match
    // misses (documented Carbon quirk). Substring match is unambiguous here — only one Delete button.
    this.deleteButton = page.getByRole('button', { name: 'Delete' });
    this.createLetterButton = page.getByRole('button', { name: 'Create Letter' });
    this.viewLetterButton = page.getByRole('button', { name: 'View Letter' });
    // Scope each table by a column header unique to it, so cell lookups can't cross-match another table
    // (mirrors pages/chk/CheckScaleViewPage.ts). Three tables share the page.
    this.scaleSitesTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Site #', exact: true }) });
    this.speciesTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Species', exact: true }) });
    this.conditionsTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Condition #', exact: true }) });
  }

  /** Log in (mock IDIR) then client-side navigate to the view route so the in-memory session survives. */
  async goto(authorizationId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(authorizationId)}`,
    );
  }

  /** Wait web-first for the read-only record to have loaded (the MSD # field is present). */
  async waitReady(): Promise<void> {
    await expect(this.msdNumber).toBeVisible();
  }

  /**
   * Click Delete and ACCEPT the browser confirm (`window.confirm`). Returns the confirm's message text so
   * the caller can assert it (legacy CNF-001 "Are you sure you want to delete this record?"). Accepting
   * triggers the app's `POST …/{id}/workbench/remove` then navigation to /welcome (a soft workbench-remove
   * — NOT a hard delete; see uc-msd-004-delete/defects.md Divergence #1). Mirrors CheckScaleViewPage.
   */
  async confirmDelete(): Promise<string | undefined> {
    let message: string | undefined;
    this.page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.accept();
    });
    await this.deleteButton.click();
    return message;
  }

  /**
   * Click Delete and DISMISS (cancel) the confirm — the app then does nothing (no workbench-remove POST,
   * stays on the view). Returns the confirm's message text for assertion.
   */
  async cancelDelete(): Promise<string | undefined> {
    let message: string | undefined;
    this.page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.dismiss();
    });
    await this.deleteButton.click();
    return message;
  }

  /** Click "Edit Record" → navigates to /mark-site-designations/edit/{id} (edit screen). */
  async clickEditRecord(): Promise<void> {
    await this.editRecordButton.click();
  }

  /** Click "Create Letter" (letterless record) → navigates to /mark-site-designations/{id}/letter. */
  async clickCreateLetter(): Promise<void> {
    await this.createLetterButton.click();
  }

  /**
   * Click "View Letter" (letter-issued record) and capture the PDF the browser downloads. Unlike "Create
   * Letter", this issues NO navigation — it does `GET /{id}/letter` and streams the stored letter back
   * through `useReportDownload` (see View/MarkSiteDesignation/index.tsx handleLetterClick). Arm the download
   * BEFORE the click. Returns the suggested filename + on-disk path so the caller can assert real PDF bytes.
   */
  async downloadExistingLetter(): Promise<{ filename: string; path?: string }> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await this.viewLetterButton.click();
    const download = await downloadPromise;
    const failure = await download.failure();
    expect(failure, `the letter download failed: ${failure}`).toBeNull();
    return { filename: download.suggestedFilename(), path: (await download.path()) ?? undefined };
  }

  /** Assert the Scale Sites table has no data rows (the `showEmptyTableWhenNoResults` empty-table state). */
  async expectScaleSitesEmpty(): Promise<void> {
    await expect(this.scaleSitesTable.getByRole('cell')).toHaveCount(0);
  }

  /** Assert the Species Content table has no data rows. */
  async expectSpeciesEmpty(): Promise<void> {
    await expect(this.speciesTable.getByRole('cell')).toHaveCount(0);
  }

  /** Assert a read-only header field shows the expected value (Carbon renders readOnly `<input value>`). */
  async expectFieldValue(field: keyof typeof VIEW_FIELD_ID, value: string): Promise<void> {
    await expect(this.page.locator(VIEW_FIELD_ID[field])).toHaveValue(value);
  }

  /** A cell in the Scale Sites table (scoped so it can't match the other two tables). */
  scaleSiteCell(text: string): Locator {
    return this.scaleSitesTable.getByRole('cell', { name: text, exact: true });
  }

  /**
   * A Site # rendered as a hyperlink to its scale-site record — legacy S04 parity, and now **expected to
   * be present**.
   *
   * (Superseded comment: this used to say the app rendered plain text and the link "should be absent
   * (Divergence #2)". That divergence was closed when the cell became a `ScaleSiteLink`, and the step
   * asserting it was inverted to require the link — but this docstring was left describing the old
   * behaviour, which is the opposite of what the suite now checks.)
   *
   * Because `ScaleSiteLink` wraps `PermissionLink`, the cell is a link only for a role holding
   * `SCALE_SITE_READ` and plain text without it. Every enabled role holding `MSD_READ` also holds
   * `SCALE_SITE_READ`, so the plain-text half is currently unreachable — see Coverage gap #5.
   */
  scaleSiteLink(text: string): Locator {
    return this.scaleSitesTable.getByRole('link', { name: text, exact: true });
  }

  speciesCell(text: string): Locator {
    return this.speciesTable.getByRole('cell', { name: text, exact: true });
  }

  conditionCell(text: string): Locator {
    return this.conditionsTable.getByRole('cell', { name: text, exact: true });
  }

  /**
   * The Conditions table row for a given Condition # — used to scope the Title/Mandatory? asserts to ONE
   * row (several conditions share Mandatory? = "Yes", so a bare "Yes" cell is ambiguous across rows).
   */
  conditionRow(conditionNumber: string): Locator {
    return this.conditionsTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: conditionNumber, exact: true }) });
  }

  /**
   * Open a record and, if the letter button doesn't match the expected letter state, reopen with a FRESH
   * login until it does (capped). Works around the filed `letterExists` concurrency false-positive
   * (UC-MSD-002 defects.md Bug #1) so the letter-button assertions don't flake under --repeat-each; it
   * never masks the bug (that stays red-repro'd in the MSD suite). `expected='create'` wants "Create
   * Letter" (letterless); `expected='view'` wants "View Letter" (letter issued).
   */
  async reopenUntilLetterState(authorizationId: string, expected: 'create' | 'view'): Promise<void> {
    const wanted = expected === 'create' ? this.createLetterButton : this.viewLetterButton;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      // A fresh /welcome login (loginAsMockScsUser does page.goto) drops keep-alive connections, so the
      // next request typically lands on a different backend pool connection — the spurious lock is sticky
      // per pooled connection, so this breaks its affinity and a later load renders the true state.
      await this.goto(authorizationId);
      await this.waitReady();
      if (await wanted.isVisible()) return;
    }
    throw new Error(
      `[bug-workaround] MSD ${authorizationId} never rendered the "${expected === 'create' ? 'Create' : 'View'} Letter" ` +
        `button after 8 loads — the letterExists concurrency bug (uc-msd-002 defects.md Bug #1) has regressed; investigate.`,
    );
  }
}
