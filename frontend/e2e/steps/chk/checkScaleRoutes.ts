/**
 * Shared CHK route matchers for the Summary Check Scale screens. One home so navigation asserts across
 * the nav/update step modules can't drift apart if a route shape changes (reuse over duplication).
 */
export const onCreate = /\/summary-check-scales\/create$/;
export const onUpdate = /\/summary-check-scales\/\d+\/edit$/;
