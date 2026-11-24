import { type Locator, type Page, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the MSD Letter Options screen (UC-RPT-009 — "Generate Timber Mark Site Designation
 * Letter"). Route `/mark-site-designations/{letterId}/letter`
 * (pages/Letters/MarkSiteDesignationLetter → shared LetterOptionsPage/ReportPage). Reached from the MSD
 * view's "Create Letter" button (letterless record).
 *
 * SCOPE: this page object drives the screen's CLIENT-SIDE validation (the email/preview rules
 * `ReportPage.handleSend` runs BEFORE the generate request) AND — since 2026-09-10 — real letter
 * GENERATION (`generateAndDownload`).
 *
 * ⚠️ GENERATION MUTATES THE RECORD — ONLY DRIVE IT AGAINST A DISPOSABLE, SEEDED MSD. Unlike a report,
 * issuing a letter is a **WRITE**: `POST /{id}/letter` inserts into `HAULING_MARK_AUTH_LETTER` and flips the
 * record's `letterExists`, permanently turning the MSD view's "Create Letter" button into "View Letter".
 * Doing that to the shared `richViewMsdId` anchor broke three UC-MSD-003 scenarios until the row was deleted
 * (defects.md Coverage gap #0). The `generation.feature` suite therefore seeds its own MSD via
 * `seedMarkSiteDesignation` (whose DB teardown deletes the `hauling_mark_auth_letter` child row) and never
 * touches a shared anchor. The Jasper blocker that once made this un-runnable closed 2026-08-11.
 */
export class MarkSiteDesignationLetterPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly previewNoRadioLabel: Locator;
  readonly sendButton: Locator;
  readonly emailError: Locator;
  readonly regDistSelect: Locator;
  readonly signatureBlockSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Mark Site Designation Letter Options' });
    this.emailInput = page.locator('#email-recipient');
    // Carbon RadioButton visually hides the <input>; click its label (label[for="preview-no"]) instead.
    this.previewNoRadioLabel = page.locator('label[for="preview-no"]');
    this.sendButton = page.getByRole('button', { name: 'Send / View Report' });
    this.emailError = page.locator('.report-output-email-error');
    // "Org. Unit Signature Block" reg/dist select — RegDistSelect's default id, its option value is the
    // orgUnitCode (e.g. "DCC"); "Select Letter Signature" is the block picker the reg/dist choice populates.
    this.regDistSelect = page.locator('#reg-dist');
    this.signatureBlockSelect = page.locator('#signature-blocks-select');
  }

  /** Log in (mock IDIR) then client-side navigate to the letter options for a given MSD id. */
  async open(letterId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/mark-site-designations/${encodeURIComponent(letterId)}/letter`);
    await expect(this.heading).toBeVisible({ timeout: 30000 });
  }

  async setEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
  }

  async setPreviewNo(): Promise<void> {
    await this.previewNoRadioLabel.click();
  }

  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  /**
   * Choose the Reg / Dist whose signature block signs the letter, wait for its block list to reload, then
   * SELECT the seeded block by id. Selecting a reg/dist fires `searchLetterSignatureBlocks(orgUnitNo)` and the form
   * repopulates the "Select Letter Signature" list.
   *
   * Why we select the block explicitly instead of trusting a non-empty gate: the screen ALSO auto-selects a
   * block on its INITIAL `regDist=''` load (GET /letter-signature-blocks with no params returns the full list and it
   * picks block 744, org unit 70). So the picker is already non-empty BEFORE this reg/dist is chosen — a bare
   * `not.toHaveValue('')` is satisfied by the stale 744 and cannot tell it apart from the reloaded DCC
   * selection. `await reload` resolves on the response + `res.json()` + re-render, but at that instant the DOM
   * can still hold 744; the gate only passed before because the next Playwright round-trip happened to give
   * React time to flush — lose that window and it would green-light 744, which the backend renders happily.
   * Selecting `blockId` explicitly (its `<option>` value is the block's scaleSignatoryBlockId) both PINS the
   * correct block AND turns the reload into a real assertion — Playwright throws if that option is not present
   * in the reloaded DCC list, which is exactly what the Gherkin ("the reg/dist that HAS a signatory block")
   * means. Arm the reg/dist-SPECIFIC reload (the GET carrying `orgUnitNo=<n>`, which the initial load does
   * not) BEFORE selecting the reg/dist so we don't miss it.
   */
  async selectRegDistWithSignature(orgUnitCode: string, orgUnitNo: number, blockId: string): Promise<void> {
    const reload = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        new URL(r.url()).pathname.endsWith('/letter-signature-blocks') &&
        new URL(r.url()).searchParams.get('orgUnitNo') === String(orgUnitNo),
      { timeout: 30000 },
    );
    await this.regDistSelect.selectOption(orgUnitCode);
    await reload;
    await this.signatureBlockSelect.selectOption(blockId);
  }

  /**
   * Submit the letter with Preview=Yes (the default) and capture the file the browser downloads. Mirrors the
   * report-screen generation step: arm the download AND the POST response BEFORE the click, so a render
   * failure fails fast with its status instead of a blind 150s download timeout. Returns the download's
   * suggested filename and on-disk path for byte assertions. The POST is the real backend call (the MSD spy
   * only counts it and continues), so this genuinely renders a letter and persists it.
   */
  async generateAndDownload(letterId: string): Promise<{ filename: string; path?: string }> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 150_000 });
    const responsePromise = this.page
      .waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new RegExp(`/api/mark-site-designations/${letterId}/letter$`).test(new URL(r.url()).pathname),
        { timeout: 150_000 },
      )
      .catch(() => null);

    await this.clickSend();

    const response = await responsePromise;
    if (response && !response.ok()) {
      // The download will never arrive now, so `downloadPromise` stays pending and will reject when its 150s
      // wait times out. Nothing awaits it once we throw below, which would surface as an unhandled rejection
      // (failing an unrelated later test). Detach a no-op catch so that timeout rejection is swallowed.
      void downloadPromise.catch(() => {});
      throw new Error(
        `Letter generation returned HTTP ${response.status()} for ${new URL(response.url()).pathname} — ` +
          `check that the report engine is up (defects.md Bug #1) and the reg/dist has a signatory block.`,
      );
    }

    const download = await downloadPromise;
    const failure = await download.failure();
    expect(failure, `the letter download failed: ${failure}`).toBeNull();
    return { filename: download.suggestedFilename(), path: (await download.path()) ?? undefined };
  }
}
