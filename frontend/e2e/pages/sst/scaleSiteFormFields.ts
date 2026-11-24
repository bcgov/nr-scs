import { type Locator } from '@playwright/test';

/**
 * Shared field-fill helper for the `ScaleSiteForm` (components/Form/ScaleSiteForm), used by BOTH the
 * standalone create page and the edit modal. The two hosts differ only in their ROOT: the create page
 * scopes to the create form on its route; the edit modal scopes to the Carbon dialog (the summary tab
 * behind it also carries a read-only `#site-location-description`, so scoping matters). Promoted here so
 * the field-id map lives in ONE place rather than drifting between the two page objects.
 */

export type Dms = { degrees?: string; minutes?: string; seconds?: string };

export type ScaleSiteFormInput = {
  siteName?: string;
  ownerClient?: string;
  ownerLoc?: string;
  regDist?: string;
  timberBrand?: string;
  latitude?: Dms;
  longitude?: Dms;
  siteLocation?: string;
  primaryType?: string;
  secondaryType?: string;
  tertiaryType?: string;
};

async function fillDms(root: Locator, dimension: 'latitude' | 'longitude', dms: Dms): Promise<void> {
  if (dms.degrees !== undefined) await root.locator(`#${dimension}-degrees`).fill(dms.degrees);
  if (dms.minutes !== undefined) await root.locator(`#${dimension}-minutes`).fill(dms.minutes);
  if (dms.seconds !== undefined) await root.locator(`#${dimension}-seconds`).fill(dms.seconds);
}

/** Apply only the provided fields, scoped to `root`; anything omitted keeps its current value. */
export async function fillScaleSiteFields(root: Locator, values: ScaleSiteFormInput): Promise<void> {
  if (values.siteName !== undefined) await root.locator('#scale-site-name').fill(values.siteName);
  if (values.ownerClient !== undefined) await root.locator('#client').fill(values.ownerClient);
  if (values.ownerLoc !== undefined) await root.locator('#loc').fill(values.ownerLoc);
  if (values.regDist !== undefined) await root.locator('#reg-dist').selectOption(values.regDist);
  if (values.timberBrand !== undefined) await root.locator('#timber-brand').fill(values.timberBrand);
  if (values.latitude !== undefined) await fillDms(root, 'latitude', values.latitude);
  if (values.longitude !== undefined) await fillDms(root, 'longitude', values.longitude);
  if (values.siteLocation !== undefined) await root.locator('#site-location-description').fill(values.siteLocation);
  if (values.primaryType !== undefined) await root.locator('#site-type-primary').selectOption(values.primaryType);
  if (values.secondaryType !== undefined) await root.locator('#site-type-secondary').selectOption(values.secondaryType);
  if (values.tertiaryType !== undefined) await root.locator('#site-type-tertiary').selectOption(values.tertiaryType);
}
