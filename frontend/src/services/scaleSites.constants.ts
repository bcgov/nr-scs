/**
 * Scale-site constants with no imports, so non-service code (e.g. ScaleSiteForm/logic.ts) can use
 * them without loading scaleSites.service, which sits in the services <-> APIs import cycle.
 */
export const SCALE_SITE_PRIORITY_CODE = {
  PRIMARY: 'P',
  SECONDARY: 'S',
  TERTIARY: 'T',
} as const;

export type ScaleSitePriorityCode =
  (typeof SCALE_SITE_PRIORITY_CODE)[keyof typeof SCALE_SITE_PRIORITY_CODE];
