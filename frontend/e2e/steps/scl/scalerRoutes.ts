/**
 * Shared SCL route matchers. One home so navigation asserts can't drift if a route shape changes
 * (reuse over duplication — mirrors steps/msd/markSiteDesignationRoutes.ts).
 */
export const onScalerCreate = /\/scalers\/create$/;
export const onScalerView = /\/scalers\/view\//;
