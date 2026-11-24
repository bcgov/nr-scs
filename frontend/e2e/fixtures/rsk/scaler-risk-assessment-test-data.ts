import { SEEDED } from '../common/seededValues';

/**
 * UC-QRY-007 (Search Scaler Risk Assessments) — DB-grounded known values, discovered 2026-08-04 against
 * the real extract (container real-data-seeded-scs-db, :1525) via the app's own read path
 * `GET /api/scaler-risk-assessments/search` (SP-backed). The parameter search is READ-ONLY, so these are
 * pinned by real id/value and shared freely across parallel tests — no mutation, no cleanup. Real data is
 * non-deterministic across re-extracts: RE-VERIFY each query on a DB re-extract.
 *
 * Ground-truth 2026-08-04 (blank search = browse-all returned 23 rows; level dist M:1 / L:8 / H:14):
 *   ?riskQuestionnaireId=723   -> 1 row  (the single-result / cell-data anchor below)
 *   ?scalerLicenceNo=9710      -> 5 rows (723, 1144, 1224, 1226, 1341)
 *   ?riskTypeCode=M            -> 1 row  (723)
 *   ?scalerLicenceNo=9710&riskTypeCode=M -> 1 row (723)  (the multi-criteria intersection anchor)
 *   ?riskQuestionnaireId=72%   -> 1 row  (723)   ?riskQuestionnaireId=72 -> []  (wildcard vs exact)
 *   ?riskTypeCode=H            -> 14 rows (the client-side paging anchor: 2 pages of 10 + 4)
 *   ?scalerLicenceNo=9710&primarySort=8&secondarySort=1 -> [1144,1224,1341,1226,723]  (sort anchor)
 *   ?orgUnitNo=1902            -> 9 rows (incl. 723)  (Reg/Dist widget anchor: RKB - Selkirk NRD)
 *   ?clientNumber=00047212     -> 5 rows (incl. 723)  (Scaler Client/Loc widget anchor; = the licence-9710 scaler)
 *   ?riskQuestionnaireId=99999999 -> []  (the zero-results anchor)
 * NOTE — every one of the 23 extracted assessments is INCOMPLETE (`?completeInd=Y` -> [], `=N` -> 23), so
 * a positive "Complete = Yes" filter has no data in this extract (logged as a coverage gap in defects.md).
 *
 * DRIFT GUARD: every export below is asserted in preflight/anchors.setup.ts (which runs once before the
 * suite) against the live search endpoint — so a reseed that shifts these counts or the assessment-723 cell
 * data fails there with a clear re-ground pointer, not as an opaque mid-suite mismatch. The feature files
 * (search.feature / zero-results.feature) currently repeat these values as Gherkin literals, so on a
 * re-pin keep those literals in sync with the values here (and re-verify against the queries above).
 */

/**
 * A specific Assessment ID matching EXACTLY ONE scaler risk assessment -> the single-result case, and the
 * deterministic row used for the columns + cell-data assertion. Cell values are the app's rendered display
 * (Rating/Max, Responses/Questions, Range are composed client-side in pages/Queries/ScalerRiskAssessments).
 * Query: GET /api/scaler-risk-assessments/search?riskQuestionnaireId=723 -> 1 row.
 */
export const singleResultAssessment = {
  value: '723',
  expectedCount: 1,
  riskQuestionnaireId: '723',
  ratingMaxRating: '24 / 63',
  responsesQuestions: '1 / 7',
  level: 'Medium',
  range: '21-49',
  version: '1',
  scalerLicenceNo: '9710',
  scalerClientLoc: '00047212 / 00',
  orgUnitName: 'Selkirk Natural Resource District',
  clientName: SEEDED.riskSearchScalerClientName,
} as const;

/**
 * A Licence # matching MORE THAN ONE assessment -> the multi-result happy path. Assessment 723 is
 * guaranteed in the set and asserted as a link to its view.
 * Query: GET /api/scaler-risk-assessments/search?scalerLicenceNo=9710 -> 5 rows.
 */
export const multiResultLicence = {
  value: '9710',
  expectedCount: 5,
  anAssessmentId: '723',
} as const;

/**
 * A Level (risk type) value matching exactly one assessment in this extract -> the dropdown-filter path.
 * The Select's option VALUE is the code (`M`); its visible label is the description (`Medium`) — the step
 * selects by label. Query: GET /api/scaler-risk-assessments/search?riskTypeCode=M -> 1 row (723).
 */
export const levelFilter = {
  code: 'M',
  label: 'Medium',
  expectedCount: 1,
  anAssessmentId: '723',
} as const;

/**
 * MULTI-CRITERIA intersection -> proves the two filters combine (AND) rather than one clobbering the
 * other in the single params object `doSearch` builds (index.tsx:287-297). Licence 9710 alone -> 5 rows;
 * Level Medium (`M`) alone -> 1 row (723); together they narrow to exactly 723. A field-clobbering bug
 * (e.g. Level overwriting Licence) would return the wrong count here while still passing every
 * single-criterion arm. Query: GET ...?scalerLicenceNo=9710&riskTypeCode=M -> 1 row (723).
 */
export const multiCriteriaLicenceAndLevel = {
  licenceValue: '9710',
  levelLabel: 'Medium',
  levelCode: 'M',
  expectedCount: 1,
  anAssessmentId: '723',
} as const;

/**
 * WILDCARD / partial matching (endpoint spec: Assessment ID "Supports wildcard matching (e.g. 20%)";
 * scaler-risk-assessments-search.yaml:17). Ground-truth 2026-08-04: `scs_risk_scaler_vw_pkg.search_recs`
 * matches EXACTLY unless the caller supplies a `%` wildcard — a bare "72" returns [] (72 != 723), but
 * "72%" resolves the prefix to assessment 723. The two values below are asserted TOGETHER so the suite
 * proves the wildcard path works AND distinguishes it from an exact match (which "9710 -> 5 rows" alone
 * could not). NOTE the OpenAPI wording "partial matching" is imprecise: matching is exact-unless-`%`, not
 * automatic substring — see defects.md.
 * Query: GET ...?riskQuestionnaireId=72%25 -> 1 row (723);  ?riskQuestionnaireId=72 -> [].
 */
export const wildcardAssessmentId = {
  wildcardValue: '72%',
  exactNoMatchValue: '72',
  expectedCount: 1,
  anAssessmentId: '723',
} as const;

/**
 * A Level (risk type) value with MORE THAN ONE page of results -> the client-side pagination anchor. The
 * page fetches all matching rows and slices them at 10/page (index.tsx:246-259), so `High` (14 rows) is a
 * stable 2-page set: page 1 renders 10 rows, page 2 renders the remaining 4, while the "Result List: N
 * records" total reads the full 14 throughout. `High` is used (not blank browse-all, which grows with the
 * extract) because its count only shifts if High-level assessments change.
 * Query: GET ...?riskTypeCode=H -> 14 rows.
 */
export const pagedLevel = {
  code: 'H',
  label: 'High',
  expectedCount: 14,
  pageSize: 10,
  firstPageRows: 10,
  lastPageRows: 4,
} as const;

/**
 * SORT ORDER (legacy server-side behaviour, not a UI nicety). Legacy S01 selects a Primary Sort and the
 * search runs `searchScalerAssessments(searchDto, primarySort, secondarySort)`; the new app passes both to
 * the API using the legacy sort codes (1/8/4/3/16/14/17 — scaler-risk-assessments-search.yaml:78-111).
 * Ground-truth 2026-08-04 on the 5-row licence-9710 set: sorting Primary=Level(8), Secondary=Assessment
 * ID(1) reorders to [1144,1224,1341,1226,723] — grouped by level (High rows by id asc, then Low, then
 * Medium). This differs from the default Assessment-ID(1) order [723,1144,1224,1226,1341] (723 sorts FIRST
 * by id but LAST by level), so it proves the app applies BOTH sort params, not just the default.
 * The UI Select labels map to codes: 'Level'->8, 'Assessment ID'->1 (see index.tsx SORT_OPTIONS).
 * Query: GET ...?scalerLicenceNo=9710&primarySort=8&secondarySort=1 -> [1144,1224,1341,1226,723].
 */
export const sortByLevelThenId = {
  licenceValue: '9710',
  primaryLabel: 'Level',
  primaryCode: 8,
  secondaryLabel: 'Assessment ID',
  secondaryCode: 1,
  expectedOrder: ['1144', '1224', '1341', '1226', '723'],
} as const;

/**
 * MSG-001 — the legacy screen renders "Choose your search parameters." (message key `search.choose.params`)
 * on page load; the legacy S01 gherkin asserts it. The new app renders the SAME text as the filter
 * accordion heading (index.tsx:354). A page-load anchor, not a search result.
 */
export const searchParamsHeading = 'Choose your search parameters.';

/**
 * Reg / Dist filter driven through the `DistrictSelect` WIDGET (`#orgUnitNo`), rather than a plain text /
 * Select filter. The widget's option VALUE is the region/district code and its visible label is the LOV
 * description; `doSearch` coerces the chosen value with `Number(...)` and sends it as `orgUnitNo`
 * (index.tsx:293). Selecting "RKB - Selkirk Natural Resource District" (code 1902) resolves the 9 Selkirk
 * assessments, which include the anchor 723 (whose orgUnitName is "Selkirk Natural Resource District" — the
 * LOV label carries the region prefix the results cell drops). This proves the widget commits its selection
 * to the search param — the piece the "covered (symmetry)" argument previously hand-waved.
 * Query: GET /api/scaler-risk-assessments/search?orgUnitNo=1902 -> 9 rows (incl. 723).
 */
export const districtFilter = {
  label: 'RKB - Selkirk Natural Resource District',
  orgUnitNo: '1902',
  expectedCount: 9,
  anAssessmentId: '723',
} as const;

/**
 * Scaler (Client / Loc) filter driven through the `ClientLocSearch` WIDGET's Client # box (`#clientNumber`),
 * proving the widget commits `clientNumber` to the search param. `doSearch` sends only `clientNumber`
 * (index.tsx:294) — the "/ Loc" box is a dead input (defects.md Bug #1), so this anchor deliberately drives
 * the Client # half alone. Client 00047212 is the same scaler as licence 9710, so it resolves the same
 * 5-row set (incl. the anchor 723). The Client # must be ZERO-PADDED to 8 digits — `?clientNumber=47212`
 * returns [] (ground-truth 2026-08-20). NB the picker-MODAL writeback path (open modal -> pick a client)
 * remains deferred (defects.md Coverage gap #7); this anchor covers the type-in path.
 * Query: GET /api/scaler-risk-assessments/search?clientNumber=00047212 -> 5 rows (incl. 723).
 */
export const clientFilter = {
  clientNumber: '00047212',
  expectedCount: 5,
  anAssessmentId: '723',
} as const;

/**
 * An Assessment ID matching NO assessment -> zero results (S05).
 * Query: GET /api/scaler-risk-assessments/search?riskQuestionnaireId=99999999 -> [] (confirmed 2026-08-04).
 */
export const noMatchAssessmentId = '99999999';
