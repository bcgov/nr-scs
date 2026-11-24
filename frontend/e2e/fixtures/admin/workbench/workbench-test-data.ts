import { daysAgo, daysAhead } from '../../common/dates';

/**
 * Test data for the Work Bench (UC-SCA-009 scaler / -010 scale-site / -011 MSD). Pinned from the seeded
 * local Docker Oracle DB + the running app on 2026-07-29. Nothing is fabricated.
 *
 * SEEDING RECIPE (proven against all three DB view packages `scs_*_wb_vw`): a record appears in a Work
 * Bench section iff `expiry_notification_ind = 'N'` AND `expiry_date ∈ (today, today+30]` AND not
 * cancelled. So a disposable EXPIRING record = create with `expiryDate = today+15` (well inside the
 * window); the create services default `expiry_notification_ind` to 'N'. The renewed clone gets extended
 * dates, so it does NOT re-appear in the section.
 *
 * CLEANUP: scaler + scale-site authorizations have DELETE endpoints; MSD has none (removed at the DB via
 * `deleteMarkSiteDesignationsViaDb`). Each seed AND each renewed clone is registered for teardown.
 *
 * The three lists are SHARED GLOBAL state (every viewer sees the same expiring records), so the suite runs
 * `@mode:serial` and the per-UC stress runs at `workers=1` — concurrent seeds would otherwise cross-
 * contaminate the sections.
 */

/** Expiry date that lands a seeded record inside the Work Bench window (today, today+30]. */
export const seedExpiryDate = (): string => daysAhead(15);
export const seedEffectiveDate = (): string => daysAgo(1);

/**
 * Scaler authorization seed — licence 8437 / org unit 15 (real, from scaler_authorization 3071), District
 * Wide so no scale sites are required. Confirmed 2026-07-29: POST → 201, appears in
 * GET /api/scaler-authorizations/workbench; DELETE /api/scaler-authorizations/{id} → 204.
 */
export const buildScalerAuthWorkbenchBody = () => ({
  scalerLicenceNo: '8437',
  orgUnitNo: 15,
  districtWideInd: 'Y',
  authorizationEffectiveDate: seedEffectiveDate(),
  authorizationExpiryDate: seedExpiryDate(),
  jobFunctions: ['P'],
  authForestProducts: [],
  scaleSites: [],
  conditions: [],
});

/**
 * Scale-site authorization seed — site '000' (real, from scale_site_authorization 239291). Confirmed
 * 2026-07-29: POST → 201, appears in GET /api/scale-site-authorizations/workbench; DELETE → 204.
 */
export const buildScaleSiteAuthWorkbenchBody = () => ({
  scaleSiteIdNmbr: '000',
  authorizationEffectiveDate: seedEffectiveDate(),
  authorizationExpiryDate: seedExpiryDate(),
  expectedScaleVolume: 2,
  conditions: [],
});

/**
 * Mark Site Designation seed — mark ES20R4 (creatable via the msd-create-mark.sql patch), District Wide
 * so no scale site (avoids the hauling_mark_site (mark,site) unique key → parallel-safe). Confirmed
 * 2026-07-29: POST → 201, appears in GET /api/mark-site-designations/workbench.
 */
export const buildMsdWorkbenchBody = () => ({
  timberMark: 'ES20R4',
  effectiveDate: seedEffectiveDate(),
  expiryDate: seedExpiryDate(),
  orgUnitNo: 1831,
  districtWideInd: 'Y',
  scaleSites: [] as string[],
});
