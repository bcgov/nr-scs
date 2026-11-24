/**
 * Anchors for the cross-cutting record-scope suite (SEC-11).
 *
 * This suite's axis is neither a role nor a screen: it is the SEAM in the client-scoping layer. Scoping
 * is enforced two different ways, and only one of them is automatic —
 *
 *   - `ClientScopeInterceptor` keys on two path variables, `scalerLicenceNo` and `scaleSiteIdNmbr`, so
 *     it covers every endpoint addressed that way, including ones added later.
 *   - Every endpoint addressed by SOME OTHER id is covered only if its service calls `ClientScopeGuard`
 *     by hand. Four do. A fifth endpoint added tomorrow would be unguarded and nothing would say so.
 *
 * The anchors below are therefore paired per hand-guarded service: one record the caller's client is
 * entitled to, one it is not. That pairing is the whole assertion — a restriction test alone also
 * passes when the endpoint is simply broken.
 *
 * Provenance: every value verified 2026-08-31 against the seeded Docker DB (`THE/default@…/DBDOCK_01`)
 * and the running backend. Re-verify if the image is rebuilt — the extract is real data, so ids move.
 */

export const INDUSTRY_SCALER_ROLE = 'SCS_INDUSTRY_SCALER';
export const SCALE_SITE_OWNER_ROLE = 'SCS_OWNER';
export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

// ---------------------------------------------------------------- Industry Scaler side

/** The industry scaler's forest client. Matches `industry-scaler-test-data.ts`. */
export const indClientNumber = '00048273';

/**
 * A scaler authorization belonging to THIS client's scaler.
 * `SCALER_AUTHORIZATION 147851` → licence `001B` → `SCALER.CLIENT_NUMBER 00048273`.
 */
export const indOwnScalerAuthorizationId = '147851';

/**
 * A scaler authorization belonging to ANOTHER client's scaler — the deny half.
 * `SCALER_AUTHORIZATION 143648` → licence `653D` → `SCALER.CLIENT_NUMBER 00027212`.
 *
 * Reached through `ScalerAuthorizationService:157` (`assertRecordScalerInScope`), not the interceptor:
 * the path variable is `scalerAuthorizationId`, which the interceptor does not know.
 */
export const indOtherScalerAuthorizationId = '143648';

// ---------------------------------------------------------------- Scale Site Owner side

/** The owner's forest client. Matches `scale-site-owner-test-data.ts`. */
export const ownClientNumber = '00001009';

/** A site this client owns — `SCALE_SITE 019V` → owner client `00001009` (AINSWORTH LUMBER CO. LTD.). */
export const ownScaleSiteId = '019V';

/** A site owned by a DIFFERENT client — `SCALE_SITE 561` → owner client `00001402` (TEMBEC INDUSTRIES INC.). */
export const otherScaleSiteId = '561';

/** Scale-site authorization on the owner's own site. `SCALE_SITE_AUTHORIZATION 239313` → site `019V`. */
export const ownScaleSiteAuthorizationId = '239313';

/**
 * Scale-site authorization on another client's site — the deny half.
 * `SCALE_SITE_AUTHORIZATION 237889` → site `561` → owner client `00001402`.
 *
 * Guarded by `ScaleSiteAuthorizationService:159` (`assertRecordSiteInScope`).
 */
export const otherScaleSiteAuthorizationId = '237889';

/** Inspection on the owner's own site. Confirmed in scope by the probe (200 for the scoped caller). */
export const ownInspectionId = '400091';

/**
 * Inspection on another client's site — the deny half. Inspection `400043` → site `561`.
 * Guarded by `ScaleSiteInspectionService:105` (`assertRecordSiteInScope`).
 */
export const otherInspectionId = '400043';

/** A contact on the owner's own site — `SCALE_SITE_CONTACT (019V, 2497)`. */
export const ownContactId = '2497';

// ---------------------------------------------------------------- The unscopable record

/**
 * A Mark / Site Designation, readable by the Industry Scaler (`MSD_READ`).
 *
 * It is here to pin a NEGATIVE: `HAULING_MARK_AUTHORIZATION` has no client column at all — it is keyed
 * on `TIMBER_MARK` + `ORG_UNIT_NO` — so there is nothing for a client-scoping layer to bind to, and
 * `MarkSiteDesignationService` accordingly contains no scoping code. §F is the one section where the
 * `IND` column reads plain `R` rather than `R (ltd)`, which agrees.
 *
 * So an external role reads every MSD in the province, and no amount of client-scoping work changes
 * that: the record's only scoping axis is the org unit, and org-unit scoping is unbuilt in this source.
 * The scenario asserts today's behaviour and `coverage.md` CG-1 points at that branch.
 */
export const anyMarkSiteDesignationId = '1101';

// ---------------------------------------------------------------- Nonexistent ids

/**
 * Ids that exist in no table, for the no-existence-oracle assertions. An internal caller gets 404; a
 * client-restricted one must get 403, because the scope lookup runs before the handler and collapsing
 * the two denies an external user a probe over the whole keyspace.
 */
export const nonexistentScalerLicenceNo = 'ZZZZ';
export const nonexistentAuthorizationId = '99999999';
export const nonexistentInspectionId = '99999999';

// ---------------------------------------------------------------- the latent seam (risk assessment)

/**
 * A scale site whose owner is neither external anchor client — `SCALE_SITE 614` → owner `00055821`.
 * Refused to a client-restricted caller when addressed as `/scale-sites/614/…`.
 */
export const unscopedRiskSiteId = '614';

/**
 * That same site's risk assessment, addressed by `riskQuestionnaireId` instead — and therefore served
 * to the caller the line above refuses. Confirmed 2026-08-31: assessment 1822 carries
 * `scaleSiteIdNmbr 614`.
 *
 * This pair used to be the executable form of a carve-out: risk assessment was withheld from both
 * external roles precisely because these reads were unscoped. The client's 2026-09-02 spec granted them
 * read-with-limitations, which made closing that gap a precondition rather than an option, so the
 * by-id read is now guarded in `ScaleSiteRiskAssessmentService` and the pair proves the seam SHUT —
 * both routes refuse. Keep both halves: the first is what the second is compared against.
 */
export const unscopedRiskAssessmentId = '1822';
