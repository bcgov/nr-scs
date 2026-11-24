import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the new Mark Site Designation EDIT screen (route
 * /mark-site-designations/edit/:authorizationId). All DOM selectors for MSD edit live here; steps call
 * these methods. The screen loads an existing record, exposes the same field set as create (read-only
 * MSD #/Timber Mark/Mark Holder, editable dates/Reg-Dist/District Wide/volumes/text areas, Scale Sites
 * when District Wide=No, Species/Exceptions/Conditions), plus Back / Reset / Save Record actions.
 *
 * The ONLY write is PUT /api/mark-site-designations/{id} from "Save Record"; adding a scale site and
 * clicking Reset never PUT. When a letter has been issued (letterExists=true) the screen enters a
 * RESTRICTED mode: an info banner shows and every field except Expiry Date is disabled.
 *
 * Field ids are the app's stable Carbon ids (Edit/MarkSiteDesignation/index.tsx + shared components):
 * #msd-number, #timber-mark, #effective-date, #expiry-date, #district (DistrictSelect default id),
 * #district-wide, #population, #estimated-volume, #estimated-truck-loads, #geographic-location,
 * #timber-description, #transportation-date-desc, #other-requirements, #scale-site-number.
 */

/** How to clear/set each required-ish basic field a Scenario Outline can name (label → id + control kind). */
type FieldSpec = { id: string; kind: 'date' | 'select' | 'text' };
export const EDIT_FIELD_BY_LABEL: Record<string, FieldSpec> = {
  'Effective Date': { id: '#effective-date', kind: 'date' },
  'Expiry Date': { id: '#expiry-date', kind: 'date' },
  'Reg / Dist': { id: '#district', kind: 'select' },
  'District Wide?': { id: '#district-wide', kind: 'select' },
  'Est. Volume': { id: '#estimated-volume', kind: 'text' },
  'Est. Truck Loads': { id: '#estimated-truck-loads', kind: 'text' },
  // The free-text areas. `fill` drives a <textarea> exactly as it does an <input>, so 'text' fits.
  'Geographic Location': { id: '#geographic-location', kind: 'text' },
  'Timber Description': { id: '#timber-description', kind: 'text' },
  'Transportation Date Desc': { id: '#transportation-date-desc', kind: 'text' },
  'Other Requirements': { id: '#other-requirements', kind: 'text' },
};

const districtWideFromWord = (word: string): '' | 'Y' | 'N' =>
  word === 'Yes' ? 'Y' : word === 'No' ? 'N' : '';

export class MarkSiteDesignationEditPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly errorBanner: Locator;
  readonly letterBanner: Locator;
  readonly loadErrorBanner: Locator;
  readonly geographicLocation: Locator;
  readonly estVolume: Locator;
  readonly effectiveDate: Locator;
  readonly expiryDate: Locator;
  readonly districtWide: Locator;
  readonly scaleSiteInput: Locator;
  readonly scaleSiteAddButton: Locator;
  readonly speciesSelect: Locator;
  readonly speciesContentInput: Locator;
  readonly speciesAddButton: Locator;
  readonly saveRecordButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Mark Site Designation - Edit' });
    this.errorBanner = page.locator('.cds--inline-notification--error');
    // The restricted-mode ("Letter issued") notice is the info-kind inline notification on the form.
    this.letterBanner = page.locator('.cds--inline-notification--info');
    // On a load failure the page renders ONLY an error notification (no form) — same error-kind locator.
    this.loadErrorBanner = this.errorBanner;
    this.geographicLocation = page.locator('#geographic-location');
    this.estVolume = page.locator('#estimated-volume');
    this.effectiveDate = page.locator('#effective-date');
    this.expiryDate = page.locator('#expiry-date');
    this.districtWide = page.locator('#district-wide');
    this.scaleSiteInput = page.locator('#scale-site-number');
    this.scaleSiteAddButton = page
      .locator('.scale-sites-section__button-group')
      .getByRole('button', { name: 'Add', exact: true });
    // Species Content controls — the edit screen reuses the same Carbon ids + CSS classes as create.
    this.speciesSelect = page.locator('#species-input');
    this.speciesContentInput = page.locator('#species-content-input');
    this.speciesAddButton = page
      .locator('.mark-site-designation-create__species-input-field--add')
      .getByRole('button', { name: 'Add', exact: true });
    this.saveRecordButton = page.getByRole('button', { name: 'Save Record' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.backButton = page.getByRole('button', { name: 'Back' });
  }

  /** Log in (mock IDIR) then client-side navigate to the edit route so the in-memory session survives. */
  async goto(authorizationId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/mark-site-designations/edit/${authorizationId}`);
  }

  /** Wait web-first for the edit form to be ready (the record has loaded). */
  async waitReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.saveRecordButton).toBeVisible();
  }

  /** Is the form in restricted ("Letter issued") mode? (banner present.) */
  async isLocked(): Promise<boolean> {
    return (await this.letterBanner.count()) > 0;
  }

  /**
   * Open a record we KNOW is letterless (a freshly-seeded one) for editing, RECOVERING from a spurious
   * "Letter issued" lock. Under concurrent load the backend intermittently returns letterExists=true for
   * a letterless MSD, so the edit form renders wrongly locked (defects.md Bug #1 — SCS MSD packages are
   * not concurrency-safe; confirmed live: seeded records with zero letter rows render locked ~1-in-8).
   * When that happens we re-mount the edit page (bounce through the create route client-side, so the mock
   * session survives) and re-fetch — a fresh load almost always returns the correct unlocked form. This
   * hardens the functional edit scenarios around a FILED backend bug (mirrors the login reload-once); it
   * never masks it — Bug #1 stays open with a standalone repro, and S04 still asserts REAL letter records
   * lock. If the record is still locked after several attempts, we throw (the bug got dramatically worse).
   */
  async openForEditingUnlocked(authorizationId: string): Promise<void> {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      // Each attempt re-logs-in through a FRESH /welcome load (loginAsMockScsUser does page.goto), which
      // drops the browser's keep-alive connections and typically maps the next request to a DIFFERENT
      // backend pool connection. That matters because the spurious lock is sticky per pooled connection:
      // a client-side re-mount reuses the same keep-alive → same tainted connection → stays locked. A
      // fresh login breaks that affinity, so a wrongly-locked load recovers on a later attempt.
      await loginAsMockScsUser(this.page);
      await clientSideNavigate(this.page, `/mark-site-designations/edit/${authorizationId}`);
      await this.waitReady();
      if (!(await this.isLocked())) return;
    }
    throw new Error(
      `[bug-workaround] letterless MSD ${authorizationId} still rendered locked after 8 loads — ` +
        `the concurrency letterExists bug (defects.md Bug #1) has regressed; investigate before trusting the run.`,
    );
  }

  async setGeographicLocation(value: string): Promise<void> {
    await this.geographicLocation.fill(value);
  }

  async setEstVolume(value: string): Promise<void> {
    await this.estVolume.fill(value);
  }

  async setDistrictWide(word: string): Promise<void> {
    await this.page.selectOption('#district-wide', districtWideFromWord(word));
  }

  /** Clear (value '') or set one named basic field, so a Scenario Outline can drive the whole matrix. */
  async setField(label: string, value: string): Promise<void> {
    const spec = EDIT_FIELD_BY_LABEL[label];
    if (!spec) throw new Error(`Unknown edit field label: "${label}"`);
    if (spec.kind === 'date') {
      await setDateField(this.page, spec.id, value);
    } else if (spec.kind === 'select') {
      await this.page.selectOption(spec.id, value);
    } else {
      await this.page.locator(spec.id).fill(value);
    }
  }

  async addScaleSite(id: string): Promise<void> {
    await this.scaleSiteInput.fill(id);
    await this.scaleSiteAddButton.click();
    // Adding a site is async (search → append row). Wait web-first for the row before any Save.
    await expect(this.page.getByRole('cell', { name: id, exact: true })).toBeVisible();
  }

  /** Attempt to add a site WITHOUT waiting for a row — the not-found case never appends one (S09). */
  async tryAddScaleSite(id: string): Promise<void> {
    await this.scaleSiteInput.fill(id);
    await this.scaleSiteAddButton.click();
  }

  // --- Species Content (edit screen enforces the SAME client-side guards as create; unlike the
  //     scale-site message, these DISPLAY — they are not submit-gated. See UC-MSD-002 Coverage gap #4). ---

  /** Select a species by code from the edit-screen Species dropdown. */
  async selectSpecies(code: string): Promise<void> {
    await this.page.selectOption('#species-input', code);
  }

  /** Type a value into the edit-screen species Content field. */
  async enterSpeciesContent(value: string): Promise<void> {
    await this.speciesContentInput.fill(value);
  }

  /** Click the edit-screen species "Add" (runs addSpeciesRow's guards; never PUTs). */
  async addSpecies(): Promise<void> {
    await this.speciesAddButton.click();
  }

  async clickSaveRecord(): Promise<void> {
    await this.saveRecordButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** The Geographic Location field's current value — used to prove Reset restored the last-saved state. */
  async geographicLocationValue(): Promise<string> {
    return this.geographicLocation.inputValue();
  }

  /**
   * Assert the RESTRICTED edit mode a letter triggers: the "Letter issued" info banner is shown, Expiry
   * Date stays editable, and the other core fields are disabled (Carbon renders `disabled` inputs).
   */
  async expectRestrictedMode(): Promise<void> {
    await expect(this.letterBanner).toBeVisible();
    await expect(this.expiryDate).toBeEnabled();
    await expect(this.effectiveDate).toBeDisabled();
    await expect(this.page.locator('#district')).toBeDisabled();
    await expect(this.districtWide).toBeDisabled();
    await expect(this.estVolume).toBeDisabled();
    await expect(this.geographicLocation).toBeDisabled();
  }
}
