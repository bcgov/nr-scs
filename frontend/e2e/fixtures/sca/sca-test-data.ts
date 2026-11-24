import { daysAgo, daysAhead } from '../common/dates';

/**
 * Scaler Authorization (UC-SCA-001..004) — DB-grounded known values. Ground-truthed 2026-08-05 against the
 * live stack; nothing fabricated. A Scaler Authorization authorizes a scaler (by licence) for a Reg/Dist,
 * with job functions, optional special forest products, optional scale sites (when District Wide = No), and
 * conditions. Write path: POST/PUT/DELETE `/api/scaler-authorizations`; the create form posts
 * `ScalerAuthorizationCreateRequest` (see services/scalerAuthorizations.service).
 */

/**
 * A real scaler licence that creates successfully. Licence 8437 is a real scaler (scaler_authorization 3071
 * from 1996 is its permanent authorization). Confirmed 2026-08-05:
 *   POST /api/scaler-authorizations {scalerLicenceNo:'8437', orgUnitNo:1831, districtWideInd:'Y',
 *     jobFunctions:['P'], …} -> HTTP 201; DELETE /api/scaler-authorizations/{id} -> 204.
 */
export const scalerLicenceNo = '8437';

/**
 * A Reg/Dist the DistrictSelect offers (org unit 1831 = "DRM - Rocky Mountain Natural Resource District",
 * the same district the MSD suite uses). The create backend does NOT enforce a scaler↔district relationship
 * (org-unit scoping is deferred), so 8437 + 1831 creates fine.
 */
export const regDistOrgUnitNo = '1831';

/**
 * Job Function label the SCALE_METHOD_TYPE_CODE LOV offers (Cruise 'C' is filtered out of the screen).
 * Code P — the safe non-SFP default. The SFP-required rule is driven by the "Special Forest Product" label
 * (code S), which the validation feature passes as a Gherkin argument rather than importing.
 */
export const jobFunctionPiece = 'Piece Scale';

/**
 * A searchable + real scale site for the District Wide = No create path (the ScaleSitesSection add-by-number
 * resolves it). Site 520 (TEMBEC - CANAL FLATS). Confirmed 2026-08-05:
 *   GET /api/scale-sites/search?scaleSiteIdNmbr=520 -> the site.
 */
export const scaleSiteId = '520';

/**
 * A provably-absent scale-site id so the add-by-number guard fires: the create form's `onAddScaleSite`
 * searches `/api/scale-sites/search?scaleSiteIdNmbr=…` and on no match renders
 * `Scale site {id} was not found.` (pages/Create/ScalerAuthorization/index.tsx). Max field length is 8.
 * Note the SCA wording ("Scale site N…") differs from the MSD screen's ("Site N…").
 */
export const absentScaleSiteId = '99999999';

/**
 * A provably-absent scaler authorization id so the view route's load-error path renders (UC-SCA-003):
 * GET /api/scaler-authorizations/99999999 → non-200, view shows the inline error notification and no
 * licence field. Semantically distinct from `absentScaleSiteId` — different entity, same digit count.
 */
export const absentScalerAuthId = '99999999';

/**
 * A real, permanent scaler authorization id used READ-ONLY as the letter-options sample (UC-RPT-007): the
 * route /scaler-authorizations/3071/letter renders the options form for its letterId. The letter
 * VALIDATIONS (email/preview) run in ReportPage.handleSend BEFORE any generate POST, so opening 3071's
 * letter options and submitting an invalid form mutates nothing. Auth 3071 (licence 8437) is a real record
 * (confirmed 2026-08-05: GET /api/scaler-authorizations/3071 → 200, status Expired).
 */
export const scalerAuthSampleId = '3071';

/**
 * UC-SCA tab anchors (Tier 3) — real, READ-ONLY records used to exercise the two entity tabs. A freshly
 * seeded authorization appears in the by-licence list (/scalers/{lic}/authorizations) but NOT in a site's
 * /authorized-scalers view (that view reads a different linkage), so the site tab can only be driven against
 * pre-existing data — hence these are discovered anchors, pinned with the query, re-verify on extract refresh.
 */

/**
 * A scaler licence with exactly ONE authorization, and that authorization is long expired — so the
 * Authorizations tab (Scaler view /scalers/view/{lic}?tab=authorizations) renders one row and the 'Active'
 * status filter deterministically empties the list (a 2009-expired auth can never be Active). Confirmed
 * 2026-08-05: GET /api/scalers/001A/authorizations → [{scalerAuthorizationId:147850, status:"Expired", …}]
 * (1 row). `001A` is the same scaler the SCL suite pins (`anchorScalerLicenceNo`).
 */
export const tabScalerLicenceNo = '001A';
export const tabScalerOnlyAuthId = '147850';

/**
 * A scale site with authorized scalers, ALL currently Expired — so the Authorized Scalers tab (Scale Site
 * view /scale-sites/view/{site}?tab=authorized-scalers) renders rows and the 'Active' status filter
 * deterministically empties the list. Confirmed 2026-08-05: GET /api/scale-sites/520/authorized-scalers →
 * 8 rows, every `status:"Expired"`; first row scalerAuthorizationId 149129 / scalerLicenceNo 9579. The tab
 * scenarios assert the first row's links STRUCTURALLY (href patterns, not the pinned id) so they survive an
 * extract that reorders rows; the id/licence here document the anchor. Site 520 = the SCA/INS/QRY site.
 */
export const tabAuthorizedScalersSiteId = '520';

/**
 * Valid, creatable Scaler Authorization basics for the given District Wide indicator (today-relative dates:
 * effective yesterday, expiry ~a year out — order valid). Licence 8437 + Reg/Dist 1831.
 */
export const happyBasics = (districtWide: 'Y' | 'N') => ({
  scalerLicenceNo,
  effectiveDate: daysAgo(1),
  expiryDate: daysAhead(365),
  regDist: regDistOrgUnitNo,
  districtWide,
});

/** Effective/expiry pair violating the date-order rule (expiry on/before effective) for the date-order guard. */
export const expiryBeforeEffective = () => ({ effectiveDate: daysAgo(1), expiryDate: daysAgo(30) });

/** The create request body used to API-SEED a record that UC-SCA-002/003/004 then view/edit/delete. */
export const buildScalerAuthCreateBody = (
  districtWide: 'Y' | 'N',
  scaleSites: string[] = [],
) => ({
  scalerLicenceNo,
  orgUnitNo: Number(regDistOrgUnitNo),
  districtWideInd: districtWide,
  authorizationEffectiveDate: daysAgo(1),
  authorizationExpiryDate: daysAhead(365),
  jobFunctions: ['P'],
  authForestProducts: [] as string[],
  scaleSites,
  conditions: [] as { scaleAuthConditionId: number; scaleConditionClassCode: string }[],
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Scale Site Authorization (UC-SCA-005..008) — DB-grounded, discovered 2026-08-19 against the live stack.
// A Scale Site Authorization authorizes a SCALE SITE (by number) for an effective/expiry window with an
// expected annual scale volume and optional conditions. Write path: POST/PUT/DELETE
// `/api/scale-site-authorizations` (services/scaleSiteAuthorizations.service); create form posts
// `ScaleSiteAuthorizationCreateRequest`. Two-step create form (Add Conditions → Save Record), mirroring the
// scaler-auth form. There is NO licence/district/job-function/SFP here — just scale site # + dates + volume.
// Verified end-to-end 2026-08-19: POST {scaleSiteIdNmbr:'520', effective daysAgo(1), expiry '2027-08-17',
// expectedScaleVolume:1000, conditions:[]} -> HTTP 201 (id 239372); GET /{id} -> 200; DELETE /{id} -> 204.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A real, existing scale site usable as the authorization subject. Site 520 (TEMBEC - CANAL FLATS) — the
 * same site the scaler-auth/INS/QRY suites pin; the backend has NO duplicate/overlap check, so repeated
 * authorizations on 520 create fine. (Reuses `scaleSiteId` above.)
 */
export const scaleSiteAuthSiteId = scaleSiteId; // '520'

/**
 * A provably-absent scale site number (≤4 chars, the create field's maxlength) so the server existence check
 * fires. Confirmed 2026-08-19: no scale_site row for '9999'; POST with scaleSiteIdNmbr '9999' -> HTTP 400
 * "Scale Site # does not exist." (Distinct from `absentScaleSiteId` above, which is 8 chars — too long for
 * this 4-char field.)
 */
export const absentScaleSiteAuthSiteNumber = '9999';

/**
 * A provably-absent scale-site-authorization id so the view route's load-error path renders (UC-SCA-007):
 * GET /api/scale-site-authorizations/99999999 → 404, view shows the inline error notification and no
 * record fields.
 */
export const absentScaleSiteAuthId = '99999999';

/**
 * A real SIA condition id addable in the conditions section (S06 happy add). Confirmed 2026-08-19:
 * GET /api/scale-site-authorizations/conditions?scaleConditionClassCode=SIA -> id 462 ("KEEPING SCALING
 * CURRENT"). A provably-absent id drives the not-found guard.
 */
export const validSiaConditionId = '462';
export const absentSiaConditionId = '9999999';

/**
 * Valid, creatable Scale Site Authorization basics (today-relative dates; order valid; volume a plain number).
 *
 * SALM (max authorization length): the server rule `validateMaxAuthorizationLength` (system setting SALM,
 * in YEARS) 400s a window longer than the cap with "Scale Site Authorization cannot exceed N years." The
 * window here is deliberately pinned to ~180 days — comfortably inside the cap — so a future SALM reduction
 * can't silently 400 every happy path with a cause nobody would guess. Live-probed 2026-08-21
 * (`GET /api/system-settings/SALM` → systemSettingValue "5", "Scale Site Maximum years"): the cap is
 * **5 years**, so the ~180-day window sits well within it. The cap itself is covered by
 * UC-SCA-005 validation (see `scaleSiteAuthWindowExceedingMaxLength`).
 */
export const happyScaleSiteAuthBasics = () => ({
  scaleSiteNumber: scaleSiteAuthSiteId,
  effectiveDate: daysAgo(1),
  expiryDate: daysAhead(180),
  expectedVolume: '1000',
});

/**
 * Basics with a deliberately absurd ~100-year window so the server's max-length rule (SALM) fires
 * regardless of the live cap value — lets the UC-SCA-005 cap scenario assert the rejection deterministically
 * (message substring "cannot exceed", never the exact N). The client does NOT enforce SALM, so the POST
 * fires and the server 400s.
 */
export const scaleSiteAuthWindowExceedingMaxLength = () => ({
  ...happyScaleSiteAuthBasics(),
  expiryDate: daysAhead(365 * 100),
});

/** Effective/expiry pair violating the client date-order rule (expiry strictly before effective). */
export const scaleSiteAuthExpiryBeforeEffective = () => ({ effectiveDate: daysAgo(1), expiryDate: daysAgo(30) });

/**
 * Effective/expiry pair where expiry EQUALS effective — the single case where the two rules disagree: the
 * client rejects it (strictly-after rule, `exp <= eff` → error) while the SERVER would accept it (on-or-before,
 * a 0-day authorization). This is defects.md Divergence #1; the client rejection is what the E2E asserts.
 */
export const scaleSiteAuthExpiryEqualsEffective = () => ({ effectiveDate: daysAgo(1), expiryDate: daysAgo(1) });

type ScaleSiteAuthConditionBody = { scaleAuthConditionId: number; scaleConditionClassCode: string };

/**
 * The valid SIA condition (id 462, class SIA) as a create-body entry. Seeding a record WITH this child lets
 * the delete UC (UC-SCA-008) genuinely exercise the server-side cascade (delete children then parent) rather
 * than only ever deleting a conditionless record.
 */
export const siaConditionBody: ScaleSiteAuthConditionBody = {
  scaleAuthConditionId: Number(validSiaConditionId),
  scaleConditionClassCode: 'SIA',
};

/**
 * The create request body used to API-SEED a record that UC-SCA-006/007/008 then edit/view/delete. Pass
 * `conditions` to seed a record carrying child conditions (e.g. `[siaConditionBody]` for the delete-cascade).
 */
export const buildScaleSiteAuthCreateBody = (conditions: ScaleSiteAuthConditionBody[] = []) => ({
  scaleSiteIdNmbr: scaleSiteAuthSiteId,
  authorizationEffectiveDate: daysAgo(1),
  authorizationExpiryDate: daysAhead(180), // inside the SALM cap — see happyScaleSiteAuthBasics
  expectedScaleVolume: 1000,
  conditions,
});

/**
 * NOTE — expected validation text is NOT mirrored here. The `.feature` files carry each message verbatim as
 * the argument to the shared `I should see the error {string}` step, so the Gherkin is the single source of
 * truth for assertion text (a fixture copy would silently drift from the app's wording). This file pins
 * DATA only. The app's messages live in pages/Create/ScalerAuthorization/index.tsx; the re-grounded wording
 * differences from legacy UC-SCA-001 are recorded in coverage.md / defects.md.
 */
