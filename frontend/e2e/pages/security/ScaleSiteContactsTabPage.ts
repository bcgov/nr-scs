import { type Locator, type Page } from '@playwright/test';

/**
 * Locators for the Scale Site record's **Contacts** tab — the one tab where role gating had to remove a
 * whole table column rather than just hide buttons, which is why it needs its own object.
 *
 * Gating only the Edit/Delete buttons would leave a headed `Actions` column full of empty cells, so
 * `ContactsTab` drops the column (header *and* cells) for a role holding neither
 * `SCALE_SITE_CONTACT_UPDATE` nor `_DELETE`. Both halves are asserted here: the header's absence, and the
 * row buttons' absence. They are separate checks on purpose — an implementation that hid the buttons but
 * kept the header would pass one and fail the other, which is exactly the state worth catching.
 *
 * There is no page object for this tab elsewhere in the suite (checked before writing), so these are new
 * rather than reused. Navigation is deliberately NOT included: a role suite must arrive as the role under
 * test, so the scenario drives `RoleSessionPage.visit` and this object contributes selectors only.
 */
export class ScaleSiteContactsTabPage {
  readonly page: Page;
  /**
   * The contacts tables — **plural, and that is not a detail to tidy away.** `ContactsTab` renders the
   * *Primary Site Contact* and *Additional Site Contacts* sections as two separate `<Table>`s sharing one
   * `aria-label`, so on a site with both kinds of contact this resolves to two elements. Every locator
   * below is therefore written to aggregate across them and asserted with `toHaveCount`, never with
   * `toBeVisible` on a bare match — a strict-mode locator here fails with "resolved to 2 elements", which
   * reads like a broken selector rather than the two sections it actually is.
   */
  readonly tables: Locator;
  /** Present once per rendered table, and only when the user holds a contact write permission. */
  readonly actionsColumnHeaders: Locator;
  readonly editRowButtons: Locator;
  readonly deleteRowButtons: Locator;
  /** The Add controls, both gated on `SCALE_SITE_CONTACT_CREATE`. */
  readonly addPrimaryContactButton: Locator;
  readonly addSiteContactButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tables = page.getByRole('table', { name: 'Scale site contacts' });
    this.actionsColumnHeaders = page.getByRole('columnheader', { name: 'Actions' });
    // Scoped to the contacts tables so the record page's other Edit/Delete controls cannot satisfy these.
    this.editRowButtons = this.tables.getByRole('button', { name: 'Edit', exact: true });
    this.deleteRowButtons = this.tables.getByRole('button', { name: 'Delete', exact: true });
    this.addPrimaryContactButton = page.getByRole('button', { name: 'Add Primary Contact' });
    this.addSiteContactButton = page.getByRole('button', { name: 'Add Site Contact' });
  }

  /**
   * A contact name cell. Rendered as a button (it opens the inline read-only detail), so a role that can
   * read a contact still gets a clickable name — the data is not hidden, only the write controls are.
   * Matched page-wide rather than inside `tables`, which would be an ambiguous parent.
   */
  contactNameLink(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }
}
