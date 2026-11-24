import { type Locator, type Page, expect } from '@playwright/test';
import { waitForActivePanelSettled } from './RecordTabsPage';

/** The five audit fields, keyed by the label the popup renders them against. */
export const AUDIT_LABELS = {
  entryTimestamp: 'When Created:',
  entryUserid: 'Who Created:',
  updateTimestamp: 'When Updated:',
  updateUserid: 'Who Updated:',
  revisionCount: 'Revision Count:',
} as const;

export type AuditFieldKey = keyof typeof AUDIT_LABELS;

/** What the popup is showing, read back as the five labelled values. */
export type RenderedAudit = Record<AuditFieldKey, string>;

/**
 * The "Who Did It" audit popup (UC-SYS-005 / Epic SEC story SEC-5) — a component, not a screen.
 *
 * **Why a page object for a component.** It is mounted on eleven host screens, and its two most
 * consequential behaviours belong to none of them: it renders only for IDIR users, and its five values
 * come from whatever the host hands it. A per-screen assertion would re-litigate the same component
 * eleven times and still never ask the cross-cutting questions — which is exactly why every UC ledger
 * that met it deferred it (see `features/mark-site-designation/uc-msd-003-view/defects.md` gap #4).
 *
 * **Locators are the ones the component's own browser test proved**, so this object and
 * `nr-scs/frontend/src/components/core/WhoDidIt/index.browser.test.tsx` cannot drift apart silently:
 * the trigger by its accessible name, the values by the `.who-did-it__value` that sits beside each
 * `<dt>`.
 *
 * **The popup is portaled to `document.body`** (so it centres correctly when its trigger sits inside
 * another Carbon modal). Locators are therefore rooted at the page, never at the host panel — scoping
 * them to the record's tab panel would find the trigger and miss the dialog.
 */
export class WhoDidItPage {
  readonly page: Page;
  /**
   * Every audit trigger currently rendered. A locator rather than a single element because the count
   * IS the assertion in two directions: zero for a non-IDIR user, and one per host record view.
   */
  readonly triggers: Locator;
  /** The popup itself, addressed by the aria-label the component sets on its Carbon Modal. */
  readonly popup: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.triggers = page.getByRole('button', { name: /who did it/i });
    this.popup = page.locator('.who-did-it-modal');
    // Carbon's Modal renders TWO controls whose accessible name is "Close": the header's icon-only X
    // (name from `aria-label`) and the footer's primary button (name from its text). A role lookup
    // matches both and fails on strict mode, so the footer one is picked by the two things that
    // separate it — it carries the visible text, and it is not icon-only.
    this.closeButton = this.popup
      .locator('button:not(.cds--btn--icon-only)')
      .filter({ hasText: 'Close' });
  }

  async triggerCount(): Promise<number> {
    return this.triggers.count();
  }

  /**
   * Count the triggers once the host record view's selected tab has finished loading.
   *
   * A plain `triggerCount()` straight after navigation can run before the Summary panel that carries the
   * trigger has rendered, and reads 0. That broke both directions of the IDIR/BCeID pair (2026-10-01, 6
   * workers): the "offered" scenario failed on a 0 read too early, and the "withheld" one could have
   * passed for the same wrong reason. A poll would only fix "offered" — "withheld" needs the count taken
   * AFTER the page has loaded — so this waits for the settled panel, then counts once. Hosts are tabbed
   * record views (the Scaler and Scale Site records).
   */
  async settledTriggerCount(): Promise<number> {
    await waitForActivePanelSettled(this.page, 'the record view’s selected panel');
    return this.triggers.count();
  }

  /**
   * Open the popup from the host screen's audit trigger.
   *
   * `.first()` is deliberate: a host may mount more than one (the Scaler record carries one on Summary
   * and another on the Performance Remarks action row), and any of them opening the same component is
   * what this asserts. Which hosts mount how many is `host-screens.feature`'s question, counted rather
   * than clicked.
   */
  async open(): Promise<void> {
    await expect(
      this.triggers.first(),
      'the host screen must offer the audit trigger before the popup can be opened — for an IDIR ' +
        'user its absence is the finding, not a timing problem',
    ).toBeVisible({ timeout: 30_000 });
    await this.triggers.first().click();
    await expect(this.popup, 'clicking the audit trigger must open the popup').toBeVisible({
      timeout: 15_000,
    });
    // The popup renders a five-line skeleton while its host's record query is pending. Reading a value
    // over the skeleton returns '' — which is indistinguishable from the "absent field renders blank"
    // behaviour this suite asserts elsewhere, so the wait is what keeps those two apart.
    await expect(
      this.popup.locator('[class*="cds--skeleton"]'),
      'the popup must finish loading — a value read over its skeleton is blank, which this suite ' +
        'reads as a real (and asserted) rendering of an absent field',
    ).toHaveCount(0, { timeout: 15_000 });
  }

  /** The value rendered beside one label. `''` when the field rendered empty. */
  async fieldValue(key: AuditFieldKey): Promise<string> {
    const row = this.popup
      .locator('.who-did-it__row')
      .filter({ has: this.page.getByText(AUDIT_LABELS[key], { exact: true }) });
    await expect(
      row,
      `the popup must render the "${AUDIT_LABELS[key]}" row — the five labels are the UC-SYS-005 contract`,
    ).toHaveCount(1);
    return (await row.locator('.who-did-it__value').innerText()).trim();
  }

  /** All five values at once, for the whole-record comparison. */
  async renderedAudit(): Promise<RenderedAudit> {
    const entries = await Promise.all(
      (Object.keys(AUDIT_LABELS) as AuditFieldKey[]).map(
        async (key) => [key, await this.fieldValue(key)] as const,
      ),
    );
    return Object.fromEntries(entries) as RenderedAudit;
  }

  /** Every label the popup rendered, in DOM order — so a missing or reordered field is visible. */
  async renderedLabels(): Promise<string[]> {
    return (await this.popup.locator('.who-did-it__label').allInnerTexts()).map((t) => t.trim());
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.popup, 'Close must dismiss the popup').toBeHidden({ timeout: 10_000 });
  }
}
