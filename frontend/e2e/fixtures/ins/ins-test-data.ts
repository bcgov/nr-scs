import { SEEDED } from '../common/seededValues';

/**
 * Known-good test data for the Site Inspection (INS) flows, re-grounded onto the REAL data loaded into
 * the local Docker Oracle DB (localhost:1525 / DBDOCK_01 / THE), DISCOVERED + verified 2026-07-15 both
 * by querying the DB and by exercising the real create-init / create / detail / delete endpoints by
 * hand. Nothing is fabricated. Re-verify on DB re-extract (real data is non-deterministic).
 *
 * Why these exact values (re-grounding the legacy UC-INS-001 Gherkin onto the new React app):
 *
 *  - SCALE SITE 520 (TEMBEC - CANAL FLATS). The new create's post-write read-back
 *    (scs_site_inspection_pkg.get_inspection_report) INNER JOINs forest_client on the site's
 *    owner_cli_number. Because the extract is FK-one-hop, MOST sites' owner client wasn't pulled, so the
 *    read-back returns 0 rows -> 404 -> and since create is @Transactional the whole create ROLLS BACK.
 *    Only 4 loaded sites have their owner in forest_client: 520, 525, 561 (owner 00001402) and 540
 *    (owner 00001642). 520 is the happy-path site; 525 is a distinct second site for read-only/nav use.
 *    (Discovered: SELECT ss.scale_site_id_nmbr FROM scale_site ss JOIN forest_client fc
 *     ON ss.owner_cli_number = fc.client_number.) This is a DATA gap, not an app bug.
 *
 *  - INSPECTOR GUID (SEEDED.inspectorGuid — set E2E_INSPECTOR_GUID locally). create resolves the
 *    inspector against scs_user_info_vw by user_guid (scs_site_inspection_pkg); a GUID absent from that
 *    view 500s ("Invalid Inspector GUID..."). In LOCAL mock mode the security context carries NO GUID,
 *    so create-init pre-fills inspector = "MOCK_CLERICAL" (a userid, not a GUID) and submitting it 400s
 *    ("A valid inspector user GUID is required..."). So the browser happy path must TYPE a real GUID
 *    into Inspector #. This one is real + present in the view; the backend isUuidLike accepts the
 *    un-dashed 32-hex form. (Discovered: SELECT user_guid FROM scs_user_info_vw WHERE user_guid IS NOT NULL.)
 *
 *  - INSPECTION TYPE "MIN" (Minor) + SITE TYPE "W" (Weight Scale): a valid combo whose create-init
 *    returns a small, real active question set (ids 401, 641, 344, 361 as of 2026-07-15). The happy path
 *    answers EVERY rendered question dynamically (it does not hard-code the ids/count), so it survives a
 *    question-library change. AUT (Automated) + W is the S10 combo (selecting AUT forces site type to W).
 *
 * DATES ARE TODAY-RELATIVE (daysAgo / daysAhead from ../common/dates), never hardcoded literals — the
 * backend + client reject a future inspection date, and a literal would silently age into failure.
 */

/** Inspector user GUID present in scs_user_info_vw. Un-dashed 32-hex; see fixtures/common/seededValues.ts. */
export const INSPECTOR_GUID = SEEDED.inspectorGuid;

/** Inspection type codes (SCALE_SITE_INSPCTN_TYPE_CODE): AUT/MAJ/MIN/REG, all non-expiring. */
export const INSPECTION_TYPES = {
  minor: { code: 'MIN', description: 'Minor' },
  major: { code: 'MAJ', description: 'Major' },
  regular: { code: 'REG', description: 'Regular' },
  automated: { code: 'AUT', description: 'Automated' },
} as const;

/** Scaling-method / site-type codes (SCALE_METHOD_TYPE_CODE). W is what AUT is forced to. */
export const SITE_TYPES = {
  weight: { code: 'W', description: 'Weight Scale' },
  piece: { code: 'P', description: 'Piece Scale' },
  special: { code: 'S', description: 'Special Forest Product' },
} as const;

/** Happy-path create subject: a real site whose owner IS in forest_client (so read-back succeeds). */
export const inspectionHappyPathSite = {
  scaleSiteIdNmbr: '520',
  siteName: 'TEMBEC - CANAL FLATS',
  siteLocation: 'Canal Flats yard',
  siteOwnerName: 'TEMBEC INDUSTRIES INC.',
} as const;

/** A distinct second forest_client-backed site for read-only / navigation scenarios (owner present). */
export const inspectionSecondarySite = {
  scaleSiteIdNmbr: '525',
  siteName: 'TEMBEC - ELKO',
} as const;

/** UC-INS-001-S01 happy-path create inputs entered on the two-stage create form. */
export const inspectionHappyPath = {
  site: inspectionHappyPathSite,
  inspectionType: INSPECTION_TYPES.minor, // MIN — small real question set on site 520
  siteType: SITE_TYPES.weight, // W (Weight Scale)
  inspectorGuid: INSPECTOR_GUID,
  siteOperatorPresent: 'Yes' as const, // Site Operator present during Inspection (Y)
  comments: 'e2e site inspection create',
  /** Every rendered question is answered with this code (Y is a valid response for the MIN/W set). */
  answerCode: 'Y',
} as const;

/**
 * API create-request body (POST /api/scale-sites/{siteId}/inspections) used to SEED an inspection for
 * the read-only / view / delete flows without driving the two-stage UI. `questionResponses` is filled
 * from the create-init question set at seed time (the seed helper fetches create-init first), so the
 * exact question ids are NOT hardcoded here — only the stable header inputs are.
 */
export const inspectionSeedHeader = {
  inspectionTypeCode: INSPECTION_TYPES.minor.code,
  siteTypeCodes: [SITE_TYPES.weight.code],
  siteOperatorPresentInd: 'Y' as const,
  inspector: INSPECTOR_GUID,
  comments: 'e2e seeded inspection (view/delete)',
} as const;

/** An inspection id guaranteed absent — drives the not-found read path. A provably-missing id is not
 *  fabricated data; it is exactly what a not-found scenario needs (SITE inspections use a surrogate id). */
export const inspectionMissingId = '99999999';

/**
 * A route id that is not a POSITIVE INTEGER. Both the view and edit pages gate on
 * `Number.isInteger(n) && n > 0` (Edit/ScaleSiteInspection/index.tsx:346-348) BEFORE issuing any read,
 * so this never reaches the API — it renders the "Inspection not available" empty section instead.
 * Distinct from `inspectionMissingId`, which IS a well-formed id that simply does not exist (→ 404 →
 * "Could not load inspection"). The two drive different code paths and must not be conflated.
 */
export const inspectionInvalidRouteId = 'abc';

/**
 * The values the APP-ONLY edit suite writes over a freshly-seeded inspection. Every one differs from
 * what `inspectionSeedHeader` seeded, so the read-back proves the PUT actually moved the field rather
 * than coincidentally matching what was already there:
 *   - siteOperatorPresent: seeded 'Y' → edited 'No'  (a real flip)
 *   - answerCode:          seeded 'Y' → edited 'N'   ('N' is valid for the MIN/W set; it is also what
 *                                                     makes a follow-up meaningful)
 *   - comments:            seeded "e2e seeded inspection (view/delete)" → edited text below
 * Dates stay today-relative (see the module header): the inspection date must not be in the future,
 * while a follow-up DUE date legitimately may be — verified by hand against PUT on 2026-09-09.
 */
export const inspectionEditValues = {
  siteOperatorPresent: 'No' as const,
  answerCode: 'N',
  comments: 'e2e edited inspection',
  /** Follow-up detail applied to the FIRST question row to exercise the Y-arm cross-field rule. */
  followUp: {
    index: 0,
    actionText: 'e2e follow-up action',
    completed: 'No' as const,
  },
} as const;

/**
 * Inspector GUID used when the edit suite needs a *format-invalid* value. The client rejects it inline
 * ("Inspector must be a valid user GUID.") via `isInspectorGuid`, so the PUT never leaves the browser —
 * which is what the prove-the-negative assertion needs. Not a real user, and never submitted.
 */
export const inspectorInvalidGuid = 'NOT-A-GUID';
