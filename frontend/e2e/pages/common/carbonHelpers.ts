import { type Locator, type Page } from '@playwright/test';

/**
 * Cross-domain Carbon Design System DOM patterns — no domain vocabulary. Promoted out of
 * pages/chk/checkScaleDetailShared.ts once a second domain (CCQ) needed the same pattern: every
 * Carbon `invalid`/`invalidText` field (TextInput, TextArea, Select, DateInput, FilterableMultiSelect)
 * renders its error the same way, so this locator is shared rather than re-derived per domain.
 */

/**
 * The Carbon requirement/error text rendered under a specific field, scoped to that field's form-item
 * so a short message (e.g. "Required.") is unambiguous. `id` is a `#`-prefixed selector.
 */
export function fieldError(page: Page, id: string): Locator {
  return page
    .locator(`xpath=//*[@id="${id.slice(1)}"]/ancestor::div[contains(@class,"cds--form-item")][1]`)
    .locator('.cds--form-requirement');
}
