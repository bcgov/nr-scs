import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the new single-page Mark Site Designation CREATE screen
 * (route /mark-site-designations/create). All DOM selectors for MSD create live here; steps call
 * these methods. The screen has two stages on one route: the always-visible "MSD Authorization"
 * basics, and an advanced section (Scale Sites / Species / Exceptions / Conditions) revealed by
 * "Add Conditions" once the basics validate. The ONLY write (POST /api/mark-site-designations) fires
 * from "Save Record"; "Add Conditions" validates client-side and never POSTs.
 *
 * Field ids are the app's stable Carbon ids (index.tsx): #timber-mark, #effective-date, #expiry-date,
 * #district (Reg/Dist), #district-wide, #estimated-volume, #estimated-truck-loads. The Scale Sites
 * section renders ONLY when District Wide = No (ScaleSitesSection returns null otherwise); its input is
 * #scale-site-number.
 */

export type MarkSiteBasics = {
  timberMark: string;
  effectiveDate: string;
  expiryDate: string;
  regDist: string;
  districtWide: '' | 'Y' | 'N';
  estVolume: string;
  estTruckLoads: string;
};

/** Map of user-facing field label -> the key on MarkSiteBasics, so a Scenario Outline can name fields. */
export const BASICS_FIELD_BY_LABEL: Record<string, keyof MarkSiteBasics> = {
  'Timber Mark': 'timberMark',
  'Effective Date': 'effectiveDate',
  'Expiry Date': 'expiryDate',
  'Reg / Dist': 'regDist',
  'District Wide?': 'districtWide',
  'Est. Volume': 'estVolume',
  'Est. Truck Loads': 'estTruckLoads',
};

/**
 * The four free-text areas, which are NOT part of MarkSiteBasics (they are optional and never set by
 * the happy-path fixtures). Named here so a length scenario can drive one by its screen label.
 */
export const TEXT_AREA_ID_BY_LABEL: Record<string, string> = {
  'Geographic Location': '#geographic-location',
  'Timber Description': '#timber-description',
  'Transportation Date Desc': '#transportation-date-desc',
  'Other Requirements': '#other-requirements',
};

export class MarkSiteDesignationCreatePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly errorBanner: Locator;
  readonly timberMark: Locator;
  readonly updateMarkButton: Locator;
  readonly addConditionsButton: Locator;
  readonly saveRecordButton: Locator;
  readonly scaleSiteInput: Locator;
  readonly scaleSiteAddButton: Locator;
  readonly speciesSelect: Locator;
  readonly speciesContentInput: Locator;
  readonly speciesAddButton: Locator;
  readonly conditionIdInput: Locator;
  readonly conditionAddButton: Locator;
  readonly markHolderName: Locator;
  readonly markStatus: Locator;
  readonly speciesTable: Locator;
  readonly scaleSitesTable: Locator;
  readonly conditionsTable: Locator;
  readonly templateSelect: Locator;
  readonly conditionSearchButton: Locator;
  readonly applyTemplateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Mark Site Designation - Create' });
    this.errorBanner = page.locator('.cds--inline-notification--error');
    this.timberMark = page.locator('#timber-mark');
    this.updateMarkButton = page.getByRole('button', { name: 'Update Timber Mark' });
    this.addConditionsButton = page.getByRole('button', { name: 'Add Conditions' });
    this.saveRecordButton = page.getByRole('button', { name: 'Save Record' });
    this.scaleSiteInput = page.locator('#scale-site-number');
    // Several "Add" buttons exist on the advanced section; scope each to its own row (exact name so
    // "Add" never matches "Add Conditions"/"Adding...").
    this.scaleSiteAddButton = page
      .locator('.scale-sites-section__button-group')
      .getByRole('button', { name: 'Add', exact: true });
    this.speciesSelect = page.locator('#species-input');
    this.speciesContentInput = page.locator('#species-content-input');
    this.speciesAddButton = page
      .locator('.mark-site-designation-create__species-input-field--add')
      .getByRole('button', { name: 'Add', exact: true });
    // Conditions live in the shared AuthorizationConditionsSection; its add-by-number input is
    // #condition-id and its Add button sits in the .authorization-conditions__input-row (exact "Add"
    // so it never matches the section's "Search" or the page's other Add buttons).
    this.conditionIdInput = page.locator('#condition-id');
    this.conditionAddButton = page
      .locator('.authorization-conditions__input-row')
      .getByRole('button', { name: 'Add', exact: true });
    this.markHolderName = page.locator('#mark-holder-name');
    this.markStatus = page.locator('#mark-status');
    // Scope the two child tables by a column header unique to each (the advanced section renders a Species
    // table and, for District Wide=No, a Scale Sites table — mirrors MarkSiteDesignationViewPage).
    this.speciesTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Species', exact: true }) });
    this.scaleSitesTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Site #', exact: true }) });
    // The shared AuthorizationConditionsSection (conditionClassCode="MSD"): its table has a "Condition #"
    // header; its add-by-id row (#condition-id + Add + Search) is `.authorization-conditions__input-row`;
    // its template controls (#template-select + Apply) are `.authorization-conditions__template-controls`.
    // Anchor to the create FORM: the condition Search modal portals its own "Condition #" table to
    // document.body (outside the form), so an unscoped getByRole('table') would match both.
    this.conditionsTable = page
      .locator('.mark-site-designation-create-form')
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Condition #', exact: true }) });
    this.templateSelect = page.locator('#template-select');
    this.conditionSearchButton = page
      .locator('.authorization-conditions__input-row')
      .getByRole('button', { name: 'Search', exact: true });
    this.applyTemplateButton = page
      .locator('.authorization-conditions__template-controls')
      .getByRole('button', { name: 'Apply', exact: true });
  }

  // --- shared conditions section (covers AuthorizationConditionsSection once, on the MSD host) ---------

  /** A Conditions table row scoped by its Title cell (unique per condition). */
  conditionRowByTitle(title: string): Locator {
    return this.conditionsTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: title, exact: true }) });
  }

  /** The per-row Remove button for a condition id (ariaLabel `Remove condition {id}`; disabled if mandatory). */
  removeConditionButton(id: string): Locator {
    return this.page.getByRole('button', { name: `Remove condition ${id}` });
  }

  /** Reveal the advanced section AND wait for the mandatory conditions to finish loading (no race with add). */
  async openConditionsSection(): Promise<void> {
    await this.clickAddConditions();
    await expect(this.conditionRowByTitle('DIRECT TRANSPORTATION')).toBeVisible();
  }

  async removeConditionByTitle(title: string): Promise<void> {
    await this.conditionRowByTitle(title).getByRole('button', { name: /Remove/ }).click();
  }

  /** Select a template by its code value and click Apply (appends the template's conditions). */
  async applyTemplate(code: string): Promise<void> {
    await this.templateSelect.selectOption(code);
    await this.applyTemplateButton.click();
  }

  /** Open the condition Search modal and select a condition by its id (its Condition # is a click button). */
  async addConditionFromSearch(id: string): Promise<void> {
    await this.conditionSearchButton.click();
    await this.page.locator('.scs__condition-search-table').getByRole('button', { name: id, exact: true }).click();
  }

  /** Assert the mark-holder fields populated after a successful "Update Timber Mark" lookup. */
  async expectHolderPopulated(name: string, status: string): Promise<void> {
    await expect(this.markHolderName).toHaveValue(name);
    await expect(this.markStatus).toHaveValue(status);
  }

  /** Add a valid species row: select the code, enter its content %, click Add. */
  async addValidSpecies(code: string, percent: string): Promise<void> {
    await this.selectSpecies(code);
    await this.enterSpeciesContent(percent);
    await this.addSpecies();
  }

  /** A Species table row scoped by its rendered species label (e.g. "Alder"); unique per added code. */
  speciesRow(label: string): Locator {
    return this.speciesTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: label, exact: true }) });
  }

  async removeSpeciesRow(label: string): Promise<void> {
    await this.speciesRow(label).getByRole('button', { name: /Remove/ }).click();
  }

  /** A Scale Sites table row scoped by its Site # cell. */
  scaleSiteRow(id: string): Locator {
    return this.scaleSitesTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: id, exact: true }) });
  }

  async removeScaleSite(id: string): Promise<void> {
    await this.scaleSiteRow(id).getByRole('button', { name: /Remove/ }).click();
  }

  /**
   * Add a scale site and WAIT for its lookup (GET /scale-sites/search?scaleSiteIdNmbr=id) to resolve, so a
   * following assertion (e.g. de-dup "exactly once") runs after the add's async append has had its input.
   */
  async addScaleSiteAwaitingSearch(id: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/scale-sites/search') && r.url().includes(`scaleSiteIdNmbr=${id}`),
      ),
      this.addScaleSite(id),
    ]);
  }

  /** Log in (mock IDIR) then client-side navigate to the create route so the in-memory session survives. */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/mark-site-designations/create');
    await expect(this.heading).toBeVisible();
  }

  /** Apply only the provided basics fields (text fields left blank if '' — that's the "missing" case). */
  async fillBasics(values: Partial<MarkSiteBasics>): Promise<void> {
    if (values.timberMark !== undefined && values.timberMark !== '') {
      await this.timberMark.fill(values.timberMark);
    }
    if (values.effectiveDate) await setDateField(this.page, '#effective-date', values.effectiveDate);
    if (values.expiryDate) await setDateField(this.page, '#expiry-date', values.expiryDate);
    if (values.regDist !== undefined && values.regDist !== '') {
      await this.page.selectOption('#district', values.regDist);
    }
    if (values.districtWide !== undefined && values.districtWide !== '') {
      await this.page.selectOption('#district-wide', values.districtWide);
    }
    if (values.estVolume) await this.page.locator('#estimated-volume').fill(values.estVolume);
    if (values.estTruckLoads) await this.page.locator('#estimated-truck-loads').fill(values.estTruckLoads);
  }

  /** Fill one of the free-text areas by its screen label (ERR-019..ERR-022 length rules). */
  async setTextArea(label: string, value: string): Promise<void> {
    const id = TEXT_AREA_ID_BY_LABEL[label];
    if (!id) throw new Error(`Unknown mark site text area label: "${label}"`);
    await this.page.locator(id).fill(value);
  }

  async lookupTimberMark(mark: string): Promise<void> {
    await this.timberMark.fill(mark);
    await this.updateMarkButton.click();
  }

  async clickAddConditions(): Promise<void> {
    await this.addConditionsButton.click();
  }

  async clickSaveRecord(): Promise<void> {
    await this.saveRecordButton.click();
  }

  async addScaleSite(id: string): Promise<void> {
    await this.scaleSiteInput.fill(id);
    await this.scaleSiteAddButton.click();
  }

  /** Click the species "Add" without selecting anything -> triggers the "Species is required." check. */
  async addSpeciesBlank(): Promise<void> {
    await this.speciesAddButton.click();
  }

  /** Click the Scale Sites "Add" with the number input left blank -> triggers "Site # is required." (ERR-012). */
  async addScaleSiteBlank(): Promise<void> {
    await this.scaleSiteAddButton.click();
  }

  /** Select a species by its code from the Species dropdown (a real SCALE_SPECIES_CODE value). */
  async selectSpecies(code: string): Promise<void> {
    await this.page.selectOption('#species-input', code);
  }

  /** Type a value into the species Content field (drives the content-required / integer guards). */
  async enterSpeciesContent(value: string): Promise<void> {
    await this.speciesContentInput.fill(value);
  }

  /** Click the species-row "Add" (after selecting/entering) -> runs addSpeciesRow's guards. */
  async addSpecies(): Promise<void> {
    await this.speciesAddButton.click();
  }

  /**
   * Add a condition by number: type into #condition-id (which enables the Add button) then click Add.
   * A non-numeric value trips the client-side "Condition # must be a valid number." guard client-side
   * (no search request); the button is disabled while the input is blank, so the value is always entered.
   */
  async addConditionByNumber(value: string): Promise<void> {
    await this.conditionIdInput.fill(value);
    await this.conditionAddButton.click();
  }

  /**
   * Happy-path create: fill basics, reveal the advanced section, optionally add a scale site (District
   * Wide=No), then Save. On success the app navigates to the view route.
   */
  async createRecord(values: Partial<MarkSiteBasics>, scaleSiteId?: string): Promise<void> {
    await this.fillBasics(values);
    await this.clickAddConditions();
    if (scaleSiteId) {
      await this.addScaleSite(scaleSiteId);
      // Adding a site is async (search → append row). WAIT web-first for the row before Save, else Save
      // can race ahead with an empty site list and hit the "≥1 site when District Wide=No" client block
      // (a real flake seen ~1/5 under parallel load). The added site renders in the Scale Sites table.
      await expect(this.page.getByRole('cell', { name: scaleSiteId, exact: true })).toBeVisible();
    }
    await this.clickSaveRecord();
  }

  /**
   * The created record's id, read from the post-save redirect
   * (/mark-site-designations/view?haulingMarkAuthorizationId=ID). Waits web-first for the navigation.
   */
  async createdId(): Promise<string> {
    await expect(this.page).toHaveURL(/\/mark-site-designations\/view/);
    const id = new URL(this.page.url()).searchParams.get('haulingMarkAuthorizationId');
    if (!id) throw new Error(`No haulingMarkAuthorizationId in view URL: ${this.page.url()}`);
    return id;
  }
}
