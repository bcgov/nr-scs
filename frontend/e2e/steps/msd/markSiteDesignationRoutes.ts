/**
 * Shared MSD route matchers. One home so navigation asserts can't drift if a route shape changes
 * (reuse over duplication — mirrors steps/chk/checkScaleRoutes.ts).
 */
export const onCreate = /\/mark-site-designations\/create$/;
export const onView = /\/mark-site-designations\/view/;
